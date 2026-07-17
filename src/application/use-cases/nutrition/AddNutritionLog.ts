import { randomUUID } from 'node:crypto';
import { NutritionLog, type NutritionLogRecord } from '../../../domain/entities/NutritionLog.js';
import type { NutritionLogRepository } from '../../ports/NutritionLogRepository.js';

export interface AddNutritionLogInput {
  record: NutritionLogRecord;
}

export interface AddNutritionLogOutput {
  log: NutritionLog;
  deduped: boolean;
}

export class AddNutritionLogUseCase {
  constructor(private readonly nutritionLogRepository: NutritionLogRepository) {}

  async execute(input: AddNutritionLogInput): Promise<AddNutritionLogOutput> {
    if (input.record.idempotencyKey) {
      const existing = await this.nutritionLogRepository.findAll();
      const duplicate = existing.find((l) => l.record.idempotencyKey === input.record.idempotencyKey);
      if (duplicate) {
        return { log: duplicate, deduped: true };
      }
    }
    const log = NutritionLog.create({ id: randomUUID(), record: input.record });
    await this.nutritionLogRepository.save(log);
    return { log, deduped: false };
  }
}
