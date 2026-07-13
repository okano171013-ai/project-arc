import { describe, it, expect, beforeEach } from 'vitest';
import { AddExternalSourceUseCase } from './AddExternalSource.js';
import { ListExternalSourcesUseCase } from './ListExternalSources.js';
import { GetExternalSourceUseCase } from './GetExternalSource.js';
import { UpdateExternalSourceUseCase } from './UpdateExternalSource.js';
import { DeleteExternalSourceUseCase } from './DeleteExternalSource.js';
import { FindDuplicateExternalSourceUseCase } from './FindDuplicateExternalSource.js';
import type { ExternalSourceRepository } from '../../ports/ExternalSourceRepository.js';
import type { ExternalSource } from '../../../domain/entities/ExternalSource.js';

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

describe('ExternalSource use cases', () => {
  let repository: FakeExternalSourceRepository;

  beforeEach(() => {
    repository = new FakeExternalSourceRepository();
  });

  it('adds a new source', async () => {
    const useCase = new AddExternalSourceUseCase(repository);
    const result = await useCase.execute({
      record: { sourceType: 'web', title: '日経新聞記事', url: 'https://example.com/a' },
    });
    expect(result.source.title).toBe('日経新聞記事');
  });

  it('rejects an invalid sourceType', async () => {
    const useCase = new AddExternalSourceUseCase(repository);
    await expect(
      useCase.execute({
        record: { sourceType: 'blog' as never, title: 'テスト' },
      }),
    ).rejects.toThrow(/Invalid sourceType/);
  });

  it('rejects an empty title', async () => {
    const useCase = new AddExternalSourceUseCase(repository);
    await expect(
      useCase.execute({ record: { sourceType: 'web', title: '  ' } }),
    ).rejects.toThrow(/title must not be empty/);
  });

  it('allows a source without a URL (URLがない情報源を排除しない)', async () => {
    const useCase = new AddExternalSourceUseCase(repository);
    const result = await useCase.execute({
      record: { sourceType: 'book', title: '会社法の基礎', author: '〇〇' },
    });
    expect(result.source.url).toBeUndefined();
  });

  it('rejects an invalid publishedAt format', async () => {
    const useCase = new AddExternalSourceUseCase(repository);
    await expect(
      useCase.execute({
        record: { sourceType: 'book', title: 'テスト', publishedAt: '2026/07/13' },
      }),
    ).rejects.toThrow(/Invalid date format/);
  });

  it('lists sources, gets by id, updates, and deletes', async () => {
    const addUseCase = new AddExternalSourceUseCase(repository);
    const { source } = await addUseCase.execute({
      record: { sourceType: 'web', title: '元タイトル', url: 'https://example.com/b' },
    });

    const { sources } = await new ListExternalSourcesUseCase(repository).execute();
    expect(sources).toHaveLength(1);

    const { source: fetched } = await new GetExternalSourceUseCase(repository).execute({
      id: source.id,
    });
    expect(fetched?.title).toBe('元タイトル');

    const { source: updated } = await new UpdateExternalSourceUseCase(repository).execute({
      id: source.id,
      changes: { title: '更新後タイトル' },
    });
    expect(updated.title).toBe('更新後タイトル');

    await new DeleteExternalSourceUseCase(repository).execute({ id: source.id });
    const { sources: afterDelete } = await new ListExternalSourcesUseCase(repository).execute();
    expect(afterDelete).toHaveLength(0);
  });

  it('detects duplicate by URL without merging or blocking', async () => {
    const addUseCase = new AddExternalSourceUseCase(repository);
    await addUseCase.execute({
      record: { sourceType: 'web', title: '記事A', url: 'https://example.com/dup' },
    });

    const { duplicates } = await new FindDuplicateExternalSourceUseCase(repository).execute({
      url: 'https://example.com/dup',
    });
    expect(duplicates).toHaveLength(1);

    // 重複があっても新規登録は妨げられない（Systemは統合・上書きしない）
    const result = await addUseCase.execute({
      record: { sourceType: 'web', title: '記事A（再登録）', url: 'https://example.com/dup' },
    });
    expect(result.source).toBeDefined();
    const { sources } = await new ListExternalSourcesUseCase(repository).execute();
    expect(sources).toHaveLength(2);
  });

  it('keeps existing field values when changes carries them as undefined ("変更なし"のCLI入力を再現)', async () => {
    const addUseCase = new AddExternalSourceUseCase(repository);
    const { source } = await addUseCase.execute({
      record: {
        sourceType: 'book',
        title: '元タイトル',
        author: '元の著者',
        publisher: '元の発行元',
      },
    });

    const { source: updated } = await new UpdateExternalSourceUseCase(repository).execute({
      id: source.id,
      changes: { title: '新タイトル', author: undefined, publisher: undefined },
    });

    expect(updated.title).toBe('新タイトル');
    expect(updated.record.author).toBe('元の著者');
    expect(updated.record.publisher).toBe('元の発行元');
  });

  it('detects duplicate by identifier', async () => {
    const addUseCase = new AddExternalSourceUseCase(repository);
    await addUseCase.execute({
      record: { sourceType: 'book', title: '書籍A', identifier: 'ISBN-1234567890' },
    });
    const { duplicates } = await new FindDuplicateExternalSourceUseCase(repository).execute({
      identifier: 'ISBN-1234567890',
    });
    expect(duplicates).toHaveLength(1);
  });
});
