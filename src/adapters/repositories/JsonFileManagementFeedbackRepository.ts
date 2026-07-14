import {
  ManagementFeedback,
  type ManagementFeedbackRecord,
  type ManagementFeedbackResolution,
} from '../../domain/entities/ManagementFeedback.js';
import type { ManagementFeedbackRepository } from '../../application/ports/ManagementFeedbackRepository.js';
import { readJsonArray, writeJsonArray } from '../../infrastructure/db/jsonStore.js';

interface ManagementFeedbackFileRow {
  id: string;
  record: ManagementFeedbackRecord;
  createdAt: string;
  resolution: ManagementFeedbackResolution;
  resolvedAt: string | undefined;
}

export class JsonFileManagementFeedbackRepository implements ManagementFeedbackRepository {
  constructor(private readonly filePath: string = 'data/management-feedback.json') {}

  async save(feedback: ManagementFeedback): Promise<void> {
    const rows = await readJsonArray<ManagementFeedbackFileRow>(this.filePath);
    const withoutExisting = rows.filter((row) => row.id !== feedback.id);
    withoutExisting.push({
      id: feedback.id,
      record: feedback.record,
      createdAt: feedback.createdAt.toISOString(),
      resolution: feedback.resolution,
      resolvedAt: feedback.resolvedAt?.toISOString(),
    });
    await writeJsonArray(this.filePath, withoutExisting);
  }

  async findById(id: string): Promise<ManagementFeedback | null> {
    const all = await this.findAll();
    return all.find((f) => f.id === id) ?? null;
  }

  async findAll(): Promise<ManagementFeedback[]> {
    const rows = await readJsonArray<ManagementFeedbackFileRow>(this.filePath);
    return rows.map((row) =>
      ManagementFeedback.restore({
        id: row.id,
        record: row.record,
        createdAt: new Date(row.createdAt),
        resolution: row.resolution,
        resolvedAt: row.resolvedAt ? new Date(row.resolvedAt) : undefined,
      }),
    );
  }
}
