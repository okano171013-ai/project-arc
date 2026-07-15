import { describe, it, expect } from 'vitest';
import { ApprovalDecision } from './ApprovalDecision.js';

describe('ApprovalDecision', () => {
  it('creates with the given record (作成)', () => {
    const decision = ApprovalDecision.create({
      id: 'd-1',
      record: {
        stage: 'Proposed',
        proposalType: 'Memory',
        target: '新しいMemory: シェーバーの買い替え',
        level: 'Level0',
        reason: 'no signals declared',
        triggeredSignals: [],
        signals: {},
      },
    });
    expect(decision.record.level).toBe('Level0');
    expect(decision.record.stage).toBe('Proposed');
  });

  it('throws when target is empty (空targetの拒否)', () => {
    expect(() =>
      ApprovalDecision.create({
        id: 'd-2',
        record: {
          stage: 'Proposed',
          proposalType: 'Memory',
          target: '  ',
          level: 'Level0',
          reason: 'no signals declared',
          triggeredSignals: [],
          signals: {},
        },
      }),
    ).toThrow('target must not be empty');
  });

  it('restores from persisted fields as-is (restore)', () => {
    const now = new Date('2026-07-15T00:00:00.000Z');
    const decision = ApprovalDecision.restore({
      id: 'd-3',
      record: {
        stage: 'Approved',
        proposalType: 'AgentMessage',
        target: 'Version21完了報告',
        level: 'Level2',
        reason: 'authOrSecretChange=true',
        triggeredSignals: ['authOrSecretChange'],
        signals: { authOrSecretChange: true },
      },
      createdAt: now,
    });
    expect(decision.createdAt).toEqual(now);
    expect(decision.record.triggeredSignals).toEqual(['authOrSecretChange']);
  });
});
