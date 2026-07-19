import {
  IngressRecord,
  type IngressRecordData,
  type IngressRecordStatus,
} from '../../domain/entities/IngressRecord.js';
import type { IngressRecordRepository } from '../../application/ports/IngressRecordRepository.js';
import { readJsonArray, writeJsonArray } from '../../infrastructure/db/jsonStore.js';

interface IngressRecordFileRow {
  id: string;
  data: IngressRecordData;
  receivedAt: string;
  status: IngressRecordStatus;
  retryCount: number;
  failureReason?: string;
  canonicalizedAs?: string;
}

export class JsonFileIngressRecordRepository implements IngressRecordRepository {
  constructor(private readonly filePath: string = 'data/ingress-records.json') {}

  async save(record: IngressRecord): Promise<void> {
    const rows = await readJsonArray<IngressRecordFileRow>(this.filePath);
    const withoutExisting = rows.filter((row) => row.id !== record.id);
    withoutExisting.push({
      id: record.id,
      data: record.data,
      receivedAt: record.receivedAt.toISOString(),
      status: record.status,
      retryCount: record.retryCount,
      failureReason: record.failureReason,
      canonicalizedAs: record.canonicalizedAs,
    });
    await writeJsonArray(this.filePath, withoutExisting);
  }

  async findById(id: string): Promise<IngressRecord | null> {
    const all = await this.findAll();
    return all.find((r) => r.id === id) ?? null;
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<IngressRecord | null> {
    const all = await this.findAll();
    return all.find((r) => r.data.idempotencyKey === idempotencyKey) ?? null;
  }

  async findAll(): Promise<IngressRecord[]> {
    const rows = await readJsonArray<IngressRecordFileRow>(this.filePath);
    return rows.map((row) =>
      IngressRecord.restore({
        id: row.id,
        data: row.data,
        receivedAt: new Date(row.receivedAt),
        status: row.status,
        retryCount: row.retryCount,
        failureReason: row.failureReason,
        canonicalizedAs: row.canonicalizedAs,
      }),
    );
  }

  async findByStatus(status: IngressRecordStatus): Promise<IngressRecord[]> {
    const all = await this.findAll();
    return all.filter((r) => r.status === status);
  }
}
