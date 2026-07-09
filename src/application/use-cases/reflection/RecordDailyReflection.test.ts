import { describe, it, expect, beforeEach } from 'vitest';
import { RecordDailyReflectionUseCase } from './RecordDailyReflection.js';
import type { ReflectionRepository } from '../../ports/ReflectionRepository.js';
import type { Reflection } from '../../../domain/entities/Reflection.js';

/**
 * テスト用のInMemory実装。Adapters層に置くべきだが、テスト専用のため
 * ここではローカルで完結させる。本番用InMemory実装は
 * src/adapters/repositories/InMemoryReflectionRepository.ts を参照。
 */
class FakeReflectionRepository implements ReflectionRepository {
  private store = new Map<string, Reflection>();

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

describe('RecordDailyReflectionUseCase', () => {
  let repository: FakeReflectionRepository;
  let useCase: RecordDailyReflectionUseCase;

  beforeEach(() => {
    repository = new FakeReflectionRepository();
    useCase = new RecordDailyReflectionUseCase(repository);
  });

  it('records a new reflection for a given date', async () => {
    const result = await useCase.execute({
      date: '2026-07-10',
      record: {
        sleepHours: 6.5,
        studyMinutes: 120,
        didMartialArts: true,
        didEnglishLesson: false,
        mood: 'good',
      },
    });

    expect(result.reflection.date).toBe('2026-07-10');
    expect(result.hasMinimumRoutine).toBe(true);

    const saved = await repository.findByDate('2026-07-10');
    expect(saved).not.toBeNull();
  });

  it('throws when a reflection for the same date already exists', async () => {
    await useCase.execute({
      date: '2026-07-10',
      record: { didMartialArts: false, didEnglishLesson: false },
    });

    await expect(
      useCase.execute({
        date: '2026-07-10',
        record: { didMartialArts: true, didEnglishLesson: true },
      }),
    ).rejects.toThrow(/already exists/);
  });

  it('reports hasMinimumRoutine as false when no study or martial arts logged', async () => {
    const result = await useCase.execute({
      date: '2026-07-11',
      record: { didMartialArts: false, didEnglishLesson: false },
    });

    expect(result.hasMinimumRoutine).toBe(false);
  });
});
