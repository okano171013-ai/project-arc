import {
  ApprovalDecision,
  type ApprovalDecisionRecord,
} from '../../domain/entities/ApprovalDecision.js';
import type { ApprovalDecisionRepository } from '../../application/ports/ApprovalDecisionRepository.js';
import { readJsonArray, writeJsonArray } from '../../infrastructure/db/jsonStore.js';

interface ApprovalDecisionFileRow {
  id: string;
  record: ApprovalDecisionRecord;
  createdAt: string;
}

export class JsonFileApprovalDecisionRepository implements ApprovalDecisionRepository {
  constructor(private readonly filePath: string = 'data/approval-decisions.json') {}

  async save(decision: ApprovalDecision): Promise<void> {
    const rows = await readJsonArray<ApprovalDecisionFileRow>(this.filePath);
    const withoutExisting = rows.filter((row) => row.id !== decision.id);
    withoutExisting.push({
      id: decision.id,
      record: decision.record,
      createdAt: decision.createdAt.toISOString(),
    });
    await writeJsonArray(this.filePath, withoutExisting);
  }

  async findAll(): Promise<ApprovalDecision[]> {
    const rows = await readJsonArray<ApprovalDecisionFileRow>(this.filePath);
    return rows.map((row) =>
      ApprovalDecision.restore({
        id: row.id,
        record: row.record,
        createdAt: new Date(row.createdAt),
      }),
    );
  }
}
