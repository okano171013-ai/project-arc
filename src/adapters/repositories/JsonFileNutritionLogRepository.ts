import { NutritionLog, type NutritionLogRecord } from '../../domain/entities/NutritionLog.js';
import type { NutritionLogRepository } from '../../application/ports/NutritionLogRepository.js';
import { readJsonArray, writeJsonArray } from '../../infrastructure/db/jsonStore.js';

interface NutritionLogFileRow {
  id: string;
  record: NutritionLogRecord;
  createdAt: string;
}

export class JsonFileNutritionLogRepository implements NutritionLogRepository {
  constructor(private readonly filePath: string = 'data/nutrition-log.json') {}

  async save(log: NutritionLog): Promise<void> {
    const rows = await readJsonArray<NutritionLogFileRow>(this.filePath);
    const withoutExisting = rows.filter((row) => row.id !== log.id);
    withoutExisting.push({
      id: log.id,
      record: log.record,
      createdAt: log.createdAt.toISOString(),
    });
    await writeJsonArray(this.filePath, withoutExisting);
  }

  async findAll(): Promise<NutritionLog[]> {
    const rows = await readJsonArray<NutritionLogFileRow>(this.filePath);
    return rows.map((row) =>
      NutritionLog.restore({
        id: row.id,
        record: row.record,
        createdAt: new Date(row.createdAt),
      }),
    );
  }
}
