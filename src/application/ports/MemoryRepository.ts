import type { MemoryEntry } from '../../domain/entities/MemoryEntry.js';

/**
 * MemoryRepository（ポート）
 *
 * ADR 0005に基づき、ReflectionRepositoryとは意図的に分離する。
 */
export interface MemoryRepository {
  save(entry: MemoryEntry): Promise<void>;
  findAll(): Promise<MemoryEntry[]>;
  findById(id: string): Promise<MemoryEntry | null>;
  delete(id: string): Promise<void>;
}
