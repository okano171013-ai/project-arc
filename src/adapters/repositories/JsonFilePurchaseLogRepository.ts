import { PurchaseLog, type PurchaseLogRecord } from '../../domain/entities/PurchaseLog.js';
import type { PurchaseLogRepository } from '../../application/ports/PurchaseLogRepository.js';
import { readJsonArray, writeJsonArray } from '../../infrastructure/db/jsonStore.js';

interface PurchaseLogFileRow {
  id: string;
  record: PurchaseLogRecord;
  createdAt: string;
  updatedAt: string;
}

export class JsonFilePurchaseLogRepository implements PurchaseLogRepository {
  constructor(private readonly filePath: string = 'data/purchase-log.json') {}

  async save(log: PurchaseLog): Promise<void> {
    const rows = await readJsonArray<PurchaseLogFileRow>(this.filePath);
    const withoutExisting = rows.filter((row) => row.id !== log.id);
    withoutExisting.push({
      id: log.id,
      record: log.record,
      createdAt: log.createdAt.toISOString(),
      updatedAt: log.updatedAt.toISOString(),
    });
    await writeJsonArray(this.filePath, withoutExisting);
  }

  async findAll(): Promise<PurchaseLog[]> {
    const rows = await readJsonArray<PurchaseLogFileRow>(this.filePath);
    return rows.map((row) =>
      PurchaseLog.restore({
        id: row.id,
        record: row.record,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      }),
    );
  }

  async findById(id: string): Promise<PurchaseLog | null> {
    const all = await this.findAll();
    return all.find((p) => p.id === id) ?? null;
  }
}
