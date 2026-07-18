import { describe, it, expect, beforeEach } from 'vitest';
import { AddCheckInUseCase } from './AddCheckIn.js';
import { ListCheckInsUseCase } from './ListCheckIns.js';
import type { CheckInRepository } from '../../ports/CheckInRepository.js';
import type { CheckIn } from '../../../domain/entities/CheckIn.js';

class FakeCheckInRepository implements CheckInRepository {
  private store: CheckIn[] = [];

  async save(checkIn: CheckIn): Promise<void> {
    this.store.push(checkIn);
  }

  async findAll(): Promise<CheckIn[]> {
    return [...this.store];
  }
}

describe('CheckIn use cases', () => {
  let repository: FakeCheckInRepository;

  beforeEach(() => {
    repository = new FakeCheckInRepository();
  });

  it('adds a new check-in', async () => {
    const useCase = new AddCheckInUseCase(repository);
    const result = await useCase.execute({
      record: { occurredAt: '2026-07-18T10:00:00+09:00', currentActivity: '判例百選', nextTwoHourGoal: '3件読む' },
    });

    expect(result.deduped).toBe(false);
    expect(result.checkIn.record.currentActivity).toBe('判例百選');
  });

  it('dedupes on a repeated idempotencyKey', async () => {
    const useCase = new AddCheckInUseCase(repository);
    const first = await useCase.execute({
      record: {
        occurredAt: '2026-07-18T10:00:00+09:00',
        currentActivity: '判例百選',
        nextTwoHourGoal: '3件読む',
        idempotencyKey: 'k-1',
      },
    });
    const second = await useCase.execute({
      record: {
        occurredAt: '2026-07-18T10:05:00+09:00',
        currentActivity: '判例百選',
        nextTwoHourGoal: '3件読む',
        idempotencyKey: 'k-1',
      },
    });

    expect(second.deduped).toBe(true);
    expect(second.checkIn.id).toBe(first.checkIn.id);
    expect(await repository.findAll()).toHaveLength(1);
  });

  it('filters listing by date, sorted by occurredAt descending', async () => {
    const addUseCase = new AddCheckInUseCase(repository);
    await addUseCase.execute({
      record: { occurredAt: '2026-07-17T10:00:00+09:00', currentActivity: 'a', nextTwoHourGoal: 'x' },
    });
    await addUseCase.execute({
      record: { occurredAt: '2026-07-18T08:00:00+09:00', currentActivity: 'b', nextTwoHourGoal: 'y' },
    });
    await addUseCase.execute({
      record: { occurredAt: '2026-07-18T12:00:00+09:00', currentActivity: 'c', nextTwoHourGoal: 'z' },
    });

    const listUseCase = new ListCheckInsUseCase(repository);
    const result = await listUseCase.execute({ limit: 10, date: '2026-07-18' });

    expect(result.checkIns).toHaveLength(2);
    expect(result.checkIns[0]?.record.currentActivity).toBe('c');
  });

  it('rejects a limit above the max', async () => {
    const listUseCase = new ListCheckInsUseCase(repository);
    await expect(listUseCase.execute({ limit: 101 })).rejects.toThrow('limit must not exceed 100');
  });
});
