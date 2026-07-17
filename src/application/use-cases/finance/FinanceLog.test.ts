import { describe, it, expect, beforeEach } from 'vitest';
import { AddFinanceLogUseCase } from './AddFinanceLog.js';
import { ListFinanceLogsUseCase } from './ListFinanceLogs.js';
import type { FinanceLogRepository } from '../../ports/FinanceLogRepository.js';
import type { FinanceLog } from '../../../domain/entities/FinanceLog.js';

class FakeFinanceLogRepository implements FinanceLogRepository {
  private store: FinanceLog[] = [];

  async save(log: FinanceLog): Promise<void> {
    this.store.push(log);
  }

  async findAll(): Promise<FinanceLog[]> {
    return [...this.store];
  }
}

describe('FinanceLog use cases', () => {
  let repository: FakeFinanceLogRepository;

  beforeEach(() => {
    repository = new FakeFinanceLogRepository();
  });

  it('adds a new finance log, defaulting currency to JPY', async () => {
    const useCase = new AddFinanceLogUseCase(repository);
    const result = await useCase.execute({
      record: { occurredAt: '2026-07-17T12:00:00.000Z', type: 'Expense', amount: 1200 },
    });

    expect(result.deduped).toBe(false);
    expect(result.log.record.currency).toBe('JPY');
  });

  it('dedupes on a repeated idempotencyKey', async () => {
    const useCase = new AddFinanceLogUseCase(repository);
    const first = await useCase.execute({
      record: { occurredAt: '2026-07-17T12:00:00.000Z', type: 'Expense', amount: 1200, idempotencyKey: 'k-1' },
    });
    const second = await useCase.execute({
      record: { occurredAt: '2026-07-17T12:05:00.000Z', type: 'Expense', amount: 1200, idempotencyKey: 'k-1' },
    });

    expect(second.deduped).toBe(true);
    expect(second.log.id).toBe(first.log.id);
    expect(await repository.findAll()).toHaveLength(1);
  });

  it('filters by date, category, and type', async () => {
    const addUseCase = new AddFinanceLogUseCase(repository);
    await addUseCase.execute({
      record: { occurredAt: '2026-07-16T12:00:00.000Z', type: 'Expense', amount: 500, category: '食費' },
    });
    await addUseCase.execute({
      record: { occurredAt: '2026-07-17T12:00:00.000Z', type: 'Expense', amount: 800, category: '食費' },
    });
    await addUseCase.execute({
      record: { occurredAt: '2026-07-17T09:00:00.000Z', type: 'Income', amount: 30000, category: '給与' },
    });

    const listUseCase = new ListFinanceLogsUseCase(repository);
    const result = await listUseCase.execute({ limit: 10, date: '2026-07-17', category: '食費', type: 'Expense' });

    expect(result.logs).toHaveLength(1);
    expect(result.logs[0]?.record.amount).toBe(800);
  });

  it('rejects a limit above the max', async () => {
    const listUseCase = new ListFinanceLogsUseCase(repository);
    await expect(listUseCase.execute({ limit: 101 })).rejects.toThrow('limit must not exceed 100');
  });
});
