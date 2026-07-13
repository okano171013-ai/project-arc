import type { PurchaseLog } from '../../../domain/entities/PurchaseLog.js';
import type { PurchaseLogRepository } from '../../ports/PurchaseLogRepository.js';

export interface StartUsingPurchaseInput {
  id: string;
  date: string;
}

export interface StartUsingPurchaseOutput {
  purchase: PurchaseLog;
}

export class StartUsingPurchaseUseCase {
  constructor(private readonly purchaseLogRepository: PurchaseLogRepository) {}

  async execute(input: StartUsingPurchaseInput): Promise<StartUsingPurchaseOutput> {
    const purchase = await this.purchaseLogRepository.findById(input.id);
    if (!purchase) {
      throw new Error(`purchase not found: ${input.id}`);
    }
    purchase.startUsing(input.date);
    await this.purchaseLogRepository.save(purchase);
    return { purchase };
  }
}
