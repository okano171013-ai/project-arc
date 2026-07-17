import { describe, it, expect, beforeEach } from 'vitest';
import { AddMealLogUseCase } from './AddMealLog.js';
import { ListMealLogsUseCase } from './ListMealLogs.js';
import type { MealLogRepository } from '../../ports/MealLogRepository.js';
import type { MealLog } from '../../../domain/entities/MealLog.js';

class FakeMealLogRepository implements MealLogRepository {
  private store: MealLog[] = [];

  async save(log: MealLog): Promise<void> {
    this.store.push(log);
  }

  async findAll(): Promise<MealLog[]> {
    return [...this.store];
  }
}

describe('MealLog use cases', () => {
  let repository: FakeMealLogRepository;

  beforeEach(() => {
    repository = new FakeMealLogRepository();
  });

  it('adds a new meal log', async () => {
    const useCase = new AddMealLogUseCase(repository);
    const result = await useCase.execute({
      record: { occurredAt: '2026-07-17T12:00:00.000Z', items: ['味噌汁', 'ご飯'] },
    });

    expect(result.deduped).toBe(false);
    expect(result.log.record.items).toEqual(['味噌汁', 'ご飯']);
  });

  it('dedupes on a repeated idempotencyKey', async () => {
    const useCase = new AddMealLogUseCase(repository);
    const first = await useCase.execute({
      record: { occurredAt: '2026-07-17T12:00:00.000Z', items: ['味噌汁'], idempotencyKey: 'k-1' },
    });
    const second = await useCase.execute({
      record: { occurredAt: '2026-07-17T12:05:00.000Z', items: ['味噌汁'], idempotencyKey: 'k-1' },
    });

    expect(second.deduped).toBe(true);
    expect(second.log.id).toBe(first.log.id);
    expect(await repository.findAll()).toHaveLength(1);
  });

  it('does not dedupe when idempotencyKey is omitted', async () => {
    const useCase = new AddMealLogUseCase(repository);
    await useCase.execute({ record: { occurredAt: '2026-07-17T12:00:00.000Z', items: ['味噌汁'] } });
    await useCase.execute({ record: { occurredAt: '2026-07-17T12:00:00.000Z', items: ['味噌汁'] } });

    expect(await repository.findAll()).toHaveLength(2);
  });

  it('filters by date and mealType, sorted by occurredAt descending', async () => {
    const addUseCase = new AddMealLogUseCase(repository);
    await addUseCase.execute({
      record: { occurredAt: '2026-07-16T08:00:00.000Z', mealType: 'breakfast', items: ['パン'] },
    });
    await addUseCase.execute({
      record: { occurredAt: '2026-07-17T08:00:00.000Z', mealType: 'breakfast', items: ['卵'] },
    });
    await addUseCase.execute({
      record: { occurredAt: '2026-07-17T19:00:00.000Z', mealType: 'dinner', items: ['カレー'] },
    });

    const listUseCase = new ListMealLogsUseCase(repository);
    const result = await listUseCase.execute({ limit: 10, date: '2026-07-17', mealType: 'breakfast' });

    expect(result.logs).toHaveLength(1);
    expect(result.logs[0]?.record.items).toEqual(['卵']);
  });

  it('rejects a limit above the max', async () => {
    const listUseCase = new ListMealLogsUseCase(repository);
    await expect(listUseCase.execute({ limit: 101 })).rejects.toThrow('limit must not exceed 100');
  });
});
