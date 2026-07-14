import { describe, it, expect } from 'vitest';
import { AgentMessage } from './AgentMessage.js';

describe('AgentMessage', () => {
  it('creates with the given record (作成)', () => {
    const message = AgentMessage.create({
      id: 'm-1',
      record: { direction: 'ToClaudeCode', content: 'Version17の指示書です', relatedVersion: 'Version17' },
    });
    expect(message.record.direction).toBe('ToClaudeCode');
    expect(message.record.tags).toEqual([]);
  });

  it('throws when content is empty (空contentの拒否)', () => {
    expect(() =>
      AgentMessage.create({ id: 'm-2', record: { direction: 'ToARC', content: '  ' } }),
    ).toThrow('content must not be empty');
  });

  it('restores from persisted fields as-is (restore)', () => {
    const now = new Date('2026-07-14T00:00:00.000Z');
    const message = AgentMessage.restore({
      id: 'm-3',
      record: { direction: 'ToARC', content: 'Feedbackです' },
      createdAt: now,
    });
    expect(message.createdAt).toEqual(now);
    expect(message.record.tags).toEqual([]);
  });
});
