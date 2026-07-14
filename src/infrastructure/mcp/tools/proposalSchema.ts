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

export const proposalShape = {
  type: z.enum(PROPOSAL_TYPES).describe('提案の種別'),
  target: z.string().min(1).describe('人間可読な短いラベル'),
  payload: z.record(z.unknown()).describe('typeに対応するrecordを含むデータ'),
  reason: z.string().min(1).describe('なぜこの提案をするのか'),
  createdAt: z.string().describe('proposal_createが返したcreatedAtをそのまま渡す'),
};
