import type { MemoryRepository } from '../../ports/MemoryRepository.js';

export interface DeleteMemoryEntryInput {
  id: string;
}

export class DeleteMemoryEntryUseCase {
  constructor(private readonly memoryRepository: MemoryRepository) {}

  async execute(input: DeleteMemoryEntryInput): Promise<void> {
    const entry = await this.memoryRepository.findById(input.id);
    if (!entry) {
      throw new Error(`MemoryEntry not found: ${input.id}`);
    }
    await this.memoryRepository.delete(input.id);
  }
}
