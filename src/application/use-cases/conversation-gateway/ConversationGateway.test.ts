import { describe, it, expect, beforeEach } from 'vitest';
import { ConversationGatewayUseCase } from './ConversationGateway.js';
import { AddExternalKnowledgeUseCase } from '../external-knowledge/AddExternalKnowledge.js';
import { AddExternalSourceUseCase } from '../external-source/AddExternalSource.js';
import type { ExternalKnowledgeRepository } from '../../ports/ExternalKnowledgeRepository.js';
import type { ExternalSourceRepository } from '../../ports/ExternalSourceRepository.js';
import type { ExternalKnowledge } from '../../../domain/entities/ExternalKnowledge.js';
import type { ExternalSource } from '../../../domain/entities/ExternalSource.js';

class FakeExternalKnowledgeRepository implements ExternalKnowledgeRepository {
  store = new Map<string, ExternalKnowledge>();
  async save(knowledge: ExternalKnowledge): Promise<void> {
    this.store.set(knowledge.id, knowledge);
  }
  async findById(id: string): Promise<ExternalKnowledge | null> {
    return this.store.get(id) ?? null;
  }
  async findAll(): Promise<ExternalKnowledge[]> {
    return [...this.store.values()];
  }
  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}

class FakeExternalSourceRepository implements ExternalSourceRepository {
  store = new Map<string, ExternalSource>();
  async save(source: ExternalSource): Promise<void> {
    this.store.set(source.id, source);
  }
  async findById(id: string): Promise<ExternalSource | null> {
    return this.store.get(id) ?? null;
  }
  async findAll(): Promise<ExternalSource[]> {
    return [...this.store.values()];
  }
  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
  async findByUrl(url: string): Promise<ExternalSource[]> {
    return [...this.store.values()].filter((s) => s.url === url);
  }
  async findByIdentifier(identifier: string): Promise<ExternalSource[]> {
    return [...this.store.values()].filter((s) => s.identifier === identifier);
  }
}

describe('ConversationGateway', () => {
  let knowledgeRepo: FakeExternalKnowledgeRepository;
  let sourceRepo: FakeExternalSourceRepository;

  beforeEach(() => {
    knowledgeRepo = new FakeExternalKnowledgeRepository();
    sourceRepo = new FakeExternalSourceRepository();
  });

  it('routes a Retrieval-intent question to RetrieveKnowledgeUseCase and returns Sources (Retrieval判定/Source取得)', async () => {
    const { source } = await new AddExternalSourceUseCase(sourceRepo).execute({
      record: { sourceType: 'paper', title: '行政法論文' },
    });
    await new AddExternalKnowledgeUseCase(knowledgeRepo, sourceRepo).execute({
      record: {
        sourceId: source.id,
        title: '処分性メモ',
        content: '処分性は〜',
        capturedAt: '2026-07-13',
        topics: ['論文'],
      },
    });

    const useCase = new ConversationGatewayUseCase(knowledgeRepo, sourceRepo);
    const { conversationContext } = await useCase.execute({ question: '前に読んだ論文を教えて' });

    expect(conversationContext.intent).toBe('Retrieval');
    expect(conversationContext.retrievedKnowledge).toHaveLength(1);
    expect(conversationContext.decisionContext).toBeNull();
    expect(conversationContext.sources).toHaveLength(1);
  });

  it('routes a Decision-intent question to DecisionEngineUseCase (Decision判定)', async () => {
    await new AddExternalKnowledgeUseCase(knowledgeRepo, sourceRepo).execute({
      record: { title: '行政法メモ', content: 'おすすめの論点', capturedAt: '2026-07-13', topics: ['行政法'] },
    });
    await new AddExternalKnowledgeUseCase(knowledgeRepo, sourceRepo).execute({
      record: { title: '民訴法メモ', content: '要件事実は難しい', capturedAt: '2026-07-10', topics: ['民訴法'] },
    });

    const useCase = new ConversationGatewayUseCase(knowledgeRepo, sourceRepo);
    const { conversationContext } = await useCase.execute({
      question: '今日は行政法と民訴法どっち？',
    });

    expect(conversationContext.intent).toBe('Decision');
    expect(conversationContext.decisionContext).not.toBeNull();
    expect(conversationContext.decisionContext?.candidates.sort()).toEqual(['民訴法', '行政法'].sort());
  });

  it('returns an empty context with a warning for a None-intent question, invoking no tool (None判定)', async () => {
    await new AddExternalKnowledgeUseCase(knowledgeRepo, sourceRepo).execute({
      record: { title: 'A', content: '本文', capturedAt: '2026-07-01' },
    });

    const useCase = new ConversationGatewayUseCase(knowledgeRepo, sourceRepo);
    const { conversationContext } = await useCase.execute({ question: 'こんにちは' });

    expect(conversationContext.intent).toBe('None');
    expect(conversationContext.retrievedKnowledge).toEqual([]);
    expect(conversationContext.decisionContext).toBeNull();
    expect(conversationContext.sources).toEqual([]);
    expect(conversationContext.warnings.length).toBeGreaterThan(0);
  });

  it('respects a caller-supplied limit for Retrieval intent, never performing a full unbounded search (limit)', async () => {
    const add = new AddExternalKnowledgeUseCase(knowledgeRepo, sourceRepo);
    for (let i = 1; i <= 5; i++) {
      await add.execute({
        record: { title: `メモ${i}`, content: '記録した内容', capturedAt: `2026-07-0${i}`, topics: ['記録'] },
      });
    }

    const useCase = new ConversationGatewayUseCase(knowledgeRepo, sourceRepo);
    const { conversationContext } = await useCase.execute({
      question: '前に記録した内容は？',
      limit: 2,
    });

    expect(conversationContext.retrievedKnowledge).toHaveLength(2);
  });

  it('warns when Retrieval finds nothing, without throwing (Context生成)', async () => {
    const useCase = new ConversationGatewayUseCase(knowledgeRepo, sourceRepo);
    const { conversationContext } = await useCase.execute({ question: '前に読んだ論文は？' });

    expect(conversationContext.intent).toBe('Retrieval');
    expect(conversationContext.retrievedKnowledge).toEqual([]);
    expect(conversationContext.warnings[0]).toContain('見つかりませんでした');
  });
});
