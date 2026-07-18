import { randomUUID } from 'node:crypto';
import { WeightLog, type WeightLogRecord } from '../../../domain/entities/WeightLog.js';
import type { WeightLogRepository } from '../../ports/WeightLogRepository.js';

type Replacement = Omit<WeightLogRecord, 'idempotencyKey' | 'correctionOfId' | 'correctionReason'>;

export class CorrectWeightLogUseCase {
  constructor(private readonly repository: WeightLogRepository) {}

  async execute(input: {
    originalId: string;
    replacement: Replacement;
    reason: string;
  }): Promise<{ log: WeightLog }> {
    const original = (await this.repository.findAll()).find((log) => log.id === input.originalId);
    if (!original) throw new Error(`WeightLog not found: ${input.originalId}`);
    const log = WeightLog.create({
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
