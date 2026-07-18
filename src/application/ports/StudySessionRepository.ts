import type { StudySession } from '../../domain/entities/StudySession.js';

export interface StudySessionRepository {
  save(session: StudySession): Promise<void>;
  findAll(): Promise<StudySession[]>;
}
