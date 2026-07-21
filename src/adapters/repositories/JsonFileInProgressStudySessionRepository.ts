import { InProgressStudySession, type InProgressStudySessionRecord } from '../../domain/entities/InProgressStudySession.js';
import type { InProgressStudySessionRepository } from '../../application/ports/InProgressStudySessionRepository.js';
import { readJsonArray, writeJsonArray } from '../../infrastructure/db/jsonStore.js';

interface InProgressStudySessionFileRow {
  id: string;
  record: InProgressStudySessionRecord;
}

export class JsonFileInProgressStudySessionRepository implements InProgressStudySessionRepository {
  constructor(private readonly filePath: string = 'data/in-progress-study-sessions.json') {}

  async save(session: InProgressStudySession): Promise<void> {
    const rows = await readJsonArray<InProgressStudySessionFileRow>(this.filePath);
    const withoutExisting = rows.filter((row) => row.id !== session.id);
    withoutExisting.push({ id: session.id, record: session.record });
    await writeJsonArray(this.filePath, withoutExisting);
  }

  async findById(id: string): Promise<InProgressStudySession | null> {
    const rows = await readJsonArray<InProgressStudySessionFileRow>(this.filePath);
    const row = rows.find((r) => r.id === id);
    return row ? InProgressStudySession.restore({ id: row.id, record: row.record }) : null;
  }

  async findAll(): Promise<InProgressStudySession[]> {
    const rows = await readJsonArray<InProgressStudySessionFileRow>(this.filePath);
    return rows.map((row) => InProgressStudySession.restore({ id: row.id, record: row.record }));
  }

  async delete(id: string): Promise<void> {
    const rows = await readJsonArray<InProgressStudySessionFileRow>(this.filePath);
    await writeJsonArray(
      this.filePath,
      rows.filter((row) => row.id !== id),
    );
  }
}
