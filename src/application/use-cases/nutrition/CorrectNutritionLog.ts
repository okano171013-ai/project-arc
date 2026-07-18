import { randomUUID } from 'node:crypto';
import { NutritionLog, type NutritionLogRecord } from '../../../domain/entities/NutritionLog.js';
import type { NutritionLogRepository } from '../../ports/NutritionLogRepository.js';

type Replacement = Omit<
  NutritionLogRecord,
  'idempotencyKey' | 'correctionOfId' | 'correctionReason'
>;

export class CorrectNutritionLogUseCase {
  constructor(private readonly repository: NutritionLogRepository) {}

  async execute(input: {
    originalId: string;
    replacement: Replacement;
    reason: string;
  }): Promise<{ log: NutritionLog }> {
    const original = (await this.repository.findAll()).find((log) => log.id === input.originalId);
    if (!original) throw new Error(`NutritionLog not found: ${input.originalId}`);
    const log = NutritionLog.create({
      id: randomUUID(),
      record: {
        ...input.replacement,
        correctionOfId: original.id,
        correctionReason: input.reason,
      },
    });
    await this.repository.save(log);
    return { log };
  }
}
