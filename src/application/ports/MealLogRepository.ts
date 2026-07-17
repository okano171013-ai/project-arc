import type { MealLog } from '../../domain/entities/MealLog.js';

export interface MealLogRepository {
  save(log: MealLog): Promise<void>;
  findAll(): Promise<MealLog[]>;
}
