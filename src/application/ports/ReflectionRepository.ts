import type { Reflection } from '../../domain/entities/Reflection.js';

/**
 * ReflectionRepository（ポート）
 *
 * Application層はこのインターフェースにのみ依存する。実装
 * （SQLite/Supabase/InMemory等）はAdapters層で提供する
 * （依存性逆転の原則 / docs/principles.md Principle 8）。
 */
export interface ReflectionRepository {
  save(reflection: Reflection): Promise<void>;
  findByDate(date: string): Promise<Reflection | null>;
  findRecent(limit: number): Promise<Reflection[]>;
}
