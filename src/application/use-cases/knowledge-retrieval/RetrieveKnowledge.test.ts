import { describe, it, expect, beforeEach } from 'vitest';
import { RetrieveKnowledgeUseCase } from './RetrieveKnowledge.js';
import { buildRetrievalContext } from './BuildRetrievalContext.js';
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

describe('RetrieveKnowledge', () => {
  let knowledgeRepo: FakeExternalKnowledgeRepository;
  let sourceRepo: FakeExternalSourceRepository;

  beforeEach(() => {
    knowledgeRepo = new FakeExternalKnowledgeRepository();
    sourceRepo = new FakeExternalSourceRepository();
  });

  it('returns all knowledge sorted by capturedAt desc when no query/tags/topics given', async () => {
    const addKnowledge = new AddExternalKnowledgeUseCase(knowledgeRepo, sourceRepo);
    await addKnowledge.execute({ record: { title: 'A', content: '本文A', capturedAt: '2026-07-01' } });
    await addKnowledge.execute({ record: { title: 'B', content: '本文B', capturedAt: '2026-07-10' } });

    const { results } = await new RetrieveKnowledgeUseCase(knowledgeRepo, sourceRepo).execute();
    expect(results.map((r) => r.knowledge.title)).toEqual(['B', 'A']);
    expect(results.every((r) => r.score === 0)).toBe(true);
  });

  it('scores a title match higher than a content-only match, and ranks accordingly', async () => {
    const addKnowledge = new AddExternalKnowledgeUseCase(knowledgeRepo, sourceRepo);
    await addKnowledge.execute({
      record: { title: '無関係', content: '処分性についての言及がここにある', capturedAt: '2026-07-01' },
    });
    await addKnowledge.execute({
      record: { title: '行政法の処分性', content: '本文', capturedAt: '2026-06-01' },
    });

    const { results } = await new RetrieveKnowledgeUseCase(knowledgeRepo, sourceRepo).execute({
      query: '処分性',
    });
    expect(results).toHaveLength(2);
    expect(results[0]?.knowledge.title).toBe('行政法の処分性');
    expect(results[0]!.score).toBeGreaterThan(results[1]!.score);
    expect(results[0]?.matchedIn).toContain('title');
    expect(results[1]?.matchedIn).toContain('content');
  });

  it('filters by tags/topics overlap when no query is given (OR signal, not AND)', async () => {
    const addKnowledge = new AddExternalKnowledgeUseCase(knowledgeRepo, sourceRepo);
    await addKnowledge.execute({
      record: { title: 'A', content: '本文', capturedAt: '2026-07-01', tags: ['司法試験'] },
    });
    await addKnowledge.execute({
      record: { title: 'B', content: '本文', capturedAt: '2026-07-02', tags: ['料理'] },
    });

    const { results } = await new RetrieveKnowledgeUseCase(knowledgeRepo, sourceRepo).execute({
      tags: ['司法試験'],
    });
    expect(results).toHaveLength(1);
    expect(results[0]?.knowledge.title).toBe('A');
  });

  it('returns no results when nothing matches the query', async () => {
    await new AddExternalKnowledgeUseCase(knowledgeRepo, sourceRepo).execute({
      record: { title: 'A', content: '本文', capturedAt: '2026-07-01' },
    });
    const { results } = await new RetrieveKnowledgeUseCase(knowledgeRepo, sourceRepo).execute({
      query: '存在しないキーワード',
    });
    expect(results).toHaveLength(0);
  });

  it('respects limit (既定10件より小さい値を指定できる)', async () => {
    const addKnowledge = new AddExternalKnowledgeUseCase(knowledgeRepo, sourceRepo);
    for (let i = 1; i <= 5; i++) {
      await addKnowledge.execute({
        record: { title: `#${i}`, content: '本文', capturedAt: `2026-07-0${i}` },
      });
    }
    const { results } = await new RetrieveKnowledgeUseCase(knowledgeRepo, sourceRepo).execute({
      limit: 2,
    });
    expect(results).toHaveLength(2);
  });

  it('deduplicates sources referenced by multiple retrieved knowledge entries', async () => {
    const { source } = await new AddExternalSourceUseCase(sourceRepo).execute({
      record: { sourceType: 'news', title: '日経新聞' },
    });
    const addKnowledge = new AddExternalKnowledgeUseCase(knowledgeRepo, sourceRepo);
    await addKnowledge.execute({
      record: { sourceId: source.id, title: '会社法記事A', content: '本文A', capturedAt: '2026-07-01' },
    });
    await addKnowledge.execute({
      record: { sourceId: source.id, title: '会社法記事B', content: '本文B', capturedAt: '2026-07-02' },
    });

    const { results, sources } = await new RetrieveKnowledgeUseCase(knowledgeRepo, sourceRepo).execute();
    expect(results).toHaveLength(2);
    expect(sources).toHaveLength(1);
    expect(sources[0]?.id).toBe(source.id);
  });
});

describe('buildRetrievalContext', () => {
  let knowledgeRepo: FakeExternalKnowledgeRepository;
  let sourceRepo: FakeExternalSourceRepository;

  beforeEach(() => {
    knowledgeRepo = new FakeExternalKnowledgeRepository();
    sourceRepo = new FakeExternalSourceRepository();
  });

  it('returns a placeholder message when there are no results', () => {
    expect(buildRetrievalContext([])).toContain('見つかりませんでした');
  });

  it('formats a citation block with source/date/content but never generates ARC-side reasoning', async () => {
    const { source } = await new AddExternalSourceUseCase(sourceRepo).execute({
      record: { sourceType: 'lecture', title: '〇〇先生の講義' },
    });
    await new AddExternalKnowledgeUseCase(knowledgeRepo, sourceRepo).execute({
      record: {
        sourceId: source.id,
        title: '処分性メモ',
        content: '処分性は〜',
        capturedAt: '2026-07-13',
      },
    });

    const { results } = await new RetrieveKnowledgeUseCase(knowledgeRepo, sourceRepo).execute();
    const context = buildRetrievalContext(results);

    expect(context).toContain('【External Brain】');
    expect(context).toContain('〇〇先生の講義');
    expect(context).toContain('2026-07-13');
    expect(context).toContain('処分性は〜');
    // Context BuilderはARCの推論部分を生成しない（ADR 0021）
    expect(context).not.toContain('【ARC】');
  });
});
