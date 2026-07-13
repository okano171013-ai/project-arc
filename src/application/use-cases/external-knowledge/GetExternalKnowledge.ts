import type { ExternalKnowledge } from '../../../domain/entities/ExternalKnowledge.js';
import type { ExternalKnowledgeRepository } from '../../ports/ExternalKnowledgeRepository.js';

export interface GetExternalKnowledgeInput {
  id: string;
}

export interface GetExternalKnowledgeOutput {
  knowledge: ExternalKnowledge | null;
}

export class GetExternalKnowledgeUseCase {
  constructor(private readonly externalKnowledgeRepository: ExternalKnowledgeRepository) {}

  async execute(input: GetExternalKnowledgeInput): Promise<GetExternalKnowledgeOutput> {
    const knowledge = await this.externalKnowledgeRepository.findById(input.id);
    return { knowledge };
  }
}
