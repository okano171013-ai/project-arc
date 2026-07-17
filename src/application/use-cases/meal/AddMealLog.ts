import { randomUUID } from 'node:crypto';
import { MealLog, type MealLogRecord } from '../../../domain/entities/MealLog.js';
import type { MealLogRepository } from '../../ports/MealLogRepository.js';

export interface AddMealLogInput {
  record: MealLogRecord;
}

export interface AddMealLogOutput {
  log: MealLog;
  deduped: boolean;
}

export class AddMealLogUseCase {
  constructor(private readonly mealLogRepository: MealLogRepository) {}

  async execute(input: AddMealLogInput): Promise<AddMealLogOutput> {
    if (input.record.idempotencyKey) {
      const existing = await this.mealLogRepository.findAll();
      const duplicate = existing.find((l) => l.record.idempotencyKey === input.record.idempotencyKey);
      if (duplicate) {
        return { log: duplicate, deduped: true };
      }
    }
    const log = MealLog.create({ id: randomUUID(), record: input.record });
    await this.mealLogRepository.save(log);
    return { log, deduped: false };
  }
}
