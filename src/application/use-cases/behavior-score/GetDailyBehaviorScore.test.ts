import { describe, it, expect } from 'vitest';
import { GetDailyBehaviorScoreUseCase } from './GetDailyBehaviorScore.js';
import { Reflection } from '../../../domain/entities/Reflection.js';
import { CheckIn } from '../../../domain/entities/CheckIn.js';
import { Intervention } from '../../../domain/entities/Intervention.js';
import type { ReflectionRepository } from '../../ports/ReflectionRepository.js';
import type { CheckInRepository } from '../../ports/CheckInRepository.js';
import type { InterventionRepository } from '../../ports/InterventionRepository.js';
import type { InterventionPolicySettingsRepository } from '../../ports/InterventionPolicySettingsRepository.js';

class FakeReflectionRepository implements ReflectionRepository {
  store: Reflection[] = [];
  async save(r: Reflection): Promise<void> {
    this.store.push(r);
  }
  async findByDate(date: string): Promise<Reflection | null> {
    return this.store.find((r) => r.date === date) ?? null;
  }
  async findRecent(limit: number): Promise<Reflection[]> {
    return [...this.store].slice(0, limit);
  }
}

class FakeCheckInRepository implements CheckInRepository {
  store: CheckIn[] = [];
  async save(c: CheckIn): Promise<void> {
    this.store.push(c);
  }
  async findAll(): Promise<CheckIn[]> {
    return [...this.store];
  }
}

class FakeInterventionRepository implements InterventionRepository {
  store: Intervention[] = [];
  async save(i: Intervention): Promise<void> {
    const idx = this.store.findIndex((x) => x.id === i.id);
    if (idx >= 0) this.store[idx] = i;
    else this.store.push(i);
  }
  async findById(id: string): Promise<Intervention | null> {
    return this.store.find((i) => i.id === id) ?? null;
  }
  async findAll(): Promise<Intervention[]> {
    return [...this.store];
  }
}

class FakeInterventionPolicySettingsRepository implements InterventionPolicySettingsRepository {
  async save(): Promise<void> {
    // 既定値のみ使用するテストのため未実装
  }
  async find() {
    return undefined;
  }
}

function buildUseCase() {
  const reflectionRepository = new FakeReflectionRepository();
  const checkInRepository = new FakeCheckInRepository();
  const interventionRepository = new FakeInterventionRepository();
  const settingsRepository = new FakeInterventionPolicySettingsRepository();
  const useCase = new GetDailyBehaviorScoreUseCase(
    reflectionRepository,
    checkInRepository,
    interventionRepository,
    settingsRepository,
  );
  return { useCase, reflectionRepository, checkInRepository, interventionRepository };
}

describe('GetDailyBehaviorScoreUseCase', () => {
  it('returns all-undefined score fields when no Reflection exists that day (未記録日)', async () => {
    const { useCase } = buildUseCase();
    const result = await useCase.execute({ date: '2026-07-18' });
    expect(result.reflectionScore).toBeUndefined();
    expect(result.compositeScore).toBeUndefined();
    expect(result.vsIdealBaseline).toBeUndefined();
  });

  it('composes reflectionScore with a check-in completion bonus (Reflectionあり、Interventionなし)', async () => {
    const { useCase, reflectionRepository, checkInRepository } = buildUseCase();
    await reflectionRepository.save(Reflection.create({ id: 'r-1', date: '2026-07-18', record: {} }));
    // 既定activeHours 07:00-23:00・checkInIntervalMinutes120分 -> expectedCheckIns=8。4件で完了率50%。
    for (let i = 0; i < 4; i++) {
      await checkInRepository.save(
        CheckIn.create({
          id: `c-${i}`,
          record: { occurredAt: `2026-07-18T1${i}:00:00`, currentActivity: 'x', nextTwoHourGoal: 'y' },
        }),
      );
    }
    const result = await useCase.execute({ date: '2026-07-18' });
    expect(result.reflectionScore).toBe(50);
    expect(result.checkInCompletionRate).toBe(0.5);
    expect(result.interventionPenalty).toBe(0);
    expect(result.compositeScore).toBe(55); // 50 + round(0.5*10)
    expect(result.idealBaseline).toBe(80);
    expect(result.vsIdealBaseline).toBe(55 - 80);
  });

  it('subtracts the penalty for Acknowledged interventions only (Acknowledgedのみ減点)', async () => {
    const { useCase, reflectionRepository, interventionRepository } = buildUseCase();
    await reflectionRepository.save(Reflection.create({ id: 'r-2', date: '2026-07-18', record: {} }));

    const acknowledgedWarning = Intervention.create({
      id: 'i-1',
      record: { generatedAt: '2026-07-18T10:00:00', intensity: 'Warning', triggerRuleId: 'x', message: 'm' },
    });
    acknowledgedWarning.acknowledge();
    await interventionRepository.save(acknowledgedWarning);

    const dismissedCritical = Intervention.create({
      id: 'i-2',
      record: { generatedAt: '2026-07-18T11:00:00', intensity: 'Critical', triggerRuleId: 'y', message: 'm' },
    });
    dismissedCritical.dismiss('誤検知でした');
    await interventionRepository.save(dismissedCritical);

    const result = await useCase.execute({ date: '2026-07-18' });
    expect(result.interventionPenalty).toBe(2); // Warningのみ、Dismissedの Criticalは対象外
    expect(result.compositeScore).toBe(48); // 50 - 2（checkIn実績なしで完了率ボーナス0）
  });

  it('reports sevenDayComparison as unavailable with too little history (7日比較: データ不足)', async () => {
    const { useCase, reflectionRepository } = buildUseCase();
    await reflectionRepository.save(Reflection.create({ id: 'r-3', date: '2026-07-18', record: {} }));
    const result = await useCase.execute({ date: '2026-07-18' });
    expect(result.sevenDayComparison.available).toBe(false);
    expect(result.sevenDayComparison.daysWithData).toBe(0);
    expect(result.sevenDayComparison.reason).toBeTruthy();
  });

  it('computes deltaVsAverage once enough days of history exist (7日比較: 十分なデータ)', async () => {
    const { useCase, reflectionRepository } = buildUseCase();
    const dates = ['2026-07-14', '2026-07-15', '2026-07-16', '2026-07-17', '2026-07-18'];
    for (const date of dates) {
      await reflectionRepository.save(Reflection.create({ id: `r-${date}`, date, record: {} }));
    }
    const result = await useCase.execute({ date: '2026-07-18' });
    expect(result.sevenDayComparison.available).toBe(true);
    expect(result.sevenDayComparison.daysWithData).toBe(4);
    expect(result.sevenDayComparison.deltaVsAverage).toBe(0); // 全日50点均一
  });
});
