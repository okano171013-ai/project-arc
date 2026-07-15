/**
 * ApprovalDecision（Version21、Approval Policy Engine）
 *
 * `WriteProposalGatewayUseCase`のcreateProposal/approveProposal/
 * rejectProposalが呼ばれるたびに機械的に1件記録される監査ログ。
 * AgentMessage（Version17）と同じく状態機械を持たない追記のみの
 * Entity——「判定理由・入力・決定レベル・時刻を監査可能に記録する」
 * （指示書要件1）という要求を、ManagementFeedback/AgentMessageが
 * 確立した既存パターンのまま満たす。
 *
 * `level`はClassifyApprovalLevelUseCaseが`signals`から機械的に導出した
 * 結果をそのまま記録するだけであり、このEntity自身は「正しいか」を
 * 判断しない（Constitution第2条）。
 */

import type { ProposalType } from '../value-objects/Proposal.js';
import type { ApprovalLevel, ApprovalSignals } from '../value-objects/ApprovalLevel.js';

export type ApprovalDecisionStage = 'Proposed' | 'Approved' | 'Rejected';

export interface ApprovalDecisionRecord {
  readonly stage: ApprovalDecisionStage;
  readonly proposalType: ProposalType;
  readonly target: string;
  readonly level: ApprovalLevel;
  /** ClassifyApprovalLevelUseCaseが機械的に生成した理由文。 */
  readonly reason: string;
  readonly triggeredSignals: string[];
  readonly signals: ApprovalSignals;
}

export class ApprovalDecision {
  private constructor(
    private readonly _id: string,
    private readonly _record: ApprovalDecisionRecord,
    private readonly _createdAt: Date,
  ) {}

  static create(params: { id: string; record: ApprovalDecisionRecord; createdAt?: Date }): ApprovalDecision {
    if (params.record.target.trim().length === 0) {
      throw new Error('target must not be empty');
    }
    return new ApprovalDecision(params.id, params.record, params.createdAt ?? new Date());
  }

  static restore(params: { id: string; record: ApprovalDecisionRecord; createdAt: Date }): ApprovalDecision {
    return new ApprovalDecision(params.id, params.record, params.createdAt);
  }

  get id(): string {
    return this._id;
  }

  get record(): ApprovalDecisionRecord {
    return this._record;
  }

  get createdAt(): Date {
    return this._createdAt;
  }
}
