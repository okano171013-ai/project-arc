import {
  ExternalSource,
  type ExternalSourceRecord,
} from '../../domain/entities/ExternalSource.js';
import type { ExternalSourceRepository } from '../../application/ports/ExternalSourceRepository.js';
import { readJsonArray, writeJsonArray } from '../../infrastructure/db/jsonStore.js';

interface ExternalSourceFileRow {
  id: string;
  record: ExternalSourceRecord;
  createdAt: string;
  updatedAt: string;
}

export class JsonFileExternalSourceRepository implements ExternalSourceRepository {
  constructor(private readonly filePath: string = 'data/external-sources.json') {}

  async save(source: ExternalSource): Promise<void> {
    const rows = await readJsonArray<ExternalSourceFileRow>(this.filePath);
    const withoutExisting = rows.filter((row) => row.id !== source.id);
    withoutExisting.push({
      id: source.id,
      record: source.record,
      createdAt: source.createdAt.toISOString(),
      updatedAt: source.updatedAt.toISOString(),
    });
    await writeJsonArray(this.filePath, withoutExisting);
  }

  async findById(id: string): Promise<ExternalSource | null> {
    const all = await this.findAll();
    return all.find((s) => s.id === id) ?? null;
  }

  async findAll(): Promise<ExternalSource[]> {
    const rows = await readJsonArray<ExternalSourceFileRow>(this.filePath);
    return rows.map((row) =>
      ExternalSource.restore({
        id: row.id,
        record: row.record,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      }),
    );
  }

  async delete(id: string): Promise<void> {
    const rows = await readJsonArray<ExternalSourceFileRow>(this.filePath);
    await writeJsonArray(
      this.filePath,
      rows.filter((row) => row.id !== id),
    );
  }

  async findByUrl(url: string): Promise<ExternalSource[]> {
    const all = await this.findAll();
    return all.filter((s) => s.url === url);
  }

  async findByIdentifier(identifier: string): Promise<ExternalSource[]> {
    const all = await this.findAll();
    return all.filter((s) => s.identifier === identifier);
  }
}
