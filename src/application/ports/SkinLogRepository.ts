import type { SkinLog } from '../../domain/entities/SkinLog.js';

export interface SkinLogRepository {
  save(log: SkinLog): Promise<void>;
  findAll(): Promise<SkinLog[]>;
}
