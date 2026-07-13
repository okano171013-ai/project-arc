import type {
  ExternalKnowledge,
  ExternalKnowledgeInputRecord,
} from '../../../domain/entities/ExternalKnowledge.js';
import type { ExternalKnowledgeRepository } from '../../ports/ExternalKnowledgeRepository.js';
import type { ExternalSourceRepository } from '../../ports/ExternalSourceRepository.js';

export interface UpdateExternalKnowledgeInput {
  id: string;
  changes: Partial<ExternalKnowledgeInputRecord>;
}

export interface UpdateExternalKnowledgeOutput {
  knowledge: ExternalKnowledge;
}

/**
 * `pnpm external -- review <id>` / `-- archive <id>`は、このUseCaseを
 * `{ changes: { status: 'reviewed' | 'archived' } }`で呼ぶ薄い
 * ラッパーとして実装する（専用UseCaseを新設しない、YAGNI）。
 */
export class UpdateExternalKnowledgeUseCase {
  constructor(
    private readonly externalKnowledgeRepository: ExternalKnowledgeRepository,
    private readonly externalSourceRepository: ExternalSourceRepository,
  ) {}

  async execute(input: UpdateExternalKnowledgeInput): Promise<UpdateExternalKnowledgeOutput> {
    const knowledge = await this.externalKnowledgeRepository.findById(input.id);
    if (!knowledge) {
      throw new Error(`ExternalKnowledge not found: ${input.id}`);
    }
    if (input.changes.sourceId) {
      const source = await this.externalSourceRepository.findById(input.changes.sourceId);
      if (!source) {
        throw new Error(`ExternalSource not found: ${input.changes.sourceId}`);
      }
    }
    knowledge.update(input.changes);
    await this.externalKnowledgeRepository.save(knowledge);
    return { knowledge };
  }
}
