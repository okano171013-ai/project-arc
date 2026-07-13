import { randomUUID } from 'node:crypto';
import { MemoryEntry, type MemoryEntryRecord } from '../../../domain/entities/MemoryEntry.js';
import type { MemoryRepository } from '../../ports/MemoryRepository.js';

export interface AddMemoryEntryInput {
  record: MemoryEntryRecord;
}

export interface AddMemoryEntryOutput {
  entry: MemoryEntry;
}

export class AddMemoryEntryUseCase {
  constructor(private readonly memoryRepository: MemoryRepository) {}

  async execute(input: AddMemoryEntryInput): Promise<AddMemoryEntryOutput> {
    const entry = MemoryEntry.create({ id: randomUUID(), record: input.record });
    await this.memoryRepository.save(entry);
    return { entry };
  }
}
