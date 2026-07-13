import { describe, it, expect, beforeEach } from 'vitest';
import { AddSkinLogUseCase } from './AddSkinLog.js';
import { ListSkinLogsUseCase } from './ListSkinLogs.js';
import type { SkinLogRepository } from '../../ports/SkinLogRepository.js';
import type { SkinLog } from '../../../domain/entities/SkinLog.js';

class FakeSkinLogRepository implements SkinLogRepository {
  private store: SkinLog[] = [];

  async save(log: SkinLog): Promise<void> {
    this.store.push(log);
  }

  async findAll(): Promise<SkinLog[]> {
    return [...this.store];
  }
}

describe('SkinLog use cases', () => {
  let repository: FakeSkinLogRepository;

  beforeEach(() => {
    repository = new FakeSkinLogRepository();
  });

  it('adds a new skin log', async () => {
    const useCase = new AddSkinLogUseCase(repository);
    const result = await useCase.execute({
      record: { date: '2026-07-01', redness: 2, pores: 3, currentSkincare: '化粧水' },
    });

    expect(result.log.date).toBe('2026-07-01');
    expect(result.log.record.redness).toBe(2);
  });

  it('rejects a severity value outside 1-5', async () => {
    const useCase = new AddSkinLogUseCase(repository);
    await expect(
      useCase.execute({ record: { date: '2026-07-01', redness: 6 } }),
    ).rejects.toThrow(/redness/);
  });

  it('rejects an invalid date format', async () => {
    const useCase = new AddSkinLogUseCase(repository);
    await expect(
      useCase.execute({ record: { date: '2026-7-1', redness: 2 } }),
    ).rejects.toThrow(/Invalid date format/);
  });

  it('allows multiple entries on the same day', async () => {
    const useCase = new AddSkinLogUseCase(repository);
    await useCase.execute({ record: { date: '2026-07-01', redness: 2 } });
    await useCase.execute({ record: { date: '2026-07-01', redness: 3 } });

    const listUseCase = new ListSkinLogsUseCase(repository);
    const result = await listUseCase.execute();
    expect(result.logs).toHaveLength(2);
  });

  it('lists logs sorted by date descending', async () => {
    const addUseCase = new AddSkinLogUseCase(repository);
    await addUseCase.execute({ record: { date: '2026-05-01', redness: 2 } });
    await addUseCase.execute({ record: { date: '2026-07-01', redness: 3 } });

    const listUseCase = new ListSkinLogsUseCase(repository);
    const result = await listUseCase.execute();

    expect(result.logs).toHaveLength(2);
    expect(result.logs[0]?.date).toBe('2026-07-01');
  });
});
