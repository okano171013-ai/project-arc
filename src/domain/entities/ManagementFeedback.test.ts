import { describe, it, expect } from 'vitest';
import { ManagementFeedback } from './ManagementFeedback.js';

function makeFeedback() {
  return ManagementFeedback.create({
    id: 'fb-1',
    record: {
      author: 'ARC',
      category: 'Process',
      content: 'Daily Reviewをもっと早い時間に生成してほしい',
      reason: '22時だとOwnerが確認しないまま日付が変わることが多いため',
      tags: ['review'],
    },
  });
}

describe('ManagementFeedback', () => {
  it('creates with resolution Open and resolved=false (作成直後の初期状態)', () => {
    const feedback = makeFeedback();
    expect(feedback.resolution).toBe('Open');
    expect(feedback.resolved).toBe(false);
    expect(feedback.resolvedAt).toBeUndefined();
  });

  it('throws when content is empty (空contentの拒否)', () => {
    expect(() =>
      ManagementFeedback.create({
        id: 'fb-2',
        record: { author: 'ARC', category: 'Process', content: '  ', reason: 'reason' },
      }),
    ).toThrow('content must not be empty');
  });

  it('allows Open -> Accepted -> Implemented -> Closed (正常遷移)', () => {
    const feedback = makeFeedback();
    feedback.transitionTo('Accepted');
    expect(feedback.resolution).toBe('Accepted');
    expect(feedback.resolved).toBe(true);
    expect(feedback.resolvedAt).toBeInstanceOf(Date);

    feedback.transitionTo('Implemented');
    expect(feedback.resolution).toBe('Implemented');

    feedback.transitionTo('Closed');
    expect(feedback.resolution).toBe('Closed');
  });

  it('allows Open -> Rejected as an alternate exit (Rejectedへの離脱)', () => {
    const feedback = makeFeedback();
    feedback.transitionTo('Rejected');
    expect(feedback.resolution).toBe('Rejected');
    expect(feedback.resolved).toBe(true);
  });

  it('rejects illegal transitions such as Open -> Implemented (不正遷移の拒否)', () => {
    const feedback = makeFeedback();
    expect(() => feedback.transitionTo('Implemented')).toThrow(
      'Illegal resolution transition: Open -> Implemented',
    );
  });

  it('rejects any transition out of a terminal state (終端状態からの遷移拒否)', () => {
    const feedback = makeFeedback();
    feedback.transitionTo('Rejected');
    expect(() => feedback.transitionTo('Accepted')).toThrow(
      'Illegal resolution transition: Rejected -> Accepted',
    );
  });

  it('restores from persisted fields as-is (restore)', () => {
    const now = new Date('2026-07-14T00:00:00.000Z');
    const feedback = ManagementFeedback.restore({
      id: 'fb-3',
      record: { author: 'ARC', category: 'Process', content: 'content', reason: 'reason' },
      createdAt: now,
      resolution: 'Accepted',
      resolvedAt: now,
    });
    expect(feedback.resolution).toBe('Accepted');
    expect(feedback.resolvedAt).toEqual(now);
    expect(feedback.record.tags).toEqual([]);
  });
});
