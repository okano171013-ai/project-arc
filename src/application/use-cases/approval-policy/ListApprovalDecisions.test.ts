import { describe, it, expect, beforeEach } from 'vitest';
import { ListApprovalDecisionsUseCase } from './ListApprovalDecisions.js';
import { RecordApprovalDecisionUseCase } from './RecordApprovalDecision.js';
import type { ApprovalDecision } from '../../../domain/entities/ApprovalDecision.js';
import type { ApprovalDecisionRepository } from '../../ports/ApprovalDecisionRepository.js';

class FakeApprovalDecisionRepository implements ApprovalDecisionRepository {
  store = new Map<string, ApprovalDecision>();
  async save(decision: ApprovalDecision): Promise<void> {
    this.store.set(decision.id, decision);
  }
  async findAll(): Promise<ApprovalDecision[]> {
    return [...this.store.values()];
  }
}

describe('ListApprovalDecisionsUseCase', () => {
  let repo: FakeApprovalDecisionRepository;

  beforeEach(() => {
    repo = new FakeApprovalDecisionRepository();
  });

  it('lists newest-first and filters by level (新しい順・levelで絞り込み)', async () => {
    const record = new RecordApprovalDecisionUseCase(repo);

    await record.execute({
      record: {
        stage: 'Proposed',
        proposalType: 'Memory',
        target: '1件目',
        level: 'Level0',
        reason: 'Level2該当signalなし',
        triggeredSignals: [],
        signals: {},
      },
    });
    await new Promise((r) => setTimeout(r, 2));
    await record.execute({
      record: {
        stage: 'Proposed',
        proposalType: 'AgentMessage',
        target: '2件目',
        level: 'Level2',
        reason: 'Level2該当signal: costImpact',
        triggeredSignals: ['costImpact'],
        signals: { costImpact: true },
      },
    });

    const list = new ListApprovalDecisionsUseCase(repo);
    const all = await list.execute();
    expect(all.decisions.map((d) => d.record.target)).toEqual(['2件目', '1件目']);

    const level2Only = await list.execute({ level: 'Level2' });
    expect(level2Only.decisions).toHaveLength(1);
    expect(level2Only.decisions[0]?.record.target).toBe('2件目');
  });
});
