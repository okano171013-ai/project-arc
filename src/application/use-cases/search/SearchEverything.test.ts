import { describe, it, expect, beforeEach } from 'vitest';
import { SearchEverythingUseCase } from './SearchEverything.js';
import { AddMemoryEntryUseCase } from '../memory/AddMemoryEntry.js';
import { AddInventoryItemUseCase } from '../inventory/AddInventoryItem.js';
import type { MemoryRepository } from '../../ports/MemoryRepository.js';
import type { InventoryRepository } from '../../ports/InventoryRepository.js';
import type { MemoryEntry } from '../../../domain/entities/MemoryEntry.js';
import type { InventoryItem } from '../../../domain/entities/InventoryItem.js';

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

class FakeInventoryRepository implements InventoryRepository {
  private store = new Map<string, InventoryItem>();
  async save(item: InventoryItem): Promise<void> {
    this.store.set(item.id, item);
  }
  async findAll(): Promise<InventoryItem[]> {
    return [...this.store.values()];
  }
  async findById(id: string): Promise<InventoryItem | null> {
    return this.store.get(id) ?? null;
  }
}

describe('SearchEverythingUseCase', () => {
  let memoryRepository: FakeMemoryRepository;
  let inventoryRepository: FakeInventoryRepository;

  beforeEach(() => {
    memoryRepository = new FakeMemoryRepository();
    inventoryRepository = new FakeInventoryRepository();
  });

  it('returns matches from both Memory and Inventory', async () => {
    await new AddMemoryEntryUseCase(memoryRepository).execute({
      record: { category: 'Assets', title: 'シェーバー', content: 'PHILIPS 5000 Series' },
    });
    await new AddInventoryItemUseCase(inventoryRepository).execute({
      record: { name: '長財布', category: '財布', usage: 'シェーバー入れではない' },
    });

    const useCase = new SearchEverythingUseCase(memoryRepository, inventoryRepository);
    const result = await useCase.execute({ query: 'シェーバー' });

    expect(result.results).toHaveLength(2);
    expect(result.results.some((r) => r.source === 'memory')).toBe(true);
    expect(result.results.some((r) => r.source === 'inventory')).toBe(true);
  });

  it('returns an empty array for an empty query', async () => {
    const useCase = new SearchEverythingUseCase(memoryRepository, inventoryRepository);
    const result = await useCase.execute({ query: '   ' });
    expect(result.results).toHaveLength(0);
  });

  it('returns an empty array when nothing matches', async () => {
    await new AddMemoryEntryUseCase(memoryRepository).execute({
      record: { category: 'Misc', title: 'アイテム', content: '内容' },
    });

    const useCase = new SearchEverythingUseCase(memoryRepository, inventoryRepository);
    const result = await useCase.execute({ query: '存在しないキーワード' });

    expect(result.results).toHaveLength(0);
  });
});
