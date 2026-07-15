import type { ApprovalDecision } from '../../domain/entities/ApprovalDecision.js';

/**
 * ApprovalDecisionRepository（ポート）
 *
 * `delete`は持たない——監査ログは削除せず残す（AgentMessage/
 * ManagementFeedback Repositoryと同じ方針）。
 */
export interface ApprovalDecisionRepository {
  save(decision: ApprovalDecision): Promise<void>;
  findAll(): Promise<ApprovalDecision[]>;
}
