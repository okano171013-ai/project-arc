import type { AppearanceLog } from '../../domain/entities/AppearanceLog.js';

export interface AppearanceLogRepository {
  save(log: AppearanceLog): Promise<void>;
  findAll(): Promise<AppearanceLog[]>;
}
