import { z } from 'zod';

/**
 * proposal_approve/proposal_rejectが受け取るProposal全体のスキーマ。
 * Write Proposal Layerの「Proposalは保存せず、呼び出し元が全体を
 * 再送する」という制約（ADR 0031）をMCP Tool層でも維持するため、
 * IDだけを渡して承認する経路は用意しない。
 */
export const PROPOSAL_TYPES = [
  'Reflection',
  'Memory',
  'ExternalKnowledge',
  'Appearance',
  'ManagementFeedback',
  'AgentMessage',
] as const;

/**
 * Version21（Approval Policy Engine）：Owner指示書が列挙した6カテゴリに
 * そのまま対応する構造化フラグ。自由記述の`target`/`reason`の意味を
 * 読み取ってレベルを判定することはしない——このsignalsのみが
 * ClassifyApprovalLevelUseCaseの入力になる（ADR 0048）。
 */
export const approvalSignalsShape = z
  .object({
    costImpact: z.boolean().optional().describe('有料サービス・課金・契約'),
    externalExposureChange: z.boolean().optional().describe('外部公開範囲の拡大'),
    authOrSecretChange: z.boolean().optional().describe('認証方式・秘密情報・APIキーの変更'),
    destructive: z.boolean().optional().describe('破壊的操作（不可逆な削除等）'),
    personalDataExternalTransfer: z.boolean().optional().describe('個人情報の外部送信'),
    constitutionOrPrincipleChange: z.boolean().optional().describe('Constitution/Principlesの変更'),
  })
  .optional()
  .describe(
    '承認レベル判定用の構造化フラグ（任意）。省略時はLevel1へエスカレーションされる（ADR 0048）',
  );

export const proposalShape = {
  type: z.enum(PROPOSAL_TYPES).describe('提案の種別'),
  target: z.string().min(1).describe('人間可読な短いラベル'),
  payload: z.record(z.unknown()).describe('typeに対応するrecordを含むデータ'),
  reason: z.string().min(1).describe('なぜこの提案をするのか'),
  createdAt: z.string().describe('proposal_createが返したcreatedAtをそのまま渡す'),
  signals: approvalSignalsShape,
  approvalLevel: z
    .enum(['Level0', 'Level1', 'Level2'])
    .optional()
    .describe('表示用（proposal_createの戻り値）。承認判定はsignalsから再計算されるため無視される'),
};
