import { randomUUID } from 'node:crypto';
import { WeightLog, type WeightLogRecord } from '../../../domain/entities/WeightLog.js';
import type { WeightLogRepository } from '../../ports/WeightLogRepository.js';

export interface AddWeightLogInput {
  record: WeightLogRecord;
}

export interface AddWeightLogOutput {
  log: WeightLog;
  deduped: boolean;
}

export class AddWeightLogUseCase {
  constructor(private readonly weightLogRepository: WeightLogRepository) {}

  async execute(input: AddWeightLogInput): Promise<AddWeightLogOutput> {
    if (input.record.idempotencyKey) {
      const existing = await this.weightLogRepository.findAll();
      const duplicate = existing.find((l) => l.record.idempotencyKey === input.record.idempotencyKey);
      if (duplicate) {
        return { log: duplicate, deduped: true };
      }
    }
    const log = WeightLog.create({ id: randomUUID(), record: input.record });
    await this.weightLogRepository.save(log);
    return { log, deduped: false };
  }
}
