import { describe, it, expect } from 'vitest';
import { StudySession } from './StudySession.js';

const NOW = new Date('2026-07-18T12:00:00.000Z');

function validRecord(overrides: Partial<Parameters<typeof StudySession.create>[0]['record']> = {}) {
  return {
    sessionId: 'session-1',
    subject: '行政法',
    task: '判例百選',
    startedAt: '2026-07-18T10:00:00.000Z',
    endedAt: '2026-07-18T11:30:00.000Z',
    durationMs: 90 * 60 * 1000,
    source: 'arc-study-timer',
    clientCreatedAt: '2026-07-18T11:30:05.000Z',
    ...overrides,
  };
}

describe('StudySession', () => {
  it('creates with a valid record', () => {
    const session = StudySession.create({ id: 's-1', record: validRecord(), now: NOW });
    expect(session.record.subject).toBe('行政法');
    expect(session.storedAt).toEqual(NOW);
  });

  it('rejects a missing sessionId', () => {
    expect(() => StudySession.create({ id: 's-1', record: validRecord({ sessionId: '' }), now: NOW })).toThrow(
      'sessionId is required',
    );
  });

  it('rejects a missing subject', () => {
    expect(() => StudySession.create({ id: 's-1', record: validRecord({ subject: '  ' }), now: NOW })).toThrow(
      'subject is required',
    );
  });

  it('rejects an invalid startedAt', () => {
    expect(() => StudySession.create({ id: 's-1', record: validRecord({ startedAt: 'nope' }), now: NOW })).toThrow(
      'startedAt must be a valid ISO8601 date',
    );
  });

  it('rejects endedAt at or before startedAt', () => {
    expect(() =>
      StudySession.create({
        id: 's-1',
        record: validRecord({ startedAt: '2026-07-18T10:00:00.000Z', endedAt: '2026-07-18T10:00:00.000Z' }),
        now: NOW,
      }),
    ).toThrow('endedAt must be after startedAt');
  });

  it('rejects a non-positive durationMs', () => {
    expect(() => StudySession.create({ id: 's-1', record: validRecord({ durationMs: 0 }), now: NOW })).toThrow(
      'durationMs must be a positive number',
    );
  });

  it('rejects a durationMs beyond the 12-hour maximum', () => {
    expect(() =>
      StudySession.create({ id: 's-1', record: validRecord({ durationMs: 13 * 60 * 60 * 1000 }), now: NOW }),
    ).toThrow('durationMs must not exceed');
  });

  it('rejects a startedAt more than the tolerance in the future', () => {
    expect(() =>
      StudySession.create({
        id: 's-1',
        record: validRecord({ startedAt: '2026-07-18T12:30:00.000Z', endedAt: '2026-07-18T13:00:00.000Z' }),
        now: NOW,
      }),
    ).toThrow('startedAt must not be in the future');
  });

  it('allows a startedAt within the clock-skew tolerance', () => {
    const session = StudySession.create({
      id: 's-1',
      record: validRecord({
        startedAt: '2026-07-18T12:02:00.000Z',
        endedAt: '2026-07-18T12:04:00.000Z',
        clientCreatedAt: '2026-07-18T12:04:00.000Z',
      }),
      now: NOW,
    });
    expect(session.id).toBe('s-1');
  });

  it('restores without re-validating', () => {
    const session = StudySession.restore({ id: 's-2', record: validRecord({ durationMs: -5 }), storedAt: NOW });
    expect(session.record.durationMs).toBe(-5);
  });
});
