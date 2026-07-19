import {
  AgentTask,
  type AgentTaskRecord,
  type AgentTaskStatus,
  type AgentTaskTestResult,
} from '../../domain/entities/AgentTask.js';
import type { AgentTaskRepository } from '../../application/ports/AgentTaskRepository.js';
import { readJsonArray, writeJsonArray } from '../../infrastructure/db/jsonStore.js';

interface AgentTaskFileRow {
  id: string;
  record: AgentTaskRecord;
  createdAt: string;
  status: AgentTaskStatus;
  claimedBy?: string;
  leaseExpiresAt?: string;
  retryCount: number;
  commits: string[];
  testResult?: AgentTaskTestResult;
}

export class JsonFileAgentTaskRepository implements AgentTaskRepository {
  constructor(private readonly filePath: string = 'data/agent-tasks.json') {}

  async save(task: AgentTask): Promise<void> {
    const rows = await readJsonArray<AgentTaskFileRow>(this.filePath);
    const withoutExisting = rows.filter((row) => row.id !== task.id);
    withoutExisting.push({
      id: task.id,
      record: task.record,
      createdAt: task.createdAt.toISOString(),
      status: task.status,
      claimedBy: task.claimedBy,
      leaseExpiresAt: task.leaseExpiresAt?.toISOString(),
      retryCount: task.retryCount,
      commits: [...task.commits],
      testResult: task.testResult,
    });
    await writeJsonArray(this.filePath, withoutExisting);
  }

  async findById(id: string): Promise<AgentTask | null> {
    const all = await this.findAll();
    return all.find((t) => t.id === id) ?? null;
  }

  async findAll(): Promise<AgentTask[]> {
    const rows = await readJsonArray<AgentTaskFileRow>(this.filePath);
    return rows.map((row) =>
      AgentTask.restore({
        id: row.id,
        record: row.record,
        createdAt: new Date(row.createdAt),
        status: row.status,
        claimedBy: row.claimedBy,
        leaseExpiresAt: row.leaseExpiresAt ? new Date(row.leaseExpiresAt) : undefined,
        retryCount: row.retryCount,
        commits: row.commits,
        testResult: row.testResult,
      }),
    );
  }
}
