import type {
  ExternalKnowledge,
  ExternalKnowledgeStatus,
} from '../../../domain/entities/ExternalKnowledge.js';
import type { ExternalKnowledgeRepository } from '../../ports/ExternalKnowledgeRepository.js';

export interface ListExternalKnowledgeInput {
  status?: ExternalKnowledgeStatus;
}

export interface ListExternalKnowledgeOutput {
  knowledge: ExternalKnowledge[];
}

export class ListExternalKnowledgeUseCase {
  constructor(private readonly externalKnowledgeRepository: ExternalKnowledgeRepository) {}

  async execute(input: ListExternalKnowledgeInput = {}): Promise<ListExternalKnowledgeOutput> {
    const all = await this.externalKnowledgeRepository.findAll();
    const filtered = input.status ? all.filter((k) => k.status === input.status) : all;
    const sorted = [...filtered].sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
    return { knowledge: sorted };
  }
}
