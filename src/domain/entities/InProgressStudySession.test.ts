import { describe, it, expect } from 'vitest';
import { InProgressStudySession } from './InProgressStudySession.js';

describe('InProgressStudySession (Version40)', () => {
  it('creates with required fields', () => {
    const session = InProgressStudySession.create({
      id: 's-1',
      record: { subject: '刑訴法', startedAt: '2026-07-20T10:00:00.000Z', source: 'mcp' },
    });
    expect(session.record.subject).toBe('刑訴法');
    expect(session.record.task).toBeUndefined();
  });

  it('rejects an empty subject', () => {
    expect(() =>
      InProgressStudySession.create({
        id: 's-1',
        record: { subject: '  ', startedAt: '2026-07-20T10:00:00.000Z', source: 'mcp' },
      }),
    ).toThrow('subject is required');
  });

  it('rejects an invalid startedAt', () => {
    expect(() =>
      InProgressStudySession.create({
        id: 's-1',
        record: { subject: '刑訴法', startedAt: 'not-a-date', source: 'mcp' },
      }),
    ).toThrow('startedAt must be a valid ISO8601 date');
  });

  it('update() patches only the given fields', () => {
    const session = InProgressStudySession.create({
      id: 's-1',
      record: { subject: '刑訴法', task: '判例百選', startedAt: '2026-07-20T10:00:00.000Z', source: 'mcp' },
    });
    session.update({ task: '判例百選 第10版' });
    expect(session.record.subject).toBe('刑訴法');
    expect(session.record.task).toBe('判例百選 第10版');
  });

  it('update() rejects clearing the subject to empty', () => {
    const session = InProgressStudySession.create({
      id: 's-1',
      record: { subject: '刑訴法', startedAt: '2026-07-20T10:00:00.000Z', source: 'mcp' },
    });
    expect(() => session.update({ subject: '  ' })).toThrow('subject is required');
  });
});
