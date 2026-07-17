import type { FinanceLog } from '../../domain/entities/FinanceLog.js';

export interface FinanceLogRepository {
  save(log: FinanceLog): Promise<void>;
  findAll(): Promise<FinanceLog[]>;
}
