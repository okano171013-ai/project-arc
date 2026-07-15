import type { ApprovalDecision } from '../../../domain/entities/ApprovalDecision.js';
import type { ApprovalDecisionRepository } from '../../ports/ApprovalDecisionRepository.js';
import type { ApprovalLevel } from '../../../domain/value-objects/ApprovalLevel.js';

export interface ListApprovalDecisionsInput {
  level?: ApprovalLevel;
}

export interface ListApprovalDecisionsOutput {
  decisions: ApprovalDecision[];
}

export class ListApprovalDecisionsUseCase {
  constructor(private readonly approvalDecisionRepository: ApprovalDecisionRepository) {}

  async execute(input: ListApprovalDecisionsInput = {}): Promise<ListApprovalDecisionsOutput> {
    const all = await this.approvalDecisionRepository.findAll();
    const filtered = all.filter((d) => !input.level || d.record.level === input.level);
    const sorted = [...filtered].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return { decisions: sorted };
  }
}
