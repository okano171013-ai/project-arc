import { describe, expect, it } from 'vitest';
import { MealLog } from '../../../domain/entities/MealLog.js';
import { NutritionLog } from '../../../domain/entities/NutritionLog.js';
import { WeightLog } from '../../../domain/entities/WeightLog.js';
import { FinanceLog } from '../../../domain/entities/FinanceLog.js';
import type { MealLogRepository } from '../../ports/MealLogRepository.js';
import type { NutritionLogRepository } from '../../ports/NutritionLogRepository.js';
import type { WeightLogRepository } from '../../ports/WeightLogRepository.js';
import type { FinanceLogRepository } from '../../ports/FinanceLogRepository.js';
import { CorrectMealLogUseCase } from '../meal/CorrectMealLog.js';
import { CorrectNutritionLogUseCase } from '../nutrition/CorrectNutritionLog.js';
import { CorrectWeightLogUseCase } from '../weight/CorrectWeightLog.js';
import { CorrectFinanceLogUseCase } from '../finance/CorrectFinanceLog.js';

class MemoryRepository<T> {
  store: T[] = [];
  async save(log: T): Promise<void> {
    this.store.push(log);
  }
  async findAll(): Promise<T[]> {
    return [...this.store];
  }
}

describe('Version25 append-only correction history', () => {
  it('appends linked corrections for all four logs without overwriting originals', async () => {
    const mealRepo = new MemoryRepository<MealLog>();
    const nutritionRepo = new MemoryRepository<NutritionLog>();
    const weightRepo = new MemoryRepository<WeightLog>();
    const financeRepo = new MemoryRepository<FinanceLog>();

    await mealRepo.save(
      MealLog.create({
        id: 'meal-1',
        record: {
          occurredAt: '2026-07-17T12:00:00+09:00',
          items: ['bread'],
          idempotencyKey: 'meal-original',
        },
      }),
    );
    await nutritionRepo.save(
      NutritionLog.create({
        id: 'nutrition-1',
        record: {
          mealLogId: 'meal-1',
          estimated: true,
          basis: 'package label',
          confidence: 'high',
          calories: 300,
          idempotencyKey: 'nutrition-original',
        },
      }),
    );
    await weightRepo.save(
      WeightLog.create({
        id: 'weight-1',
        record: {
          measuredAt: '2026-07-17T07:00:00+09:00',
          weightKg: 60.1,
          idempotencyKey: 'weight-original',
        },
      }),
    );
    await financeRepo.save(
      FinanceLog.create({
        id: 'finance-1',
        record: {
          occurredAt: '2026-07-17T10:00:00+09:00',
          type: 'Expense',
          amount: 500,
          idempotencyKey: 'finance-original',
        },
      }),
    );

    const meal = await new CorrectMealLogUseCase(mealRepo as MealLogRepository).execute({
      originalId: 'meal-1',
      replacement: { occurredAt: '2026-07-17T12:00:00+09:00', items: ['rice'] },
      reason: 'Owner corrected the item',
    });
    const nutrition = await new CorrectNutritionLogUseCase(
      nutritionRepo as NutritionLogRepository,
    ).execute({
      originalId: 'nutrition-1',
      replacement: {
        mealLogId: 'meal-1',
        estimated: true,
        basis: 'corrected package label',
        confidence: 'high',
        calories: 250,
      },
      reason: 'Owner corrected calories',
    });
    const weight = await new CorrectWeightLogUseCase(weightRepo as WeightLogRepository).execute({
      originalId: 'weight-1',
      replacement: { measuredAt: '2026-07-17T07:00:00+09:00', weightKg: 60.4 },
      reason: 'Owner corrected the reading',
    });
    const finance = await new CorrectFinanceLogUseCase(financeRepo as FinanceLogRepository).execute(
      {
        originalId: 'finance-1',
        replacement: {
          occurredAt: '2026-07-17T10:00:00+09:00',
          type: 'Expense',
          amount: 450,
        },
        reason: 'Owner corrected the amount',
      },
    );

    expect(mealRepo.store).toHaveLength(2);
    expect(nutritionRepo.store).toHaveLength(2);
    expect(weightRepo.store).toHaveLength(2);
    expect(financeRepo.store).toHaveLength(2);
    expect(mealRepo.store[0]?.record.items).toEqual(['bread']);
    expect(meal.log.record.correctionOfId).toBe('meal-1');
    expect(nutrition.log.record.correctionOfId).toBe('nutrition-1');
    expect(weight.log.record.correctionOfId).toBe('weight-1');
    expect(finance.log.record.correctionOfId).toBe('finance-1');
    expect(meal.log.record.idempotencyKey).toBeUndefined();
  });

  it('rejects a correction when the original does not exist', async () => {
    const repository = new MemoryRepository<MealLog>();
    await expect(
      new CorrectMealLogUseCase(repository as MealLogRepository).execute({
        originalId: 'missing',
        replacement: { occurredAt: '2026-07-17T12:00:00+09:00', items: ['rice'] },
        reason: 'Owner correction',
      }),
    ).rejects.toThrow('MealLog not found');
  });

  it('requires complete, non-empty correction metadata', () => {
    expect(() =>
      MealLog.create({
        id: 'invalid',
        record: {
          occurredAt: '2026-07-17T12:00:00+09:00',
          items: ['rice'],
          correctionOfId: 'meal-1',
        },
      }),
    ).toThrow(/provided together/);
  });
});
