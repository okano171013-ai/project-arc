import { SkinLog, type SkinLogRecord } from '../../domain/entities/SkinLog.js';
import type { SkinLogRepository } from '../../application/ports/SkinLogRepository.js';
import { readJsonArray, writeJsonArray } from '../../infrastructure/db/jsonStore.js';

interface SkinLogFileRow {
  id: string;
  record: SkinLogRecord;
  createdAt: string;
}

export class JsonFileSkinLogRepository implements SkinLogRepository {
  constructor(private readonly filePath: string = 'data/skin-log.json') {}

  async save(log: SkinLog): Promise<void> {
    const rows = await readJsonArray<SkinLogFileRow>(this.filePath);
    const withoutExisting = rows.filter((row) => row.id !== log.id);
    withoutExisting.push({
      id: log.id,
      record: log.record,
      createdAt: log.createdAt.toISOString(),
    });
    await writeJsonArray(this.filePath, withoutExisting);
  }

  async findAll(): Promise<SkinLog[]> {
    const rows = await readJsonArray<SkinLogFileRow>(this.filePath);
    return rows.map((row) =>
      SkinLog.create({
        id: row.id,
        record: row.record,
        createdAt: new Date(row.createdAt),
      }),
    );
  }
}
