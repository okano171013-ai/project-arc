import type { ExternalKnowledgeRepository } from '../../ports/ExternalKnowledgeRepository.js';

export interface DeleteExternalKnowledgeInput {
  id: string;
}

export class DeleteExternalKnowledgeUseCase {
  constructor(private readonly externalKnowledgeRepository: ExternalKnowledgeRepository) {}

  async execute(input: DeleteExternalKnowledgeInput): Promise<void> {
    const knowledge = await this.externalKnowledgeRepository.findById(input.id);
    if (!knowledge) {
      throw new Error(`ExternalKnowledge not found: ${input.id}`);
    }
    await this.externalKnowledgeRepository.delete(input.id);
  }
}
