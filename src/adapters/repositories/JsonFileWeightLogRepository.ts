import { WeightLog, type WeightLogRecord } from '../../domain/entities/WeightLog.js';
import type { WeightLogRepository } from '../../application/ports/WeightLogRepository.js';
import { readJsonArray, writeJsonArray } from '../../infrastructure/db/jsonStore.js';

interface WeightLogFileRow {
  id: string;
  record: WeightLogRecord;
  createdAt: string;
}

export class JsonFileWeightLogRepository implements WeightLogRepository {
  constructor(private readonly filePath: string = 'data/weight-log.json') {}

  async save(log: WeightLog): Promise<void> {
    const rows = await readJsonArray<WeightLogFileRow>(this.filePath);
    const withoutExisting = rows.filter((row) => row.id !== log.id);
    withoutExisting.push({
      id: log.id,
      record: log.record,
      createdAt: log.createdAt.toISOString(),
    });
    await writeJsonArray(this.filePath, withoutExisting);
  }

  async findAll(): Promise<WeightLog[]> {
    const rows = await readJsonArray<WeightLogFileRow>(this.filePath);
    return rows.map((row) =>
      WeightLog.restore({
        id: row.id,
        record: row.record,
        createdAt: new Date(row.createdAt),
      }),
    );
  }
}
