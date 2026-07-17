import { describe, it, expect, beforeEach } from 'vitest';
import { AddNutritionLogUseCase } from './AddNutritionLog.js';
import { ListNutritionLogsUseCase } from './ListNutritionLogs.js';
import { SummarizeNutritionByDateUseCase } from './SummarizeNutritionByDate.js';
import { AddMealLogUseCase } from '../meal/AddMealLog.js';
import type { NutritionLogRepository } from '../../ports/NutritionLogRepository.js';
import type { NutritionLog } from '../../../domain/entities/NutritionLog.js';
import type { MealLogRepository } from '../../ports/MealLogRepository.js';
import type { MealLog } from '../../../domain/entities/MealLog.js';

class FakeNutritionLogRepository implements NutritionLogRepository {
  private store: NutritionLog[] = [];

  async save(log: NutritionLog): Promise<void> {
    this.store.push(log);
  }

  async findAll(): Promise<NutritionLog[]> {
    return [...this.store];
  }
}

class FakeMealLogRepository implements MealLogRepository {
  private store: MealLog[] = [];

  async save(log: MealLog): Promise<void> {
    this.store.push(log);
  }

  async findAll(): Promise<MealLog[]> {
    return [...this.store];
  }
}

describe('NutritionLog use cases', () => {
  let repository: FakeNutritionLogRepository;

  beforeEach(() => {
    repository = new FakeNutritionLogRepository();
  });

  it('adds a new nutrition log with confidence', async () => {
    const useCase = new AddNutritionLogUseCase(repository);
    const result = await useCase.execute({
      record: { mealLogId: 'm-1', calories: 600, estimated: true, basis: '写真からの推定', confidence: 'medium' },
    });

    expect(result.deduped).toBe(false);
    expect(result.log.record.calories).toBe(600);
  });

  it('rejects when neither confidence nor uncertaintyNote is provided', async () => {
    const useCase = new AddNutritionLogUseCase(repository);
    await expect(
      useCase.execute({ record: { mealLogId: 'm-1', estimated: true, basis: '写真からの推定' } }),
    ).rejects.toThrow('either confidence or uncertaintyNote must be provided');
  });

  it('dedupes on a repeated idempotencyKey', async () => {
    const useCase = new AddNutritionLogUseCase(repository);
    const first = await useCase.execute({
      record: {
        mealLogId: 'm-1',
        estimated: true,
        basis: '写真からの推定',
        confidence: 'medium',
        idempotencyKey: 'k-1',
      },
    });
    const second = await useCase.execute({
      record: {
        mealLogId: 'm-1',
        estimated: true,
        basis: '写真からの推定（再送）',
        confidence: 'high',
        idempotencyKey: 'k-1',
      },
    });

    expect(second.deduped).toBe(true);
    expect(second.log.id).toBe(first.log.id);
    expect(await repository.findAll()).toHaveLength(1);
  });

  it('filters listing by mealLogId', async () => {
    const addUseCase = new AddNutritionLogUseCase(repository);
    await addUseCase.execute({
      record: { mealLogId: 'm-1', calories: 400, estimated: true, basis: 'a', confidence: 'low' },
    });
    await addUseCase.execute({
      record: { mealLogId: 'm-2', calories: 700, estimated: true, basis: 'b', confidence: 'low' },
    });

    const listUseCase = new ListNutritionLogsUseCase(repository);
    const result = await listUseCase.execute({ limit: 10, mealLogId: 'm-2' });

    expect(result.logs).toHaveLength(1);
    expect(result.logs[0]?.record.calories).toBe(700);
  });
});

describe('SummarizeNutritionByDateUseCase', () => {
  let mealLogRepository: FakeMealLogRepository;
  let nutritionLogRepository: FakeNutritionLogRepository;

  beforeEach(() => {
    mealLogRepository = new FakeMealLogRepository();
    nutritionLogRepository = new FakeNutritionLogRepository();
  });

  it('sums nutrition values for meal logs occurring on the given date', async () => {
    const addMeal = new AddMealLogUseCase(mealLogRepository);
    const breakfast = await addMeal.execute({
      record: { occurredAt: '2026-07-17T08:00:00.000Z', items: ['パン'] },
    });
    const dinner = await addMeal.execute({
      record: { occurredAt: '2026-07-17T19:00:00.000Z', items: ['カレー'] },
    });
    const otherDay = await addMeal.execute({
      record: { occurredAt: '2026-07-16T19:00:00.000Z', items: ['寿司'] },
    });

    const addNutrition = new AddNutritionLogUseCase(nutritionLogRepository);
    await addNutrition.execute({
      record: { mealLogId: breakfast.log.id, calories: 300, proteinG: 8, estimated: false, basis: '実測', confidence: 'high' },
    });
    await addNutrition.execute({
      record: { mealLogId: dinner.log.id, calories: 700, proteinG: 20, estimated: true, basis: '写真推定', confidence: 'low' },
    });
    await addNutrition.execute({
      record: { mealLogId: otherDay.log.id, calories: 900, estimated: false, basis: '実測', confidence: 'high' },
    });

    const summarize = new SummarizeNutritionByDateUseCase(mealLogRepository, nutritionLogRepository);
    const result = await summarize.execute({ date: '2026-07-17' });

    expect(result.totals.calories).toBe(1000);
    expect(result.totals.proteinG).toBe(28);
    expect(result.mealLogCount).toBe(2);
    expect(result.nutritionLogCount).toBe(2);
    expect(result.containsEstimatedValues).toBe(true);
  });
});
