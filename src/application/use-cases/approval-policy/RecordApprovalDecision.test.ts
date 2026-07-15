import { describe, it, expect, beforeEach } from 'vitest';
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

describe('RecordApprovalDecisionUseCase', () => {
  let repo: FakeApprovalDecisionRepository;

  beforeEach(() => {
    repo = new FakeApprovalDecisionRepository();
  });

  it('creates and persists a decision (作成・保存)', async () => {
    const useCase = new RecordApprovalDecisionUseCase(repo);
    const { decision } = await useCase.execute({
      record: {
        stage: 'Proposed',
        proposalType: 'Memory',
        target: '新しいMemory',
        level: 'Level0',
        reason: 'Level2該当signalなし',
        triggeredSignals: [],
        signals: {},
      },
    });

    expect((await repo.findAll()).map((d) => d.id)).toContain(decision.id);
  });
});
