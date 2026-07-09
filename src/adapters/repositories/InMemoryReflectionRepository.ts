import type { Reflection } from '../../domain/entities/Reflection.js';
import type { ReflectionRepository } from '../../application/ports/ReflectionRepository.js';

/**
 * InMemoryReflectionRepository
 *
 * プロセス起動中のみ有効な実装。Supabase実装への配線前の
 * 動作確認や、ユニットテストに使う。ADR 0001の通り、Version1の
 * 本番運用ではSupabaseReflectionRepositoryを使う想定。
 */
export class InMemoryReflectionRepository implements ReflectionRepository {
  private readonly store = new Map<string, Reflection>();

  async save(reflection: Reflection): Promise<void> {
    this.store.set(reflection.date, reflection);
  }

  async findByDate(date: string): Promise<Reflection | null> {
    return this.store.get(date) ?? null;
  }

  async findRecent(limit: number): Promise<Reflection[]> {
    return [...this.store.values()]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, limit);
  }
}
