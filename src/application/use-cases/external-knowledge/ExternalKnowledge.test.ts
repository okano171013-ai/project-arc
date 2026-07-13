import { describe, it, expect, beforeEach } from 'vitest';
import { AddExternalKnowledgeUseCase } from './AddExternalKnowledge.js';
import { ListExternalKnowledgeUseCase } from './ListExternalKnowledge.js';
import { GetExternalKnowledgeUseCase } from './GetExternalKnowledge.js';
import { UpdateExternalKnowledgeUseCase } from './UpdateExternalKnowledge.js';
import { DeleteExternalKnowledgeUseCase } from './DeleteExternalKnowledge.js';
import { SearchExternalKnowledgeUseCase } from './SearchExternalKnowledge.js';
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

describe('ExternalKnowledge use cases', () => {
  let knowledgeRepo: FakeExternalKnowledgeRepository;
  let sourceRepo: FakeExternalSourceRepository;

  beforeEach(() => {
    knowledgeRepo = new FakeExternalKnowledgeRepository();
    sourceRepo = new FakeExternalSourceRepository();
  });

  it('adds knowledge without a source (出典不明でも登録できる)', async () => {
    const useCase = new AddExternalKnowledgeUseCase(knowledgeRepo, sourceRepo);
    const result = await useCase.execute({
      record: {
        title: '会社法メモ',
        content: '株主総会の招集通知は原則2週間前まで',
        capturedAt: '2026-07-13',
      },
    });
    expect(result.knowledge.sourceId).toBeUndefined();
    expect(result.knowledge.record.status).toBe('inbox');
    expect(result.knowledge.record.confidence).toBe('unassessed');
  });

  it('rejects a sourceId that does not exist (孤立した参照を作らない)', async () => {
    const useCase = new AddExternalKnowledgeUseCase(knowledgeRepo, sourceRepo);
    await expect(
      useCase.execute({
        record: {
          sourceId: 'does-not-exist',
          title: 'テスト',
          content: '本文',
          capturedAt: '2026-07-13',
        },
      }),
    ).rejects.toThrow(/ExternalSource not found/);
  });

  it('accepts a valid sourceId', async () => {
    const { source } = await new AddExternalSourceUseCase(sourceRepo).execute({
      record: { sourceType: 'web', title: '記事', url: 'https://example.com' },
    });
    const useCase = new AddExternalKnowledgeUseCase(knowledgeRepo, sourceRepo);
    const result = await useCase.execute({
      record: {
        sourceId: source.id,
        title: '知識A',
        content: '本文A',
        capturedAt: '2026-07-13',
      },
    });
    expect(result.knowledge.sourceId).toBe(source.id);
  });

  it('rejects empty title/content', async () => {
    const useCase = new AddExternalKnowledgeUseCase(knowledgeRepo, sourceRepo);
    await expect(
      useCase.execute({ record: { title: '  ', content: '本文', capturedAt: '2026-07-13' } }),
    ).rejects.toThrow(/title must not be empty/);
    await expect(
      useCase.execute({ record: { title: 'タイトル', content: '  ', capturedAt: '2026-07-13' } }),
    ).rejects.toThrow(/content must not be empty/);
  });

  it('normalizes topics/tags (trim, dedupe)', async () => {
    const useCase = new AddExternalKnowledgeUseCase(knowledgeRepo, sourceRepo);
    const result = await useCase.execute({
      record: {
        title: 'タイトル',
        content: '本文',
        capturedAt: '2026-07-13',
        topics: [' 法律 ', '法律', '経済'],
        tags: ['a', 'a', ' b '],
      },
    });
    expect(result.knowledge.record.topics).toEqual(['法律', '経済']);
    expect(result.knowledge.record.tags).toEqual(['a', 'b']);
  });

  it('lists filtered by status, updates status via review/archive, and deletes', async () => {
    const addUseCase = new AddExternalKnowledgeUseCase(knowledgeRepo, sourceRepo);
    const { knowledge } = await addUseCase.execute({
      record: { title: 'A', content: '本文A', capturedAt: '2026-07-01' },
    });
    await addUseCase.execute({
      record: { title: 'B', content: '本文B', capturedAt: '2026-07-02' },
    });

    const { knowledge: inboxOnly } = await new ListExternalKnowledgeUseCase(
      knowledgeRepo,
    ).execute({ status: 'inbox' });
    expect(inboxOnly).toHaveLength(2);

    const updateUseCase = new UpdateExternalKnowledgeUseCase(knowledgeRepo, sourceRepo);
    const { knowledge: reviewed } = await updateUseCase.execute({
      id: knowledge.id,
      changes: { status: 'reviewed' },
    });
    expect(reviewed.status).toBe('reviewed');

    const { knowledge: archived } = await updateUseCase.execute({
      id: knowledge.id,
      changes: { status: 'archived' },
    });
    expect(archived.status).toBe('archived');

    const { knowledge: fetched } = await new GetExternalKnowledgeUseCase(knowledgeRepo).execute({
      id: knowledge.id,
    });
    expect(fetched?.status).toBe('archived');

    await new DeleteExternalKnowledgeUseCase(knowledgeRepo).execute({ id: knowledge.id });
    const { knowledge: afterDelete } = await new ListExternalKnowledgeUseCase(
      knowledgeRepo,
    ).execute();
    expect(afterDelete).toHaveLength(1);
  });

  it('keeps existing field values when changes carries them as undefined ("変更なし"のCLI入力を再現)', async () => {
    const addUseCase = new AddExternalKnowledgeUseCase(knowledgeRepo, sourceRepo);
    const { knowledge } = await addUseCase.execute({
      record: {
        title: '元タイトル',
        content: '元の内容',
        ownerSummary: '元の要約',
        topics: ['法律'],
        tags: ['メモ'],
        capturedAt: '2026-07-13',
      },
    });

    // CLIの「Enterで変更なし」は `content: newContent || undefined` のように
    // 明示的にundefinedを渡す。この形のchangesで既存値が消えないことを確認する。
    const updateUseCase = new UpdateExternalKnowledgeUseCase(knowledgeRepo, sourceRepo);
    const { knowledge: updated } = await updateUseCase.execute({
      id: knowledge.id,
      changes: {
        title: '新タイトル',
        content: undefined,
        ownerSummary: undefined,
        topics: undefined,
        tags: undefined,
      },
    });

    expect(updated.title).toBe('新タイトル');
    expect(updated.record.content).toBe('元の内容');
    expect(updated.record.ownerSummary).toBe('元の要約');
    expect(updated.record.topics).toEqual(['法律']);
    expect(updated.record.tags).toEqual(['メモ']);
  });
});

describe('SearchExternalKnowledge', () => {
  let knowledgeRepo: FakeExternalKnowledgeRepository;
  let sourceRepo: FakeExternalSourceRepository;

  beforeEach(() => {
    knowledgeRepo = new FakeExternalKnowledgeRepository();
    sourceRepo = new FakeExternalSourceRepository();
  });

  it('matches across ExternalKnowledge fields, case-insensitively', async () => {
    await new AddExternalKnowledgeUseCase(knowledgeRepo, sourceRepo).execute({
      record: {
        title: '会社法メモ',
        content: '株主総会の招集通知について',
        capturedAt: '2026-07-13',
      },
    });
    const { results } = await new SearchExternalKnowledgeUseCase(
      knowledgeRepo,
      sourceRepo,
    ).execute({ query: '株主総会' });
    expect(results).toHaveLength(1);
    expect(results[0]?.matchedIn).toContain('content');
  });

  it('matches related ExternalSource fields', async () => {
    const { source } = await new AddExternalSourceUseCase(sourceRepo).execute({
      record: { sourceType: 'news', title: '日経新聞', publisher: '日本経済新聞社' },
    });
    await new AddExternalKnowledgeUseCase(knowledgeRepo, sourceRepo).execute({
      record: { sourceId: source.id, title: 'ニュースメモ', content: '内容', capturedAt: '2026-07-13' },
    });
    const { results } = await new SearchExternalKnowledgeUseCase(
      knowledgeRepo,
      sourceRepo,
    ).execute({ query: '日本経済新聞社' });
    expect(results).toHaveLength(1);
    expect(results[0]?.matchedIn).toContain('source.publisher');
  });

  it('treats an empty query as "all" (空の検索語は全件表示、ADR 0014)', async () => {
    await new AddExternalKnowledgeUseCase(knowledgeRepo, sourceRepo).execute({
      record: { title: 'A', content: '本文', capturedAt: '2026-07-13' },
    });
    const { results } = await new SearchExternalKnowledgeUseCase(
      knowledgeRepo,
      sourceRepo,
    ).execute({});
    expect(results).toHaveLength(1);
  });

  it('filters by status in addition to query', async () => {
    const addUseCase = new AddExternalKnowledgeUseCase(knowledgeRepo, sourceRepo);
    const { knowledge } = await addUseCase.execute({
      record: { title: '会社法A', content: '本文', capturedAt: '2026-07-13' },
    });
    await addUseCase.execute({
      record: { title: '会社法B', content: '本文', capturedAt: '2026-07-13' },
    });
    await new UpdateExternalKnowledgeUseCase(knowledgeRepo, sourceRepo).execute({
      id: knowledge.id,
      changes: { status: 'archived' },
    });

    const { results } = await new SearchExternalKnowledgeUseCase(
      knowledgeRepo,
      sourceRepo,
    ).execute({ query: '会社法', status: 'inbox' });
    expect(results).toHaveLength(1);
    expect(results[0]?.knowledge.title).toBe('会社法B');
  });

  it('returns no results when nothing matches', async () => {
    await new AddExternalKnowledgeUseCase(knowledgeRepo, sourceRepo).execute({
      record: { title: 'A', content: '本文', capturedAt: '2026-07-13' },
    });
    const { results } = await new SearchExternalKnowledgeUseCase(
      knowledgeRepo,
      sourceRepo,
    ).execute({ query: '存在しないキーワード' });
    expect(results).toHaveLength(0);
  });
});
