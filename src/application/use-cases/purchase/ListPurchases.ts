import type { PurchaseLog, PurchaseStatus } from '../../../domain/entities/PurchaseLog.js';
import type { PurchaseLogRepository } from '../../ports/PurchaseLogRepository.js';

export interface ListPurchasesInput {
  status?: PurchaseStatus;
}

export interface ListPurchasesOutput {
  purchases: PurchaseLog[];
}

export class ListPurchasesUseCase {
  constructor(private readonly purchaseLogRepository: PurchaseLogRepository) {}

  async execute(input: ListPurchasesInput = {}): Promise<ListPurchasesOutput> {
    const all = await this.purchaseLogRepository.findAll();
    const filtered = input.status ? all.filter((p) => p.status === input.status) : all;
    const sorted = [...filtered].sort((a, b) =>
      b.record.purchaseDate.localeCompare(a.record.purchaseDate),
    );
    return { purchases: sorted };
  }
}
