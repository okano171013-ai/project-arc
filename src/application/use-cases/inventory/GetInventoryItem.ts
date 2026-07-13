import type { InventoryItem } from '../../../domain/entities/InventoryItem.js';
import type { InventoryRepository } from '../../ports/InventoryRepository.js';

export interface GetInventoryItemInput {
  id: string;
}

export interface GetInventoryItemOutput {
  item: InventoryItem | null;
}

export class GetInventoryItemUseCase {
  constructor(private readonly inventoryRepository: InventoryRepository) {}

  async execute(input: GetInventoryItemInput): Promise<GetInventoryItemOutput> {
    const item = await this.inventoryRepository.findById(input.id);
    return { item };
  }
}
