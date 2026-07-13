import type { ExternalKnowledge } from '../../domain/entities/ExternalKnowledge.js';

export interface ExternalKnowledgeRepository {
  save(knowledge: ExternalKnowledge): Promise<void>;
  findById(id: string): Promise<ExternalKnowledge | null>;
  findAll(): Promise<ExternalKnowledge[]>;
  delete(id: string): Promise<void>;
}
