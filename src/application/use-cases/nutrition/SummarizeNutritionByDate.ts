import type { MealLogRepository } from '../../ports/MealLogRepository.js';
import type { NutritionLogRepository } from '../../ports/NutritionLogRepository.js';

export interface SummarizeNutritionByDateInput {
  /** 対象日、occurredAtへの前方一致（例：'2026-07-17'）。 */
  date: string;
}

export interface NutritionTotals {
  calories: number;
  proteinG: number;
  fatG: number;
  carbohydrateG: number;
  fiberG: number;
  saltG: number;
}

export interface SummarizeNutritionByDateOutput {
  date: string;
  totals: NutritionTotals;
  mealLogCount: number;
  nutritionLogCount: number;
  /** 対象のNutritionLogのいずれかがestimated:trueなら、合計値も推定を含む。 */
  containsEstimatedValues: boolean;
}

/**
 * SummarizeNutritionByDateUseCase（Version25、Life Log Phase 2）
 *
 * 日次合計はNutritionLogに保存せず、原記録（MealLog経由で
 * NutritionLogを紐づける）から都度再計算する（指示書「日次合計は
 * 原記録とは別の派生集計とし、再計算可能にする」）。
 */
export class SummarizeNutritionByDateUseCase {
  constructor(
    private readonly mealLogRepository: MealLogRepository,
    private readonly nutritionLogRepository: NutritionLogRepository,
  ) {}

  async execute(input: SummarizeNutritionByDateInput): Promise<SummarizeNutritionByDateOutput> {
    const allMealLogs = await this.mealLogRepository.findAll();
    const mealLogIdsForDate = new Set(
      allMealLogs.filter((m) => m.record.occurredAt.startsWith(input.date)).map((m) => m.id),
    );

    const allNutritionLogs = await this.nutritionLogRepository.findAll();
    const nutritionLogsForDate = allNutritionLogs.filter((n) => mealLogIdsForDate.has(n.record.mealLogId));

    const totals: NutritionTotals = {
      calories: 0,
      proteinG: 0,
      fatG: 0,
      carbohydrateG: 0,
      fiberG: 0,
      saltG: 0,
    };
    let containsEstimatedValues = false;
    for (const n of nutritionLogsForDate) {
      totals.calories += n.record.calories ?? 0;
      totals.proteinG += n.record.proteinG ?? 0;
      totals.fatG += n.record.fatG ?? 0;
      totals.carbohydrateG += n.record.carbohydrateG ?? 0;
      totals.fiberG += n.record.fiberG ?? 0;
      totals.saltG += n.record.saltG ?? 0;
      if (n.record.estimated) {
        containsEstimatedValues = true;
      }
    }

    return {
      date: input.date,
      totals,
      mealLogCount: mealLogIdsForDate.size,
      nutritionLogCount: nutritionLogsForDate.length,
      containsEstimatedValues,
    };
  }
}
