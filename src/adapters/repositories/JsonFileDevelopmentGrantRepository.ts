import {
  DevelopmentGrant,
  type DevelopmentGrantRecord,
  type DevelopmentGrantStatus,
} from '../../domain/entities/DevelopmentGrant.js';
import type { DevelopmentGrantRepository } from '../../application/ports/DevelopmentGrantRepository.js';
import { readJsonArray, writeJsonArray } from '../../infrastructure/db/jsonStore.js';

interface DevelopmentGrantFileRow {
  id: string;
  record: DevelopmentGrantRecord;
  createdAt: string;
  status: DevelopmentGrantStatus;
  versionsConsumed: number;
}

export class JsonFileDevelopmentGrantRepository implements DevelopmentGrantRepository {
  constructor(private readonly filePath: string = 'data/development-grants.json') {}

  async save(grant: DevelopmentGrant): Promise<void> {
    const rows = await readJsonArray<DevelopmentGrantFileRow>(this.filePath);
    const withoutExisting = rows.filter((row) => row.id !== grant.id);
    withoutExisting.push({
      id: grant.id,
      record: grant.record,
      createdAt: grant.createdAt.toISOString(),
      status: grant.status,
      versionsConsumed: grant.versionsConsumed,
    });
    await writeJsonArray(this.filePath, withoutExisting);
  }

  async findById(id: string): Promise<DevelopmentGrant | null> {
    const all = await this.findAll();
    return all.find((g) => g.id === id) ?? null;
  }

  async findAll(): Promise<DevelopmentGrant[]> {
    const rows = await readJsonArray<DevelopmentGrantFileRow>(this.filePath);
    return rows.map((row) =>
      DevelopmentGrant.restore({
        id: row.id,
        record: row.record,
        createdAt: new Date(row.createdAt),
        status: row.status,
        versionsConsumed: row.versionsConsumed,
      }),
    );
  }
}
