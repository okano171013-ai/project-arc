import { randomUUID } from 'node:crypto';
import { FinanceLog, type FinanceLogRecord } from '../../../domain/entities/FinanceLog.js';
import type { FinanceLogRepository } from '../../ports/FinanceLogRepository.js';

type Replacement = Omit<FinanceLogRecord, 'idempotencyKey' | 'correctionOfId' | 'correctionReason'>;

export class CorrectFinanceLogUseCase {
  constructor(private readonly repository: FinanceLogRepository) {}

  async execute(input: {
    originalId: string;
    replacement: Replacement;
    reason: string;
  }): Promise<{ log: FinanceLog }> {
    const original = (await this.repository.findAll()).find((log) => log.id === input.originalId);
    if (!original) throw new Error(`FinanceLog not found: ${input.originalId}`);
    const log = FinanceLog.create({
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
