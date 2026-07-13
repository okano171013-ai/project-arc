import type { ChallengeLog } from '../../domain/entities/ChallengeLog.js';

export interface ChallengeLogRepository {
  save(log: ChallengeLog): Promise<void>;
  findAll(): Promise<ChallengeLog[]>;
}
