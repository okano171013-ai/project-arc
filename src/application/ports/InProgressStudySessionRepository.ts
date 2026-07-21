import type { InProgressStudySession } from '../../domain/entities/InProgressStudySession.js';

export interface InProgressStudySessionRepository {
  save(session: InProgressStudySession): Promise<void>;
  findById(id: string): Promise<InProgressStudySession | null>;
  findAll(): Promise<InProgressStudySession[]>;
  delete(id: string): Promise<void>;
}
