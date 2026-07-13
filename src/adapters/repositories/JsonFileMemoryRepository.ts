import { MemoryEntry, type MemoryEntryRecord } from '../../domain/entities/MemoryEntry.js';
import type { MemoryRepository } from '../../application/ports/MemoryRepository.js';
import { readJsonArray, writeJsonArray } from '../../infrastructure/db/jsonStore.js';

interface MemoryFileRow {
  id: string;
  record: MemoryEntryRecord;
  createdAt: string;
  updatedAt: string;
}

/**
 * JsonFileMemoryRepository
 *
 * ADR 0003（ローカルJSON永続化）・ADR 0005（Reflectionとの分離）に
 * 基づく、`data/memory.json`への保存実装。
 */
export class JsonFileMemoryRepository implements MemoryRepository {
  constructor(private readonly filePath: string = 'data/memory.json') {}

  async save(entry: MemoryEntry): Promise<void> {
    const rows = await readJsonArray<MemoryFileRow>(this.filePath);
    const withoutExisting = rows.filter((row) => row.id !== entry.id);
    withoutExisting.push({
      id: entry.id,
      record: {
        category: entry.category,
        title: entry.title,
        content: entry.content,
        tags: [...entry.tags],
      },
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    });
    await writeJsonArray(this.filePath, withoutExisting);
  }

  async findAll(): Promise<MemoryEntry[]> {
    const rows = await readJsonArray<MemoryFileRow>(this.filePath);
    return rows
      .sort((a, b) => a.record.category.localeCompare(b.record.category, 'ja'))
      .map((row) => this.toDomain(row));
  }

  async findById(id: string): Promise<MemoryEntry | null> {
    const rows = await readJsonArray<MemoryFileRow>(this.filePath);
    const row = rows.find((r) => r.id === id);
    return row ? this.toDomain(row) : null;
  }

  async delete(id: string): Promise<void> {
    const rows = await readJsonArray<MemoryFileRow>(this.filePath);
    await writeJsonArray(
      this.filePath,
      rows.filter((row) => row.id !== id),
    );
  }

  private toDomain(row: MemoryFileRow): MemoryEntry {
    return MemoryEntry.restore({
      id: row.id,
      record: row.record,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
  }
}
