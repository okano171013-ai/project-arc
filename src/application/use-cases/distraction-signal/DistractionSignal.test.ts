import { describe, it, expect, beforeEach } from 'vitest';
import { AddDistractionSignalUseCase } from './AddDistractionSignal.js';
import { ListDistractionSignalsUseCase } from './ListDistractionSignals.js';
import type { DistractionSignalRepository } from '../../ports/DistractionSignalRepository.js';
import type { DistractionSignal } from '../../../domain/entities/DistractionSignal.js';

class FakeDistractionSignalRepository implements DistractionSignalRepository {
  private store: DistractionSignal[] = [];

  async save(signal: DistractionSignal): Promise<void> {
    this.store.push(signal);
  }

  async findAll(): Promise<DistractionSignal[]> {
    return [...this.store];
  }
}

describe('DistractionSignal use cases', () => {
  let repository: FakeDistractionSignalRepository;

  beforeEach(() => {
    repository = new FakeDistractionSignalRepository();
  });

  it('adds a new signal', async () => {
    const useCase = new AddDistractionSignalUseCase(repository);
    const result = await useCase.execute({
      record: {
        occurredAt: '2026-07-18T10:00:00+09:00',
        kind: 'YouTube',
        source: 'OwnerReported',
        basis: 'Owner申告',
        confidence: 'high',
      },
    });

    expect(result.deduped).toBe(false);
    expect(result.signal.record.kind).toBe('YouTube');
  });

  it('dedupes on a repeated idempotencyKey', async () => {
    const useCase = new AddDistractionSignalUseCase(repository);
    const first = await useCase.execute({
      record: {
        occurredAt: '2026-07-18T10:00:00+09:00',
        kind: 'SNS',
        source: 'OwnerReported',
        basis: 'x',
        confidence: 'medium',
        idempotencyKey: 'k-1',
      },
    });
    const second = await useCase.execute({
      record: {
        occurredAt: '2026-07-18T10:05:00+09:00',
        kind: 'SNS',
        source: 'OwnerReported',
        basis: 'x',
        confidence: 'medium',
        idempotencyKey: 'k-1',
      },
    });

    expect(second.deduped).toBe(true);
    expect(second.signal.id).toBe(first.signal.id);
    expect(await repository.findAll()).toHaveLength(1);
  });

  it('filters listing by date and kind', async () => {
    const addUseCase = new AddDistractionSignalUseCase(repository);
    await addUseCase.execute({
      record: {
        occurredAt: '2026-07-17T10:00:00+09:00',
        kind: 'YouTube',
        source: 'OwnerReported',
        basis: 'x',
        confidence: 'low',
      },
    });
    await addUseCase.execute({
      record: {
        occurredAt: '2026-07-18T10:00:00+09:00',
        kind: 'SNS',
        source: 'OwnerReported',
        basis: 'x',
        confidence: 'low',
      },
    });
    await addUseCase.execute({
      record: {
        occurredAt: '2026-07-18T11:00:00+09:00',
        kind: 'YouTube',
        source: 'OwnerReported',
        basis: 'x',
        confidence: 'low',
      },
    });

    const listUseCase = new ListDistractionSignalsUseCase(repository);
    const result = await listUseCase.execute({ limit: 10, date: '2026-07-18', kind: 'YouTube' });

    expect(result.signals).toHaveLength(1);
    expect(result.signals[0]?.record.occurredAt).toBe('2026-07-18T11:00:00+09:00');
  });

  it('rejects a limit above the max', async () => {
    const listUseCase = new ListDistractionSignalsUseCase(repository);
    await expect(listUseCase.execute({ limit: 101 })).rejects.toThrow('limit must not exceed 100');
  });
});
