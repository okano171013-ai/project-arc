import type { MemoryEntry, MemoryCategory } from '../../../domain/entities/MemoryEntry.js';
import type { MemoryRepository } from '../../ports/MemoryRepository.js';

export interface UpdateMemoryEntryInput {
  id: string;
  changes: {
    category?: MemoryCategory;
    title?: string;
    content?: string;
    tags?: string[];
  };
}

export interface UpdateMemoryEntryOutput {
  entry: MemoryEntry;
}

export class UpdateMemoryEntryUseCase {
  constructor(private readonly memoryRepository: MemoryRepository) {}

  async execute(input: UpdateMemoryEntryInput): Promise<UpdateMemoryEntryOutput> {
    const entry = await this.memoryRepository.findById(input.id);
    if (!entry) {
      throw new Error(`MemoryEntry not found: ${input.id}`);
    }
    entry.update(input.changes);
    await this.memoryRepository.save(entry);
    return { entry };
  }
}
