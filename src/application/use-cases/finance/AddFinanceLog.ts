import { randomUUID } from 'node:crypto';
import { FinanceLog, type FinanceLogRecord } from '../../../domain/entities/FinanceLog.js';
import type { FinanceLogRepository } from '../../ports/FinanceLogRepository.js';

export interface AddFinanceLogInput {
  record: FinanceLogRecord;
}

export interface AddFinanceLogOutput {
  log: FinanceLog;
  deduped: boolean;
}

export class AddFinanceLogUseCase {
  constructor(private readonly financeLogRepository: FinanceLogRepository) {}

  async execute(input: AddFinanceLogInput): Promise<AddFinanceLogOutput> {
    if (input.record.idempotencyKey) {
      const existing = await this.financeLogRepository.findAll();
      const duplicate = existing.find((l) => l.record.idempotencyKey === input.record.idempotencyKey);
      if (duplicate) {
        return { log: duplicate, deduped: true };
      }
    }
    const log = FinanceLog.create({ id: randomUUID(), record: input.record });
    await this.financeLogRepository.save(log);
    return { log, deduped: false };
  }
}
