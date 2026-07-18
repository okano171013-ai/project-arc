/**
 * Proposal（Version14、Write Proposal Layer）
 *
 * ARCが「これを書き込みたい」と提案する内容を表す射影（projection）。
 * DecisionContext（Version12、ADR 0024）・ConversationContext（Version13）
 * と同じ理由でEntityではなくValue Objectとする——ただしこれらが
 * 「読み取り結果の集約」であるのに対し、Proposalは「まだ実行されていない
 * 書き込み意図」である点が異なる。
 *
 * 最大の設計上の制約：Project ARCはProposalを保存しない
 * （Constitution第2条「Systemは判断しない」・第4条「Ownerが最終決定する」）。
 * `WriteProposalGatewayUseCase.createProposal()`が返した値を、呼び出し側
 * （CLI/ARC経由のOwner操作）がそのまま`approveProposal()`/`rejectProposal()`
 * へ再送するステートレスなラウンドトリップでのみ成立する。ADR 0031参照。
 */

import type { ApprovalLevel, ApprovalSignals } from './ApprovalLevel.js';

export type ProposalType =
  | 'Reflection'
  | 'Memory'
  | 'ExternalKnowledge'
  | 'Appearance'
  | 'ManagementFeedback'
  | 'AgentMessage'
  | 'ChallengeLog'
  | 'AgentDelegationGrant'
  | 'MealLog'
  | 'NutritionLog'
  | 'WeightLog'
  | 'FinanceLog'
  | 'CheckIn'
  | 'DistractionSignal'
  | 'InterventionResponse'
  | 'InterventionPolicySettings';

export interface Proposal {
  readonly type: ProposalType;
  /** 人間可読な短いラベル（例：「新しいMemory: シェーバーの買い替え」）。 */
  readonly target: string;
  /**
   * typeに対応する既存Entityの `*Record` 型をそのまま格納する。
   * - Reflection: `{ date: string; record: ReflectionRecord }`
   * - Memory: `{ record: MemoryEntryRecord }`
   * - ExternalKnowledge: `{ record: ExternalKnowledgeInputRecord }`
   * - Appearance: `{ record: AppearanceLogRecord }`
   * - ManagementFeedback: `{ record: ManagementFeedbackRecord }`
   * - AgentMessage: `{ record: AgentMessageRecord }`
   */
  readonly payload: Record<string, unknown>;
  /** なぜこの提案をするのか（ARCの説明）。 */
  readonly reason: string;
  readonly createdAt: string; // ISO8601
  /**
   * 呼び出し側が申告した構造化フラグ（Version21、Approval Policy
   * Engine）。省略可——省略時はClassifyApprovalLevelUseCaseがLevel1へ
   * エスカレーションする（ADR 0048）。
   */
  readonly signals?: ApprovalSignals;
  /**
   * `signals`からcreateProposal時点でサーバー側が計算したレベル。
   * 表示・監査目的のみで、approveProposal/rejectProposalはこの値を
   * 信用せず`signals`から再計算する。
   */
  readonly approvalLevel?: ApprovalLevel;
  /**
   * Version24（Constitution第4条限定改定）：有効な`AgentDelegationGrant`
   * によりOwnerの`do`なしで即時書き込みされた場合のみtrue。
   */
  readonly autoApproved?: boolean;
  /** `autoApproved`がtrueの場合のみ、実行結果（`ApproveProposalOutput.result`相当）を含む。 */
  readonly result?: unknown;
}
