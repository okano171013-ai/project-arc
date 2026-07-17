import type { NutritionLog } from '../../../domain/entities/NutritionLog.js';
import type { NutritionLogRepository } from '../../ports/NutritionLogRepository.js';

const MAX_READ_LIMIT = 100;

export interface ListNutritionLogsInput {
  limit: number;
  mealLogId?: string;
}

export interface ListNutritionLogsOutput {
  logs: NutritionLog[];
}

export class ListNutritionLogsUseCase {
  constructor(private readonly nutritionLogRepository: NutritionLogRepository) {}

  async execute(input: ListNutritionLogsInput): Promise<ListNutritionLogsOutput> {
    this.assertValidLimit(input.limit);
    const all = await this.nutritionLogRepository.findAll();
    const filtered = all.filter((l) => !input.mealLogId || l.record.mealLogId === input.mealLogId);
    const sorted = [...filtered].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return { logs: sorted.slice(0, input.limit) };
  }

  private assertValidLimit(limit: number): void {
    if (!Number.isInteger(limit) || limit <= 0) {
      throw new Error('limit must be a positive integer');
    }
    if (limit > MAX_READ_LIMIT) {
      throw new Error(`limit must not exceed ${MAX_READ_LIMIT}`);
    }
  }
}
