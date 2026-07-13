import { randomUUID } from 'node:crypto';
import { InventoryItem, type InventoryItemRecord } from '../../../domain/entities/InventoryItem.js';
import type { InventoryRepository } from '../../ports/InventoryRepository.js';

export interface AddInventoryItemInput {
  record: InventoryItemRecord;
}

export interface AddInventoryItemOutput {
  item: InventoryItem;
}

export class AddInventoryItemUseCase {
  constructor(private readonly inventoryRepository: InventoryRepository) {}

  async execute(input: AddInventoryItemInput): Promise<AddInventoryItemOutput> {
    const item = InventoryItem.create({
      id: randomUUID(),
      record: input.record,
    });

    await this.inventoryRepository.save(item);

    return { item };
  }
}
