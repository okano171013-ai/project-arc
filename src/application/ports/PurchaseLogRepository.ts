import type { PurchaseLog } from '../../domain/entities/PurchaseLog.js';

export interface PurchaseLogRepository {
  save(log: PurchaseLog): Promise<void>;
  findAll(): Promise<PurchaseLog[]>;
  findById(id: string): Promise<PurchaseLog | null>;
}
