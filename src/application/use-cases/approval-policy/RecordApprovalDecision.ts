import { randomUUID } from 'node:crypto';
import { ApprovalDecision, type ApprovalDecisionRecord } from '../../../domain/entities/ApprovalDecision.js';
import type { ApprovalDecisionRepository } from '../../ports/ApprovalDecisionRepository.js';

export interface RecordApprovalDecisionInput {
  record: ApprovalDecisionRecord;
}

export interface RecordApprovalDecisionOutput {
  decision: ApprovalDecision;
}

/**
 * RecordApprovalDecisionUseCase（Version21、Approval Policy Engine）
 *
 * `WriteProposalGatewayUseCase`のcreate/approve/reject各メソッドから
 * 呼ばれる、機械的な監査ログ書き込み。ManagementFeedback/AgentMessage
 * と異なりWrite Proposal Layer（ADR 0031）を経由しない——このEntity
 * 自体は「まだ実行されていない書き込み意図」ではなく「既に起きた
 * 決定的な計算結果の記録」であり、Owner承認の対象にはならない
 * （ADR 0048）。
 */
export class RecordApprovalDecisionUseCase {
  constructor(private readonly approvalDecisionRepository: ApprovalDecisionRepository) {}

  async execute(input: RecordApprovalDecisionInput): Promise<RecordApprovalDecisionOutput> {
    const decision = ApprovalDecision.create({ id: randomUUID(), record: input.record });
    await this.approvalDecisionRepository.save(decision);
    return { decision };
  }
}
