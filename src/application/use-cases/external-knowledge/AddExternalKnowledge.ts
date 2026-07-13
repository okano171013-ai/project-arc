import { randomUUID } from 'node:crypto';
import {
  ExternalKnowledge,
  type ExternalKnowledgeInputRecord,
} from '../../../domain/entities/ExternalKnowledge.js';
import type { ExternalKnowledgeRepository } from '../../ports/ExternalKnowledgeRepository.js';
import type { ExternalSourceRepository } from '../../ports/ExternalSourceRepository.js';

export interface AddExternalKnowledgeInput {
  record: ExternalKnowledgeInputRecord;
}

export interface AddExternalKnowledgeOutput {
  knowledge: ExternalKnowledge;
}

/**
 * AddExternalKnowledgeUseCase（Version10）
 *
 * sourceIdが指定された場合、参照先のExternalSourceが実在するかを
 * 確認する。存在しない場合はエラーとし、孤立した参照を黙って
 * 作らない（指示書7章「ExternalKnowledgeが参照するsourceIdが存在
 * しない場合の挙動を決める」への回答、ADR 0016）。
 */
export class AddExternalKnowledgeUseCase {
  constructor(
    private readonly externalKnowledgeRepository: ExternalKnowledgeRepository,
    private readonly externalSourceRepository: ExternalSourceRepository,
  ) {}

  async execute(input: AddExternalKnowledgeInput): Promise<AddExternalKnowledgeOutput> {
    if (input.record.sourceId) {
      const source = await this.externalSourceRepository.findById(input.record.sourceId);
      if (!source) {
        throw new Error(`ExternalSource not found: ${input.record.sourceId}`);
      }
    }
    const knowledge = ExternalKnowledge.create({ id: randomUUID(), record: input.record });
    await this.externalKnowledgeRepository.save(knowledge);
    return { knowledge };
  }
}
