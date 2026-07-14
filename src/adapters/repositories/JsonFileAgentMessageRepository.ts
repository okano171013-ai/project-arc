import {
  AgentMessage,
  type AgentMessageRecord,
} from '../../domain/entities/AgentMessage.js';
import type { AgentMessageRepository } from '../../application/ports/AgentMessageRepository.js';
import { readJsonArray, writeJsonArray } from '../../infrastructure/db/jsonStore.js';

interface AgentMessageFileRow {
  id: string;
  record: AgentMessageRecord;
  createdAt: string;
}

export class JsonFileAgentMessageRepository implements AgentMessageRepository {
  constructor(private readonly filePath: string = 'data/agent-messages.json') {}

  async save(message: AgentMessage): Promise<void> {
    const rows = await readJsonArray<AgentMessageFileRow>(this.filePath);
    const withoutExisting = rows.filter((row) => row.id !== message.id);
    withoutExisting.push({
      id: message.id,
      record: message.record,
      createdAt: message.createdAt.toISOString(),
    });
    await writeJsonArray(this.filePath, withoutExisting);
  }

  async findById(id: string): Promise<AgentMessage | null> {
    const all = await this.findAll();
    return all.find((m) => m.id === id) ?? null;
  }

  async findAll(): Promise<AgentMessage[]> {
    const rows = await readJsonArray<AgentMessageFileRow>(this.filePath);
    return rows.map((row) =>
      AgentMessage.restore({
        id: row.id,
        record: row.record,
        createdAt: new Date(row.createdAt),
      }),
    );
  }
}
