import { describe, it, expect, beforeEach } from 'vitest';
import { RecordDailyReflectionUseCase } from './RecordDailyReflection.js';
import { UpdateDailyReflectionUseCase } from './UpdateDailyReflection.js';
import type { ReflectionRepository } from '../../ports/ReflectionRepository.js';
import type { Reflection } from '../../../domain/entities/Reflection.js';

class FakeReflectionRepository implements ReflectionRepository {
  private store = new Map<string, Reflection>();

  async save(reflection: Reflection): Promise<void> {
    this.store.set(reflection.date, reflection);
  }

  async findByDate(date: string): Promise<Reflection | null> {
    return this.store.get(date) ?? null;
  }

  async findRecent(limit: number): Promise<Reflection[]> {
    return [...this.store.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
  }
}

describe('UpdateDailyReflectionUseCase', () => {
  let repository: FakeReflectionRepository;

  beforeEach(() => {
    repository = new FakeReflectionRepository();
  });

  it('overwrites an existing reflection, preserving id and createdAt', async () => {
    const recordUseCase = new RecordDailyReflectionUseCase(repository);
    const original = await recordUseCase.execute({
      date: '2026-07-10',
      record: { studyMinutes: 30 },
    });

    const updateUseCase = new UpdateDailyReflectionUseCase(repository);
    const updated = await updateUseCase.execute({
      date: '2026-07-10',
      record: { studyMinutes: 120, planAchieved: true },
    });

    expect(updated.reflection.id).toBe(original.reflection.id);
    expect(updated.reflection.createdAt.getTime()).toBe(original.reflection.createdAt.getTime());
    expect(updated.reflection.record.studyMinutes).toBe(120);

    const saved = await repository.findByDate('2026-07-10');
    expect(saved?.record.planAchieved).toBe(true);
  });

  it('throws when no reflection exists yet for the given date', async () => {
    const updateUseCase = new UpdateDailyReflectionUseCase(repository);
    await expect(
      updateUseCase.execute({ date: '2026-07-10', record: {} }),
    ).rejects.toThrow(/does not exist yet/);
  });
});
