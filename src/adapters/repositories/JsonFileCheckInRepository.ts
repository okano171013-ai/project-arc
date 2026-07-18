import { CheckIn, type CheckInRecord } from '../../domain/entities/CheckIn.js';
import type { CheckInRepository } from '../../application/ports/CheckInRepository.js';
import { readJsonArray, writeJsonArray } from '../../infrastructure/db/jsonStore.js';

interface CheckInFileRow {
  id: string;
  record: CheckInRecord;
  createdAt: string;
}

export class JsonFileCheckInRepository implements CheckInRepository {
  constructor(private readonly filePath: string = 'data/check-ins.json') {}

  async save(checkIn: CheckIn): Promise<void> {
    const rows = await readJsonArray<CheckInFileRow>(this.filePath);
    const withoutExisting = rows.filter((row) => row.id !== checkIn.id);
    withoutExisting.push({
      id: checkIn.id,
      record: checkIn.record,
      createdAt: checkIn.createdAt.toISOString(),
    });
    await writeJsonArray(this.filePath, withoutExisting);
  }

  async findAll(): Promise<CheckIn[]> {
    const rows = await readJsonArray<CheckInFileRow>(this.filePath);
    return rows.map((row) =>
      CheckIn.restore({
        id: row.id,
        record: row.record,
        createdAt: new Date(row.createdAt),
      }),
    );
  }
}
