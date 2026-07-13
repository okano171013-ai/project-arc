import type { MemoryEntry, MemoryCategory } from '../../../domain/entities/MemoryEntry.js';
import type { MemoryRepository } from '../../ports/MemoryRepository.js';

export interface ListMemoryEntriesInput {
  category?: MemoryCategory;
}

export interface ListMemoryEntriesOutput {
  entries: MemoryEntry[];
}

export class ListMemoryEntriesUseCase {
  constructor(private readonly memoryRepository: MemoryRepository) {}

  async execute(input: ListMemoryEntriesInput = {}): Promise<ListMemoryEntriesOutput> {
    const all = await this.memoryRepository.findAll();
    const entries = input.category ? all.filter((e) => e.category === input.category) : all;
    return { entries };
  }
}
