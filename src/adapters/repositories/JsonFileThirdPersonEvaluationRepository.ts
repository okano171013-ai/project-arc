import {
  ThirdPersonEvaluation,
  type ThirdPersonEvaluationRecord,
} from '../../domain/entities/ThirdPersonEvaluation.js';
import type { ThirdPersonEvaluationRepository } from '../../application/ports/ThirdPersonEvaluationRepository.js';
import { readJsonArray, writeJsonArray } from '../../infrastructure/db/jsonStore.js';

interface ThirdPersonEvaluationFileRow {
  id: string;
  record: ThirdPersonEvaluationRecord;
  createdAt: string;
}

export class JsonFileThirdPersonEvaluationRepository implements ThirdPersonEvaluationRepository {
  constructor(private readonly filePath: string = 'data/third-person-evaluation.json') {}

  async save(evaluation: ThirdPersonEvaluation): Promise<void> {
    const rows = await readJsonArray<ThirdPersonEvaluationFileRow>(this.filePath);
    const withoutExisting = rows.filter((row) => row.id !== evaluation.id);
    withoutExisting.push({
      id: evaluation.id,
      record: evaluation.record,
      createdAt: evaluation.createdAt.toISOString(),
    });
    await writeJsonArray(this.filePath, withoutExisting);
  }

  async findAll(): Promise<ThirdPersonEvaluation[]> {
    const rows = await readJsonArray<ThirdPersonEvaluationFileRow>(this.filePath);
    return rows.map((row) =>
      ThirdPersonEvaluation.create({
        id: row.id,
        record: row.record,
        createdAt: new Date(row.createdAt),
      }),
    );
  }
}
