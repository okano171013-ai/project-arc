import { ChallengeLog, type ChallengeLogRecord } from '../../domain/entities/ChallengeLog.js';
import type { ChallengeLogRepository } from '../../application/ports/ChallengeLogRepository.js';
import { readJsonArray, writeJsonArray } from '../../infrastructure/db/jsonStore.js';

interface ChallengeLogFileRow {
  id: string;
  record: ChallengeLogRecord;
  createdAt: string;
}

export class JsonFileChallengeLogRepository implements ChallengeLogRepository {
  constructor(private readonly filePath: string = 'data/challenge-log.json') {}

  async save(log: ChallengeLog): Promise<void> {
    const rows = await readJsonArray<ChallengeLogFileRow>(this.filePath);
    const withoutExisting = rows.filter((row) => row.id !== log.id);
    withoutExisting.push({
      id: log.id,
      record: log.record,
      createdAt: log.createdAt.toISOString(),
    });
    await writeJsonArray(this.filePath, withoutExisting);
  }

  async findAll(): Promise<ChallengeLog[]> {
    const rows = await readJsonArray<ChallengeLogFileRow>(this.filePath);
    return rows.map((row) =>
      ChallengeLog.create({
        id: row.id,
        record: row.record,
        createdAt: new Date(row.createdAt),
      }),
    );
  }
}
