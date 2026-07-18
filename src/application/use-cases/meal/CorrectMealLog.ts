import { randomUUID } from 'node:crypto';
import { MealLog, type MealLogRecord } from '../../../domain/entities/MealLog.js';
import type { MealLogRepository } from '../../ports/MealLogRepository.js';

type Replacement = Omit<MealLogRecord, 'idempotencyKey' | 'correctionOfId' | 'correctionReason'>;

export class CorrectMealLogUseCase {
  constructor(private readonly repository: MealLogRepository) {}

  async execute(input: {
    originalId: string;
    replacement: Replacement;
    reason: string;
  }): Promise<{ log: MealLog }> {
    const original = (await this.repository.findAll()).find((log) => log.id === input.originalId);
    if (!original) throw new Error(`MealLog not found: ${input.originalId}`);
    const log = MealLog.create({
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
