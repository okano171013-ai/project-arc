import { describe, it, expect, beforeEach } from 'vitest';
import { RecordStudySessionUseCase } from './RecordStudySession.js';
import { SummarizeStudySessionsUseCase } from './SummarizeStudySessions.js';
import type { StudySessionRepository } from '../../ports/StudySessionRepository.js';
import type { StudySession } from '../../../domain/entities/StudySession.js';

class FakeStudySessionRepository implements StudySessionRepository {
  private store: StudySession[] = [];

  async save(session: StudySession): Promise<void> {
    this.store.push(session);
  }

  async findAll(): Promise<StudySession[]> {
    return [...this.store];
  }
}

const NOW = new Date('2026-07-18T12:00:00.000Z');

function record(overrides: Partial<Parameters<RecordStudySessionUseCase['execute']>[0]['record']> = {}) {
  return {
    sessionId: 'session-1',
    subject: '行政法',
    task: '判例百選',
    startedAt: '2026-07-18T10:00:00.000Z',
    endedAt: '2026-07-18T11:00:00.000Z',
    durationMs: 60 * 60 * 1000,
    source: 'arc-study-timer',
    clientCreatedAt: '2026-07-18T11:00:05.000Z',
    ...overrides,
  };
}

describe('StudySession use cases', () => {
  let repository: FakeStudySessionRepository;

  beforeEach(() => {
    repository = new FakeStudySessionRepository();
  });

  describe('RecordStudySessionUseCase', () => {
    it('records a new session', async () => {
      const useCase = new RecordStudySessionUseCase(repository);
      const result = await useCase.execute({ record: record(), now: NOW });

      expect(result.duplicate).toBe(false);
      expect(result.session.record.subject).toBe('行政法');
    });

    it('dedupes on a repeated sessionId and returns the existing session', async () => {
      const useCase = new RecordStudySessionUseCase(repository);
      const first = await useCase.execute({ record: record(), now: NOW });
      const second = await useCase.execute({ record: record({ subject: '民訴法' }), now: NOW });

      expect(second.duplicate).toBe(true);
      expect(second.session.id).toBe(first.session.id);
      expect(second.session.record.subject).toBe('行政法');
      expect(await repository.findAll()).toHaveLength(1);
    });

    it('propagates validation errors from the entity', async () => {
      const useCase = new RecordStudySessionUseCase(repository);
      await expect(useCase.execute({ record: record({ durationMs: -1 }), now: NOW })).rejects.toThrow(
        'durationMs must be a positive number',
      );
    });
  });

  describe('SummarizeStudySessionsUseCase', () => {
    it('aggregates duration by subject within the [from, to) range', async () => {
      const recordUseCase = new RecordStudySessionUseCase(repository);
      await recordUseCase.execute({
        record: record({ sessionId: 's-1', subject: '行政法', durationMs: 30 * 60 * 1000 }),
        now: NOW,
      });
      await recordUseCase.execute({
        record: record({
          sessionId: 's-2',
          subject: '行政法',
          startedAt: '2026-07-18T09:00:00.000Z',
          endedAt: '2026-07-18T09:20:00.000Z',
          durationMs: 20 * 60 * 1000,
        }),
        now: NOW,
      });
      await recordUseCase.execute({
        record: record({
          sessionId: 's-3',
          subject: '民訴法',
          startedAt: '2026-07-17T10:00:00.000Z',
          endedAt: '2026-07-17T11:00:00.000Z',
          clientCreatedAt: '2026-07-17T11:00:05.000Z',
          durationMs: 45 * 60 * 1000,
        }),
        now: NOW,
      });

      const summaryUseCase = new SummarizeStudySessionsUseCase(repository);
      const result = await summaryUseCase.execute({ from: '2026-07-18T00:00:00.000Z', to: '2026-07-19T00:00:00.000Z' });

      expect(result.sessionCount).toBe(2);
      expect(result.totalDurationMs).toBe(50 * 60 * 1000);
      expect(result.bySubject).toEqual({ '行政法': 50 * 60 * 1000 });
    });

    it('rejects an invalid range', async () => {
      const summaryUseCase = new SummarizeStudySessionsUseCase(repository);
      await expect(
        summaryUseCase.execute({ from: '2026-07-19T00:00:00.000Z', to: '2026-07-18T00:00:00.000Z' }),
      ).rejects.toThrow('to must be after from');
    });
  });
});
