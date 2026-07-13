import {
  AppearanceLog,
  type AppearanceLogRecord,
} from '../../domain/entities/AppearanceLog.js';
import type { AppearanceLogRepository } from '../../application/ports/AppearanceLogRepository.js';
import { readJsonArray, writeJsonArray } from '../../infrastructure/db/jsonStore.js';

interface AppearanceLogFileRow {
  id: string;
  record: AppearanceLogRecord;
  createdAt: string;
}

export class JsonFileAppearanceLogRepository implements AppearanceLogRepository {
  constructor(private readonly filePath: string = 'data/appearance-log.json') {}

  async save(log: AppearanceLog): Promise<void> {
    const rows = await readJsonArray<AppearanceLogFileRow>(this.filePath);
    const withoutExisting = rows.filter((row) => row.id !== log.id);
    withoutExisting.push({
      id: log.id,
      record: log.record,
      createdAt: log.createdAt.toISOString(),
    });
    await writeJsonArray(this.filePath, withoutExisting);
  }

  async findAll(): Promise<AppearanceLog[]> {
    const rows = await readJsonArray<AppearanceLogFileRow>(this.filePath);
    return rows.map((row) =>
      AppearanceLog.create({
        id: row.id,
        record: row.record,
        createdAt: new Date(row.createdAt),
      }),
    );
  }
}
