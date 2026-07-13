import { randomUUID } from 'node:crypto';
import { PurchaseLog, type PurchaseLogRecord } from '../../../domain/entities/PurchaseLog.js';
import type { PurchaseLogRepository } from '../../ports/PurchaseLogRepository.js';

export interface RecordPurchaseInput {
  record: PurchaseLogRecord;
}

export interface RecordPurchaseOutput {
  purchase: PurchaseLog;
}

export class RecordPurchaseUseCase {
  constructor(private readonly purchaseLogRepository: PurchaseLogRepository) {}

  async execute(input: RecordPurchaseInput): Promise<RecordPurchaseOutput> {
    const purchase = PurchaseLog.create({ id: randomUUID(), record: input.record });
    await this.purchaseLogRepository.save(purchase);
    return { purchase };
  }
}
