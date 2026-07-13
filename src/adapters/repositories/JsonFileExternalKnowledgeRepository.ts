import {
  ExternalKnowledge,
  type ExternalKnowledgeRecord,
} from '../../domain/entities/ExternalKnowledge.js';
import type { ExternalKnowledgeRepository } from '../../application/ports/ExternalKnowledgeRepository.js';
import { readJsonArray, writeJsonArray } from '../../infrastructure/db/jsonStore.js';

interface ExternalKnowledgeFileRow {
  id: string;
  record: ExternalKnowledgeRecord;
  createdAt: string;
  updatedAt: string;
}

export class JsonFileExternalKnowledgeRepository implements ExternalKnowledgeRepository {
  constructor(private readonly filePath: string = 'data/external-knowledge.json') {}

  async save(knowledge: ExternalKnowledge): Promise<void> {
    const rows = await readJsonArray<ExternalKnowledgeFileRow>(this.filePath);
    const withoutExisting = rows.filter((row) => row.id !== knowledge.id);
    withoutExisting.push({
      id: knowledge.id,
      record: knowledge.record,
      createdAt: knowledge.createdAt.toISOString(),
      updatedAt: knowledge.updatedAt.toISOString(),
    });
    await writeJsonArray(this.filePath, withoutExisting);
  }

  async findById(id: string): Promise<ExternalKnowledge | null> {
    const all = await this.findAll();
    return all.find((k) => k.id === id) ?? null;
  }

  async findAll(): Promise<ExternalKnowledge[]> {
    const rows = await readJsonArray<ExternalKnowledgeFileRow>(this.filePath);
    return rows.map((row) =>
      ExternalKnowledge.restore({
        id: row.id,
        record: row.record,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      }),
    );
  }

  async delete(id: string): Promise<void> {
    const rows = await readJsonArray<ExternalKnowledgeFileRow>(this.filePath);
    await writeJsonArray(
      this.filePath,
      rows.filter((row) => row.id !== id),
    );
  }
}
