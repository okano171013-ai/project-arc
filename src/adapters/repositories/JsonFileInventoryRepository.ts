import {
  InventoryItem,
  type InventoryItemRecord,
  type MaintenanceRecord,
} from '../../domain/entities/InventoryItem.js';
import type { InventoryRepository } from '../../application/ports/InventoryRepository.js';
import { readJsonArray, writeJsonArray } from '../../infrastructure/db/jsonStore.js';

interface InventoryFileRow {
  id: string;
  record: InventoryItemRecord;
  maintenanceHistory: MaintenanceRecord[];
  createdAt: string;
  updatedAt: string;
}

/**
 * JsonFileInventoryRepository
 *
 * ADR 0003に基づくVersion2の既定実装。`data/inventory.json`に
 * 配列として保存する。Version3でメンテナンス履歴（複数件）と
 * 購入情報・状態・用途・交換目安を追加保存するようになった。
 */
export class JsonFileInventoryRepository implements InventoryRepository {
  constructor(private readonly filePath: string = 'data/inventory.json') {}

  async save(item: InventoryItem): Promise<void> {
    const rows = await readJsonArray<InventoryFileRow>(this.filePath);
    const withoutExisting = rows.filter((row) => row.id !== item.id);
    withoutExisting.push({
      id: item.id,
      record: {
        name: item.name,
        category: item.category,
        note: item.note,
        purchaseDate: item.purchaseDate,
        purchasePrice: item.purchasePrice,
        condition: item.condition,
        usage: item.usage,
        replacementIntervalMonths: item.replacementIntervalMonths,
        photoPath: item.photoPath,
      },
      maintenanceHistory: [...item.maintenanceHistory],
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    });
    await writeJsonArray(this.filePath, withoutExisting);
  }

  async findAll(): Promise<InventoryItem[]> {
    const rows = await readJsonArray<InventoryFileRow>(this.filePath);
    return rows
      .sort((a, b) => a.record.category.localeCompare(b.record.category, 'ja'))
      .map((row) => this.toDomain(row));
  }

  async findById(id: string): Promise<InventoryItem | null> {
    const rows = await readJsonArray<InventoryFileRow>(this.filePath);
    const row = rows.find((r) => r.id === id);
    return row ? this.toDomain(row) : null;
  }

  private toDomain(row: InventoryFileRow): InventoryItem {
    return InventoryItem.restore({
      id: row.id,
      record: row.record,
      maintenanceHistory: row.maintenanceHistory ?? [],
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
  }
}
