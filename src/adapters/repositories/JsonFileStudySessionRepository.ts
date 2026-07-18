import { StudySession, type StudySessionRecord } from '../../domain/entities/StudySession.js';
import type { StudySessionRepository } from '../../application/ports/StudySessionRepository.js';
import { readJsonArray, writeJsonArray } from '../../infrastructure/db/jsonStore.js';

interface StudySessionFileRow {
  id: string;
  record: StudySessionRecord;
  storedAt: string;
}

export class JsonFileStudySessionRepository implements StudySessionRepository {
  constructor(private readonly filePath: string = 'data/study-sessions.json') {}

  async save(session: StudySession): Promise<void> {
    const rows = await readJsonArray<StudySessionFileRow>(this.filePath);
    const withoutExisting = rows.filter((row) => row.id !== session.id);
    withoutExisting.push({
      id: session.id,
      record: session.record,
      storedAt: session.storedAt.toISOString(),
    });
    await writeJsonArray(this.filePath, withoutExisting);
  }

  async findAll(): Promise<StudySession[]> {
    const rows = await readJsonArray<StudySessionFileRow>(this.filePath);
    return rows.map((row) =>
      StudySession.restore({
        id: row.id,
        record: row.record,
        storedAt: new Date(row.storedAt),
      }),
    );
  }
}
