import { describe, it, expect } from 'vitest';
import { AgentTask, MAX_RETRY } from './AgentTask.js';

function baseRecord(overrides: Partial<Parameters<typeof AgentTask.create>[0]['record']> = {}) {
  return {
    relatedVersion: 'Version33',
    title: 'テストtask',
    acceptanceCriteria: ['pnpm testが緑'],
    relatedAdrIds: ['0061'],
    allowedScope: { repository: 'project-arc', branch: 'auto/version33-task1' },
    developmentGrantId: 'grant-1',
    ...overrides,
  };
}

describe('AgentTask', () => {
  it('creates as Proposed with no lease/commits (作成、既定Proposed)', () => {
    const task = AgentTask.create({ id: 't-1', record: baseRecord() });
    expect(task.status).toBe('Proposed');
    expect(task.claimedBy).toBeUndefined();
    expect(task.commits).toEqual([]);
    expect(task.retryCount).toBe(0);
  });

  it('rejects empty title (空titleの拒否)', () => {
    expect(() => AgentTask.create({ id: 't-2', record: baseRecord({ title: '' }) })).toThrow('title must not be empty');
  });

  it('rejects empty acceptanceCriteria (空acceptanceCriteriaの拒否)', () => {
    expect(() =>
      AgentTask.create({ id: 't-3', record: baseRecord({ acceptanceCriteria: [] }) }),
    ).toThrow('acceptanceCriteria must not be empty');
  });

  describe('happy path state machine', () => {
    it('walks Proposed -> Ready -> Claimed -> InProgress -> Review -> Accepted -> Closed', () => {
      const task = AgentTask.create({ id: 't-4', record: baseRecord() });
      task.markReady();
      expect(task.status).toBe('Ready');

      task.claim('claude-code-session-1');
      expect(task.status).toBe('Claimed');
      expect(task.claimedBy).toBe('claude-code-session-1');

      task.start();
      expect(task.status).toBe('InProgress');

      task.recordCommit('abc1234');
      expect(task.commits).toEqual(['abc1234']);

      task.submitForReview({ passed: true, summary: 'all green' });
      expect(task.status).toBe('Review');
      expect(task.testResult).toEqual({ passed: true, summary: 'all green' });

      task.accept();
      expect(task.status).toBe('Accepted');

      task.close();
      expect(task.status).toBe('Closed');
    });

    it('rejects illegal transitions (不正な遷移の拒否)', () => {
      const task = AgentTask.create({ id: 't-5', record: baseRecord() });
      expect(() => task.claim('agent-1')).toThrow('Illegal AgentTask status transition: Proposed -> Claimed');
    });

    it('forbids any transition out of Closed (Closedは最終状態)', () => {
      const task = AgentTask.create({ id: 't-6', record: baseRecord() });
      task.markReady();
      task.claim('agent-1');
      task.start();
      task.submitForReview({ passed: true, summary: 'ok' });
      task.accept();
      task.close();
      expect(() => task.close()).toThrow(/Illegal AgentTask status transition/);
    });
  });

  describe('lease', () => {
    it('extends the lease on heartbeat from the claiming agent (heartbeatによるlease延長)', () => {
      const now = new Date('2026-07-19T00:00:00.000Z');
      const task = AgentTask.create({ id: 't-7', record: baseRecord() });
      task.markReady();
      task.claim('agent-1', now, 1000);
      const firstExpiry = task.leaseExpiresAt!.getTime();

      const later = new Date(now.getTime() + 500);
      task.heartbeat('agent-1', later, 1000);
      expect(task.leaseExpiresAt!.getTime()).toBeGreaterThan(firstExpiry);
    });

    it('rejects heartbeat from a different agent (別Agentによるheartbeat拒否)', () => {
      const task = AgentTask.create({ id: 't-8', record: baseRecord() });
      task.markReady();
      task.claim('agent-1');
      expect(() => task.heartbeat('agent-2')).toThrow('Only the agent that claimed this task may send a heartbeat');
    });

    it('releases the task back to Ready once the lease expires (lease失効時のReady差し戻し)', () => {
      const now = new Date('2026-07-19T00:00:00.000Z');
      const task = AgentTask.create({ id: 't-9', record: baseRecord() });
      task.markReady();
      task.claim('agent-1', now, 1000);

      const afterExpiry = new Date(now.getTime() + 2000);
      const released = task.releaseIfLeaseExpired(afterExpiry);

      expect(released).toBe(true);
      expect(task.status).toBe('Ready');
      expect(task.claimedBy).toBeUndefined();
      expect(task.leaseExpiresAt).toBeUndefined();
    });

    it('is a no-op when the lease has not expired yet (未失効なら何もしない)', () => {
      const now = new Date('2026-07-19T00:00:00.000Z');
      const task = AgentTask.create({ id: 't-10', record: baseRecord() });
      task.markReady();
      task.claim('agent-1', now, 10_000);

      const released = task.releaseIfLeaseExpired(new Date(now.getTime() + 100));
      expect(released).toBe(false);
      expect(task.status).toBe('Claimed');
    });

    it('prevents a second claim while the lease is still active (1 branch 1 writerの機械的強制)', () => {
      const task = AgentTask.create({ id: 't-11', record: baseRecord() });
      task.markReady();
      task.claim('agent-1');
      expect(() => task.claim('agent-2')).toThrow('Illegal AgentTask status transition: Claimed -> Claimed');
    });
  });

  describe('circuit breaker (ADR 0061, AUT-004)', () => {
    it(`auto-closes after ${MAX_RETRY} ChangesRequested cycles instead of looping forever`, () => {
      const task = AgentTask.create({ id: 't-12', record: baseRecord() });
      task.markReady();
      task.claim('agent-1');
      task.start();

      for (let i = 0; i < MAX_RETRY - 1; i += 1) {
        task.submitForReview({ passed: false, summary: `attempt ${i}` });
        task.requestChanges();
        expect(task.status).toBe('ChangesRequested');
        task.resumeAfterChanges();
        expect(task.status).toBe('InProgress');
      }

      // MAX_RETRY回目のrequestChangesはClosedへ自動遷移する。
      task.submitForReview({ passed: false, summary: 'final attempt' });
      task.requestChanges();
      expect(task.status).toBe('Closed');
      expect(task.retryCount).toBe(MAX_RETRY);
    });
  });

  it('restores from persisted fields as-is (restore)', () => {
    const now = new Date('2026-07-19T00:00:00.000Z');
    const lease = new Date('2026-07-19T01:00:00.000Z');
    const task = AgentTask.restore({
      id: 't-13',
      record: baseRecord(),
      createdAt: now,
      status: 'InProgress',
      claimedBy: 'agent-1',
      leaseExpiresAt: lease,
      retryCount: 1,
      commits: ['aaa1111'],
      testResult: undefined,
    });
    expect(task.createdAt).toEqual(now);
    expect(task.status).toBe('InProgress');
    expect(task.claimedBy).toBe('agent-1');
    expect(task.leaseExpiresAt).toEqual(lease);
    expect(task.retryCount).toBe(1);
    expect(task.commits).toEqual(['aaa1111']);
  });
});
