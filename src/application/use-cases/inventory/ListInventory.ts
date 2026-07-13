import type { InventoryItem, InventoryCategory } from '../../../domain/entities/InventoryItem.js';
import type { InventoryRepository } from '../../ports/InventoryRepository.js';

export interface ListInventoryInput {
  /** 指定時はカテゴリで絞り込む。未指定なら全件返す。 */
  category?: InventoryCategory;
}

export interface ListInventoryOutput {
  items: InventoryItem[];
}

export class ListInventoryUseCase {
  constructor(private readonly inventoryRepository: InventoryRepository) {}

  async execute(input: ListInventoryInput = {}): Promise<ListInventoryOutput> {
    const all = await this.inventoryRepository.findAll();
    const items = input.category
      ? all.filter((item) => item.category === input.category)
      : all;

    return { items };
  }
}
