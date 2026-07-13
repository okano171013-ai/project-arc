import { describe, it, expect, beforeEach } from 'vitest';
import { AddChallengeLogUseCase } from './AddChallengeLog.js';
import { ListChallengeLogsUseCase } from './ListChallengeLogs.js';
import type { ChallengeLogRepository } from '../../ports/ChallengeLogRepository.js';
import type { ChallengeLog } from '../../../domain/entities/ChallengeLog.js';

class FakeChallengeLogRepository implements ChallengeLogRepository {
  private store: ChallengeLog[] = [];

  async save(log: ChallengeLog): Promise<void> {
    this.store.push(log);
  }

  async findAll(): Promise<ChallengeLog[]> {
    return [...this.store];
  }
}

describe('ChallengeLog use cases', () => {
  let repository: FakeChallengeLogRepository;

  beforeEach(() => {
    repository = new FakeChallengeLogRepository();
  });

  it('adds a new challenge log', async () => {
    const useCase = new AddChallengeLogUseCase(repository);
    const result = await useCase.execute({
      record: { date: '2026-07-01', title: '赤福', category: '食べ物' },
    });

    expect(result.log.title).toBe('赤福');
    expect(result.log.date).toBe('2026-07-01');
  });

  it('rejects an empty title', async () => {
    const useCase = new AddChallengeLogUseCase(repository);
    await expect(
      useCase.execute({ record: { date: '2026-07-01', title: '  ' } }),
    ).rejects.toThrow(/title must not be empty/);
  });

  it('rejects an invalid date format', async () => {
    const useCase = new AddChallengeLogUseCase(repository);
    await expect(
      useCase.execute({ record: { date: '2026-7-1', title: '赤福' } }),
    ).rejects.toThrow(/Invalid date format/);
  });

  it('lists logs sorted by date descending', async () => {
    const addUseCase = new AddChallengeLogUseCase(repository);
    await addUseCase.execute({ record: { date: '2026-05-01', title: 'トマト' } });
    await addUseCase.execute({ record: { date: '2026-07-01', title: '抹茶アイス' } });

    const listUseCase = new ListChallengeLogsUseCase(repository);
    const result = await listUseCase.execute();

    expect(result.logs).toHaveLength(2);
    expect(result.logs[0]?.title).toBe('抹茶アイス');
  });
});
