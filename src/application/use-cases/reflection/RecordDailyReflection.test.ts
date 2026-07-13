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
    expect(result.score).toBeGreaterThan(0);

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

  it('computes a base score of 50 when no optional fields are recorded', async () => {
    const result = await useCase.execute({
      date: '2026-07-12',
      record: {},
    });

    expect(result.score).toBe(50);
  });

  it('computes a perfect-ish score when all positive factors are present', async () => {
    const result = await useCase.execute({
      date: '2026-07-13',
      record: {
        studyMinutes: 180,
        planAchieved: true,
        didAttendClass: true,
        sleepHours: 7,
        mood: 'great',
      },
    });

    // 50 + 20 (study) + 10 (plan) + 10 (class) + 10 (sleep) + 10 (mood) = 100
    expect(result.score).toBe(100);
  });

  it('clamps the score to a minimum of 0', async () => {
    const result = await useCase.execute({
      date: '2026-07-14',
      record: {
        mood: 'bad',
        sleepHours: 3,
      },
    });

    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('returns undefined previousScore/scoreDelta when yesterday has no record', async () => {
    const result = await useCase.execute({
      date: '2026-07-15',
      record: {},
    });

    expect(result.previousScore).toBeUndefined();
    expect(result.scoreDelta).toBeUndefined();
  });

  it('computes scoreDelta against yesterday when a previous reflection exists', async () => {
    await useCase.execute({
      date: '2026-07-16',
      record: { studyMinutes: 60 }, // score: 50 + round(60/180*20)=7 → 57
    });

    const today = await useCase.execute({
      date: '2026-07-17',
      record: { studyMinutes: 180, planAchieved: true }, // score: 50+20+10=80
    });

    expect(today.previousScore).toBe(57);
    expect(today.scoreDelta).toBe(80 - 57);
  });
});
