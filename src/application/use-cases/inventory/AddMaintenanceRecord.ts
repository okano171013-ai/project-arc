import type { InventoryItem, MaintenanceRecord } from '../../../domain/entities/InventoryItem.js';
import type { InventoryRepository } from '../../ports/InventoryRepository.js';

export interface AddMaintenanceRecordInput {
  id: string;
  record: MaintenanceRecord;
}

export interface AddMaintenanceRecordOutput {
  item: InventoryItem;
}

export class AddMaintenanceRecordUseCase {
  constructor(private readonly inventoryRepository: InventoryRepository) {}

  async execute(input: AddMaintenanceRecordInput): Promise<AddMaintenanceRecordOutput> {
    const item = await this.inventoryRepository.findById(input.id);
    if (!item) {
      throw new Error(`InventoryItem not found: ${input.id}`);
    }

    item.addMaintenanceRecord(input.record);
    await this.inventoryRepository.save(item);

    return { item };
  }
}
