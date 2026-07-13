import type { InventoryItem } from '../../domain/entities/InventoryItem.js';

/**
 * InventoryRepository（ポート）
 *
 * ReflectionRepositoryと同じ設計方針（Principle 8: 依存性逆転）。
 */
export interface InventoryRepository {
  save(item: InventoryItem): Promise<void>;
  findAll(): Promise<InventoryItem[]>;
  findById(id: string): Promise<InventoryItem | null>;
}
