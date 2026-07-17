import type { WeightLog } from '../../domain/entities/WeightLog.js';

export interface WeightLogRepository {
  save(log: WeightLog): Promise<void>;
  findAll(): Promise<WeightLog[]>;
}
