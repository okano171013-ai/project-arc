import { DistractionSignal, type DistractionSignalRecord } from '../../domain/entities/DistractionSignal.js';
import type { DistractionSignalRepository } from '../../application/ports/DistractionSignalRepository.js';
import { readJsonArray, writeJsonArray } from '../../infrastructure/db/jsonStore.js';

interface DistractionSignalFileRow {
  id: string;
  record: DistractionSignalRecord;
  createdAt: string;
}

export class JsonFileDistractionSignalRepository implements DistractionSignalRepository {
  constructor(private readonly filePath: string = 'data/distraction-signals.json') {}

  async save(signal: DistractionSignal): Promise<void> {
    const rows = await readJsonArray<DistractionSignalFileRow>(this.filePath);
    const withoutExisting = rows.filter((row) => row.id !== signal.id);
    withoutExisting.push({
      id: signal.id,
      record: signal.record,
      createdAt: signal.createdAt.toISOString(),
    });
    await writeJsonArray(this.filePath, withoutExisting);
  }

  async findAll(): Promise<DistractionSignal[]> {
    const rows = await readJsonArray<DistractionSignalFileRow>(this.filePath);
    return rows.map((row) =>
      DistractionSignal.restore({
        id: row.id,
        record: row.record,
        createdAt: new Date(row.createdAt),
      }),
    );
  }
}
