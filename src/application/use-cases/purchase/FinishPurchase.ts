import type { PurchaseLog } from '../../../domain/entities/PurchaseLog.js';
import type { PurchaseLogRepository } from '../../ports/PurchaseLogRepository.js';

export interface FinishPurchaseInput {
  id: string;
  date: string;
}

export interface FinishPurchaseOutput {
  purchase: PurchaseLog;
}

export class FinishPurchaseUseCase {
  constructor(private readonly purchaseLogRepository: PurchaseLogRepository) {}

  async execute(input: FinishPurchaseInput): Promise<FinishPurchaseOutput> {
    const purchase = await this.purchaseLogRepository.findById(input.id);
    if (!purchase) {
      throw new Error(`purchase not found: ${input.id}`);
    }
    purchase.finish(input.date);
    await this.purchaseLogRepository.save(purchase);
    return { purchase };
  }
}
