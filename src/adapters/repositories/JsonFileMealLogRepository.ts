import { MealLog, type MealLogRecord } from '../../domain/entities/MealLog.js';
import type { MealLogRepository } from '../../application/ports/MealLogRepository.js';
import { readJsonArray, writeJsonArray } from '../../infrastructure/db/jsonStore.js';

interface MealLogFileRow {
  id: string;
  record: MealLogRecord;
  createdAt: string;
}

export class JsonFileMealLogRepository implements MealLogRepository {
  constructor(private readonly filePath: string = 'data/meal-log.json') {}

  async save(log: MealLog): Promise<void> {
    const rows = await readJsonArray<MealLogFileRow>(this.filePath);
    const withoutExisting = rows.filter((row) => row.id !== log.id);
    withoutExisting.push({
      id: log.id,
      record: log.record,
      createdAt: log.createdAt.toISOString(),
    });
    await writeJsonArray(this.filePath, withoutExisting);
  }

  async findAll(): Promise<MealLog[]> {
    const rows = await readJsonArray<MealLogFileRow>(this.filePath);
    return rows.map((row) =>
      MealLog.restore({
        id: row.id,
        record: row.record,
        createdAt: new Date(row.createdAt),
      }),
    );
  }
}
