import type { MealLog, MealType } from '../../../domain/entities/MealLog.js';
import type { MealLogRepository } from '../../ports/MealLogRepository.js';

const MAX_READ_LIMIT = 100;

export interface ListMealLogsInput {
  limit: number;
  /** occurredAtの前方一致（例：'2026-07-17'）。 */
  date?: string;
  mealType?: MealType;
}

export interface ListMealLogsOutput {
  logs: MealLog[];
}

export class ListMealLogsUseCase {
  constructor(private readonly mealLogRepository: MealLogRepository) {}

  async execute(input: ListMealLogsInput): Promise<ListMealLogsOutput> {
    this.assertValidLimit(input.limit);
    const all = await this.mealLogRepository.findAll();
    const filtered = all
      .filter((l) => !input.date || l.record.occurredAt.startsWith(input.date))
      .filter((l) => !input.mealType || l.record.mealType === input.mealType);
    const sorted = [...filtered].sort((a, b) => b.record.occurredAt.localeCompare(a.record.occurredAt));
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
