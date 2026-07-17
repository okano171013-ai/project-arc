import { FinanceLog, type FinanceLogRecord } from '../../domain/entities/FinanceLog.js';
import type { FinanceLogRepository } from '../../application/ports/FinanceLogRepository.js';
import { readJsonArray, writeJsonArray } from '../../infrastructure/db/jsonStore.js';

interface FinanceLogFileRow {
  id: string;
  record: FinanceLogRecord;
  createdAt: string;
}

export class JsonFileFinanceLogRepository implements FinanceLogRepository {
  constructor(private readonly filePath: string = 'data/finance-log.json') {}

  async save(log: FinanceLog): Promise<void> {
    const rows = await readJsonArray<FinanceLogFileRow>(this.filePath);
    const withoutExisting = rows.filter((row) => row.id !== log.id);
    withoutExisting.push({
      id: log.id,
      record: log.record,
      createdAt: log.createdAt.toISOString(),
    });
    await writeJsonArray(this.filePath, withoutExisting);
  }

  async findAll(): Promise<FinanceLog[]> {
    const rows = await readJsonArray<FinanceLogFileRow>(this.filePath);
    return rows.map((row) =>
      FinanceLog.restore({
        id: row.id,
        record: row.record,
        createdAt: new Date(row.createdAt),
      }),
    );
  }
}
