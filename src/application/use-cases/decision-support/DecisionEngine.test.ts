import { describe, it, expect, beforeEach } from 'vitest';
import { DecisionEngineUseCase } from './DecisionEngine.js';
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

describe('DecisionEngine', () => {
  let knowledgeRepo: FakeExternalKnowledgeRepository;
  let sourceRepo: FakeExternalSourceRepository;

  beforeEach(() => {
    knowledgeRepo = new FakeExternalKnowledgeRepository();
    sourceRepo = new FakeExternalSourceRepository();
  });

  it('generates candidates without priority ordering and collects evidence per candidate (選択肢多数)', async () => {
    const add = new AddExternalKnowledgeUseCase(knowledgeRepo, sourceRepo);
    await add.execute({
      record: {
        title: '行政法メモ',
        content: '処分性は司法試験でよく使えるのでおすすめの論点',
        capturedAt: '2026-07-01',
        topics: ['行政法'],
      },
    });
    await add.execute({
      record: {
        title: '民訴法メモ',
        content: '要件事実は難しいので注意が必要',
        capturedAt: '2026-07-02',
        topics: ['民訴法'],
      },
    });
    await add.execute({
      record: { title: '会社法メモ', content: '未整理', capturedAt: '2026-07-03', topics: ['会社法'] },
    });

    const useCase = new DecisionEngineUseCase(knowledgeRepo, sourceRepo);
    const { decisionContext } = await useCase.execute({ question: '今日は何を勉強するべき？' });

    expect(decisionContext.candidates.sort()).toEqual(['会社法', '民訴法', '行政法'].sort());
    expect(decisionContext.comparisons).toHaveLength(3);

    const gyousei = decisionContext.comparisons.find((c) => c.candidate === '行政法');
    expect(gyousei?.merits.length).toBeGreaterThan(0);
    const minso = decisionContext.comparisons.find((c) => c.candidate === '民訴法');
    expect(minso?.demerits.length).toBeGreaterThan(0);
  });

  it('produces exactly one comparison when a single candidate is given explicitly (選択肢1件)', async () => {
    await new AddExternalKnowledgeUseCase(knowledgeRepo, sourceRepo).execute({
      record: { title: '筋トレメモ', content: '休養も大事', capturedAt: '2026-07-01' },
    });

    const useCase = new DecisionEngineUseCase(knowledgeRepo, sourceRepo);
    const { decisionContext } = await useCase.execute({
      question: '筋トレを休む？',
      candidates: ['休む'],
    });

    expect(decisionContext.candidates).toEqual(['休む']);
    expect(decisionContext.comparisons).toHaveLength(1);
  });

  it('reports missingInformation when External Brain is empty (根拠ゼロ)', async () => {
    const useCase = new DecisionEngineUseCase(knowledgeRepo, sourceRepo);
    const { decisionContext } = await useCase.execute({ question: '今日は早く寝るべき？' });

    expect(decisionContext.candidates).toEqual(['実行する', '実行しない']);
    expect(decisionContext.missingInformation.length).toBeGreaterThan(0);
    expect(decisionContext.missingInformation[0]).toContain('External Brainに知識が登録されていません');
  });

  it('always includes a reminder that Owner makes the final decision, never a conclusion', async () => {
    await new AddExternalKnowledgeUseCase(knowledgeRepo, sourceRepo).execute({
      record: { title: 'A', content: '本文', capturedAt: '2026-07-01' },
    });
    const useCase = new DecisionEngineUseCase(knowledgeRepo, sourceRepo);
    const { decisionContext } = await useCase.execute({ question: '今日は早く寝るべき？' });

    expect(decisionContext.pointsForOwnerToDecide[0]).toContain('最終的な判断はOwner自身が行ってください');
    // Systemが結論・推奨を書いていないことの確認（「べき」「おすすめします」等の断定表現を含まない）
    expect(decisionContext.pointsForOwnerToDecide.join('')).not.toMatch(/おすすめします|べきです/);
  });

  it('deduplicates evidence and sources shared across multiple candidates', async () => {
    const { source } = await new AddExternalSourceUseCase(sourceRepo).execute({
      record: { sourceType: 'book', title: '基本書' },
    });
    await new AddExternalKnowledgeUseCase(knowledgeRepo, sourceRepo).execute({
      record: {
        sourceId: source.id,
        title: '行政法と民訴法の比較メモ',
        content: '両方に共通する要件事実の考え方',
        capturedAt: '2026-07-01',
      },
    });

    const useCase = new DecisionEngineUseCase(knowledgeRepo, sourceRepo);
    const { sources, decisionContext } = await useCase.execute({
      question: '行政法と民訴法どちらを優先？',
      candidates: ['行政法', '民訴法'],
    });

    expect(decisionContext.comparisons).toHaveLength(2);
    expect(sources).toHaveLength(1);
  });
});
