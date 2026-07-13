import type { MemoryRepository } from '../../ports/MemoryRepository.js';
import type { InventoryRepository } from '../../ports/InventoryRepository.js';
import type { MemoryEntry } from '../../../domain/entities/MemoryEntry.js';
import type { InventoryItem } from '../../../domain/entities/InventoryItem.js';

export interface SearchEverythingInput {
  query: string;
}

export type SearchResult =
  | { source: 'memory'; entry: MemoryEntry }
  | { source: 'inventory'; item: InventoryItem };

export interface SearchEverythingOutput {
  results: SearchResult[];
}

/**
 * SearchEverythingUseCase
 *
 * ADR 0005に基づき、検索対象はMemoryとLife Inventoryのみ
 * （Reflection・Appearance Logは対象外）。「あれ何使ってた？」に
 * 即答することが目的であり、日々の記録の全文検索ではないため。
 */
export class SearchEverythingUseCase {
  constructor(
    private readonly memoryRepository: MemoryRepository,
    private readonly inventoryRepository: InventoryRepository,
  ) {}

  async execute(input: SearchEverythingInput): Promise<SearchEverythingOutput> {
    const query = input.query.trim();
    if (!query) {
      return { results: [] };
    }

    const [memoryEntries, inventoryItems] = await Promise.all([
      this.memoryRepository.findAll(),
      this.inventoryRepository.findAll(),
    ]);

    const results: SearchResult[] = [
      ...memoryEntries
        .filter((entry) => entry.matches(query))
        .map((entry): SearchResult => ({ source: 'memory', entry })),
      ...inventoryItems
        .filter((item) => item.matches(query))
        .map((item): SearchResult => ({ source: 'inventory', item })),
    ];

    return { results };
  }
}
