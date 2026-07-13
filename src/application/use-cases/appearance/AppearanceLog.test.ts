import { describe, it, expect, beforeEach } from 'vitest';
import { AddAppearanceLogUseCase } from './AddAppearanceLog.js';
import { ListAppearanceLogsUseCase } from './ListAppearanceLogs.js';
import type { AppearanceLogRepository } from '../../ports/AppearanceLogRepository.js';
import type { AppearanceLog } from '../../../domain/entities/AppearanceLog.js';

class FakeAppearanceLogRepository implements AppearanceLogRepository {
  private store: AppearanceLog[] = [];

  async save(log: AppearanceLog): Promise<void> {
    this.store.push(log);
  }

  async findAll(): Promise<AppearanceLog[]> {
    return [...this.store];
  }
}

describe('AppearanceLog use cases', () => {
  let repository: FakeAppearanceLogRepository;

  beforeEach(() => {
    repository = new FakeAppearanceLogRepository();
  });

  it('adds a new appearance log', async () => {
    const useCase = new AddAppearanceLogUseCase(repository);
    const result = await useCase.execute({
      record: { date: '2026-07-01', overallRating: 4, comment: '調子良い' },
    });

    expect(result.log.date).toBe('2026-07-01');
    expect(result.log.record.overallRating).toBe(4);
  });

  it('rejects an overallRating outside 1-5', async () => {
    const useCase = new AddAppearanceLogUseCase(repository);
    await expect(
      useCase.execute({ record: { date: '2026-07-01', overallRating: 6 } }),
    ).rejects.toThrow(/overallRating/);
  });

  it('rejects an invalid date format', async () => {
    const useCase = new AddAppearanceLogUseCase(repository);
    await expect(
      useCase.execute({ record: { date: '2026-7-1', overallRating: 3 } }),
    ).rejects.toThrow(/Invalid date format/);
  });

  it('lists logs sorted by date descending', async () => {
    const addUseCase = new AddAppearanceLogUseCase(repository);
    await addUseCase.execute({ record: { date: '2026-05-01', overallRating: 3 } });
    await addUseCase.execute({ record: { date: '2026-07-01', overallRating: 4 } });

    const listUseCase = new ListAppearanceLogsUseCase(repository);
    const result = await listUseCase.execute();

    expect(result.logs).toHaveLength(2);
    expect(result.logs[0]?.date).toBe('2026-07-01');
  });
});
