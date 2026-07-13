import { Reflection, type ReflectionRecord } from '../../domain/entities/Reflection.js';
import type { ReflectionRepository } from '../../application/ports/ReflectionRepository.js';
import { readJsonArray, writeJsonArray } from '../../infrastructure/db/jsonStore.js';

interface ReflectionFileRow {
  id: string;
  date: string;
  record: ReflectionRecord;
  createdAt: string;
}

/**
 * JsonFileReflectionRepository
 *
 * ADR 0003に基づくVersion2の既定実装。`data/reflections.json`に
 * 配列として保存する。
 */
export class JsonFileReflectionRepository implements ReflectionRepository {
  constructor(private readonly filePath: string = 'data/reflections.json') {}

  async save(reflection: Reflection): Promise<void> {
    const rows = await readJsonArray<ReflectionFileRow>(this.filePath);
    const withoutExisting = rows.filter((row) => row.date !== reflection.date);
    withoutExisting.push({
      id: reflection.id,
      date: reflection.date,
      record: reflection.record,
      createdAt: reflection.createdAt.toISOString(),
    });
    await writeJsonArray(this.filePath, withoutExisting);
  }

  async findByDate(date: string): Promise<Reflection | null> {
    const rows = await readJsonArray<ReflectionFileRow>(this.filePath);
    const row = rows.find((r) => r.date === date);
    return row ? this.toDomain(row) : null;
  }

  async findRecent(limit: number): Promise<Reflection[]> {
    const rows = await readJsonArray<ReflectionFileRow>(this.filePath);
    return rows
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, limit)
      .map((row) => this.toDomain(row));
  }

  private toDomain(row: ReflectionFileRow): Reflection {
    return Reflection.create({
      id: row.id,
      date: row.date,
      record: row.record,
      createdAt: new Date(row.createdAt),
    });
  }
}
