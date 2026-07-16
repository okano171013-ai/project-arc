import {
  AgentDelegationGrant,
  type AgentDelegationGrantRecord,
  type AgentDelegationGrantStatus,
} from '../../domain/entities/AgentDelegationGrant.js';
import type { AgentDelegationGrantRepository } from '../../application/ports/AgentDelegationGrantRepository.js';
import { readJsonArray, writeJsonArray } from '../../infrastructure/db/jsonStore.js';

interface AgentDelegationGrantFileRow {
  id: string;
  record: AgentDelegationGrantRecord;
  createdAt: string;
  status: AgentDelegationGrantStatus;
  usageCount: number;
}

export class JsonFileAgentDelegationGrantRepository implements AgentDelegationGrantRepository {
  constructor(private readonly filePath: string = 'data/agent-delegation-grants.json') {}

  async save(grant: AgentDelegationGrant): Promise<void> {
    const rows = await readJsonArray<AgentDelegationGrantFileRow>(this.filePath);
    const withoutExisting = rows.filter((row) => row.id !== grant.id);
    withoutExisting.push({
      id: grant.id,
      record: grant.record,
      createdAt: grant.createdAt.toISOString(),
      status: grant.status,
      usageCount: grant.usageCount,
    });
    await writeJsonArray(this.filePath, withoutExisting);
  }

  async findById(id: string): Promise<AgentDelegationGrant | null> {
    const all = await this.findAll();
    return all.find((g) => g.id === id) ?? null;
  }

  async findAll(): Promise<AgentDelegationGrant[]> {
    const rows = await readJsonArray<AgentDelegationGrantFileRow>(this.filePath);
    return rows.map((row) =>
      AgentDelegationGrant.restore({
        id: row.id,
        record: row.record,
        createdAt: new Date(row.createdAt),
        status: row.status,
        usageCount: row.usageCount,
      }),
    );
  }
}
