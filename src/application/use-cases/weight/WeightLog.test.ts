import { describe, it, expect, beforeEach } from 'vitest';
import { AddWeightLogUseCase } from './AddWeightLog.js';
import { ListWeightLogsUseCase } from './ListWeightLogs.js';
import type { WeightLogRepository } from '../../ports/WeightLogRepository.js';
import type { WeightLog } from '../../../domain/entities/WeightLog.js';

class FakeWeightLogRepository implements WeightLogRepository {
  private store: WeightLog[] = [];

  async save(log: WeightLog): Promise<void> {
    this.store.push(log);
  }

  async findAll(): Promise<WeightLog[]> {
    return [...this.store];
  }
}

describe('WeightLog use cases', () => {
  let repository: FakeWeightLogRepository;

  beforeEach(() => {
    repository = new FakeWeightLogRepository();
  });

  it('adds a new weight log', async () => {
    const useCase = new AddWeightLogUseCase(repository);
    const result = await useCase.execute({ record: { measuredAt: '2026-07-17T07:00:00.000Z', weightKg: 68.5 } });

    expect(result.deduped).toBe(false);
    expect(result.log.record.weightKg).toBe(68.5);
  });

  it('dedupes on a repeated idempotencyKey', async () => {
    const useCase = new AddWeightLogUseCase(repository);
    const first = await useCase.execute({
      record: { measuredAt: '2026-07-17T07:00:00.000Z', weightKg: 68.5, idempotencyKey: 'k-1' },
    });
    const second = await useCase.execute({
      record: { measuredAt: '2026-07-17T07:05:00.000Z', weightKg: 68.4, idempotencyKey: 'k-1' },
    });

    expect(second.deduped).toBe(true);
    expect(second.log.id).toBe(first.log.id);
    expect(await repository.findAll()).toHaveLength(1);
  });

  it('allows multiple measurements the same day without dedup when no key is given', async () => {
    const useCase = new AddWeightLogUseCase(repository);
    await useCase.execute({ record: { measuredAt: '2026-07-17T07:00:00.000Z', weightKg: 68.5 } });
    await useCase.execute({ record: { measuredAt: '2026-07-17T22:00:00.000Z', weightKg: 69.2 } });

    const listUseCase = new ListWeightLogsUseCase(repository);
    const result = await listUseCase.execute({ limit: 10, date: '2026-07-17' });
    expect(result.logs).toHaveLength(2);
  });

  it('rejects a limit above the max', async () => {
    const listUseCase = new ListWeightLogsUseCase(repository);
    await expect(listUseCase.execute({ limit: 101 })).rejects.toThrow('limit must not exceed 100');
  });
});
