import type {
  InventoryItem,
  InventoryCategory,
  ItemCondition,
} from '../../../domain/entities/InventoryItem.js';
import type { InventoryRepository } from '../../ports/InventoryRepository.js';

export interface UpdateInventoryItemInput {
  id: string;
  changes: {
    name?: string;
    category?: InventoryCategory;
    note?: string;
    purchaseDate?: string;
    purchasePrice?: number;
    condition?: ItemCondition;
    usage?: string;
    replacementIntervalMonths?: number;
    photoPath?: string;
  };
}

export interface UpdateInventoryItemOutput {
  item: InventoryItem;
}

export class UpdateInventoryItemUseCase {
  constructor(private readonly inventoryRepository: InventoryRepository) {}

  async execute(input: UpdateInventoryItemInput): Promise<UpdateInventoryItemOutput> {
    const item = await this.inventoryRepository.findById(input.id);
    if (!item) {
      throw new Error(`InventoryItem not found: ${input.id}`);
    }

    item.update(input.changes);
    await this.inventoryRepository.save(item);

    return { item };
  }
}
