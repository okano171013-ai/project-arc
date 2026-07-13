import { describe, it, expect } from 'vitest';
import { GenerateMorningBriefUseCase } from './GenerateMorningBrief.js';
import type { ReflectionRepository } from '../../ports/ReflectionRepository.js';
import type { DailyPlanProvider } from '../../ports/DailyPlanProvider.js';
import type { DailyPlan } from '../../../domain/value-objects/DailyPlan.js';
import { Reflection } from '../../../domain/entities/Reflection.js';

class FakeReflectionRepository implements ReflectionRepository {
  constructor(private readonly reflections: Reflection[] = []) {}

  async save(): Promise<void> {
    throw new Error('not used in this test');
  }

  async findByDate(date: string): Promise<Reflection | null> {
    return this.reflections.find((r) => r.date === date) ?? null;
  }

  async findRecent(): Promise<Reflection[]> {
    return this.reflections;
  }
}

class FakeDailyPlanProvider implements DailyPlanProvider {
  async getTodayPlan(): Promise<DailyPlan> {
    return {
      schedule: ['ダミー予定'],
      todos: ['ダミータスク'],
      focus: ['A', 'B', 'C'],
      message: 'テストメッセージ',
    };
  }
}

describe('GenerateMorningBriefUseCase', () => {
  it("includes yesterday's study minutes and expense when a reflection exists", async () => {
    const yesterdayReflection = Reflection.create({
      id: 'r1',
      date: '2026-07-09',
      record: { studyMinutes: 90, expenseYen: 1200 },
    });
    const useCase = new GenerateMorningBriefUseCase(
      new FakeReflectionRepository([yesterdayReflection]),
      new FakeDailyPlanProvider(),
    );

    const result = await useCase.execute({ today: '2026-07-10', yesterday: '2026-07-09' });

    expect(result.yesterdayStudyMinutes).toBe(90);
    expect(result.yesterdayExpenseYen).toBe(1200);
    expect(result.plan.focus).toHaveLength(3);
    expect(result.dayOfWeek).toBe('金'); // 2026-07-10 は金曜日
  });

  it('returns undefined values (not zero) when yesterday has no reflection', async () => {
    const useCase = new GenerateMorningBriefUseCase(
      new FakeReflectionRepository([]),
      new FakeDailyPlanProvider(),
    );

    const result = await useCase.execute({ today: '2026-07-10', yesterday: '2026-07-09' });

    expect(result.yesterdayStudyMinutes).toBeUndefined();
    expect(result.yesterdayExpenseYen).toBeUndefined();
  });
});
