import { describe, it, expect, beforeEach } from 'vitest';
import { AddMemoryEntryUseCase } from './AddMemoryEntry.js';
import { ListMemoryEntriesUseCase } from './ListMemoryEntries.js';
import { UpdateMemoryEntryUseCase } from './UpdateMemoryEntry.js';
import { DeleteMemoryEntryUseCase } from './DeleteMemoryEntry.js';
import type { MemoryRepository } from '../../ports/MemoryRepository.js';
import type { MemoryEntry } from '../../../domain/entities/MemoryEntry.js';

class FakeMemoryRepository implements MemoryRepository {
  private store = new Map<string, MemoryEntry>();

  async save(entry: MemoryEntry): Promise<void> {
    this.store.set(entry.id, entry);
  }

  async findAll(): Promise<MemoryEntry[]> {
    return [...this.store.values()];
  }

  async findById(id: string): Promise<MemoryEntry | null> {
    return this.store.get(id) ?? null;
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}

describe('Memory use cases', () => {
  let repository: FakeMemoryRepository;

  beforeEach(() => {
    repository = new FakeMemoryRepository();
  });

  it('adds a new memory entry', async () => {
    const useCase = new AddMemoryEntryUseCase(repository);
    const result = await useCase.execute({
      record: { category: 'Assets', title: 'シェーバー', content: 'PHILIPS 5000 Series' },
    });

    expect(result.entry.title).toBe('シェーバー');
    expect(result.entry.category).toBe('Assets');
  });

  it('rejects an empty title', async () => {
    const useCase = new AddMemoryEntryUseCase(repository);
    await expect(
      useCase.execute({ record: { category: 'Misc', title: '  ', content: 'x' } }),
    ).rejects.toThrow(/title must not be empty/);
  });

  it('lists entries filtered by category', async () => {
    const addUseCase = new AddMemoryEntryUseCase(repository);
    await addUseCase.execute({
      record: { category: 'Assets', title: 'シェーバー', content: 'PHILIPS 5000 Series' },
    });
    await addUseCase.execute({
      record: { category: 'Goals', title: '予備試験', content: '今年合格' },
    });

    const listUseCase = new ListMemoryEntriesUseCase(repository);
    const result = await listUseCase.execute({ category: 'Goals' });

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.title).toBe('予備試験');
  });

  it('updates an existing entry', async () => {
    const addUseCase = new AddMemoryEntryUseCase(repository);
    const { entry } = await addUseCase.execute({
      record: { category: 'Assets', title: 'シェーバー', content: '旧モデル' },
    });

    const updateUseCase = new UpdateMemoryEntryUseCase(repository);
    const result = await updateUseCase.execute({
      id: entry.id,
      changes: { content: 'PHILIPS 5000 Series' },
    });

    expect(result.entry.content).toBe('PHILIPS 5000 Series');
    expect(result.entry.title).toBe('シェーバー'); // 変更していないフィールドは維持
  });

  it('throws when updating a non-existent entry', async () => {
    const updateUseCase = new UpdateMemoryEntryUseCase(repository);
    await expect(
      updateUseCase.execute({ id: 'unknown', changes: { title: 'x' } }),
    ).rejects.toThrow(/not found/);
  });

  it('deletes an entry', async () => {
    const addUseCase = new AddMemoryEntryUseCase(repository);
    const { entry } = await addUseCase.execute({
      record: { category: 'Misc', title: 'テスト', content: 'x' },
    });

    const deleteUseCase = new DeleteMemoryEntryUseCase(repository);
    await deleteUseCase.execute({ id: entry.id });

    const all = await repository.findAll();
    expect(all).toHaveLength(0);
  });

  it('throws when deleting a non-existent entry', async () => {
    const deleteUseCase = new DeleteMemoryEntryUseCase(repository);
    await expect(deleteUseCase.execute({ id: 'unknown' })).rejects.toThrow(/not found/);
  });

  it('matches queries against title, content, and tags (case-insensitive)', async () => {
    const addUseCase = new AddMemoryEntryUseCase(repository);
    const { entry } = await addUseCase.execute({
      record: {
        category: 'Assets',
        title: 'シェーバー',
        content: 'PHILIPS 5000 Series',
        tags: ['electric'],
      },
    });

    expect(entry.matches('philips')).toBe(true);
    expect(entry.matches('シェーバー')).toBe(true);
    expect(entry.matches('electric')).toBe(true);
    expect(entry.matches('存在しない')).toBe(false);
  });
});
