import { Capture, type CaptureRecord } from '../../domain/entities/Capture.js';
import type { CaptureRepository } from '../../application/ports/CaptureRepository.js';
import { readJsonArray, writeJsonArray } from '../../infrastructure/db/jsonStore.js';

interface CaptureFileRow {
  id: string;
  record: CaptureRecord;
  createdAt: string;
}

export class JsonFileCaptureRepository implements CaptureRepository {
  constructor(private readonly filePath: string = 'data/capture-log.json') {}

  async save(capture: Capture): Promise<void> {
    const rows = await readJsonArray<CaptureFileRow>(this.filePath);
    const withoutExisting = rows.filter((row) => row.id !== capture.id);
    withoutExisting.push({
      id: capture.id,
      record: capture.record,
      createdAt: capture.createdAt.toISOString(),
    });
    await writeJsonArray(this.filePath, withoutExisting);
  }

  async findAll(): Promise<Capture[]> {
    const rows = await readJsonArray<CaptureFileRow>(this.filePath);
    return rows.map((row) =>
      Capture.create({
        id: row.id,
        record: row.record,
        createdAt: new Date(row.createdAt),
      }),
    );
  }
}
