import type { NutritionLog } from '../../domain/entities/NutritionLog.js';

export interface NutritionLogRepository {
  save(log: NutritionLog): Promise<void>;
  findAll(): Promise<NutritionLog[]>;
}
