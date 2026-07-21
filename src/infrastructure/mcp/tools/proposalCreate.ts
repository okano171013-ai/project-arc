import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Connector } from '../../connector/Connector.js';
import { runTool } from '../toolResult.js';
import { PROPOSAL_TYPES, approvalSignalsShape } from './proposalSchema.js';

export function registerProposalCreateTool(server: McpServer, connector: Connector): void {
  server.registerTool(
    'proposal_create',
    {
      title: 'Create Proposal',
      description:
        '書き込み提案（Proposal）を組み立てて返す。signalsを渡すと承認レベル（Level0/1/2）が機械的に分類され、戻り値のapprovalLevelに現れる（ADR 0048）。' +
        'MealLog/NutritionLog/WeightLog/Reflection/ChallengeLog/CheckIn/DistractionSignal/Appearance/ManagementFeedbackの9型は、' +
        'Ownerが発行済みの有効なAgentDelegationGrant（agent_delegation_grant_list参照）がscopeに含む場合のみ、この呼び出しの時点で即座にRepositoryへ保存される' +
        '（Version40、ADR 0072）。それ以外（FinanceLog・AgentDelegationGrant自体・InterventionPolicySettings・Constitution/Principles変更・認証/秘密情報変更・外部公開拡大・削除等）は、' +
        '常にこの戻り値をそのままproposal_approveへ渡し、Ownerの明示承認（do）を経る必要がある——保存されていない。' +
        '戻り値のautoApproved・saved・verifiedを必ず確認すること：autoApproved!==trueなら未保存（proposal_approveが必要）。' +
        'autoApproved===trueかつsaved===trueかつverified===trueの場合のみ「保存確認済み」と表現してよい。' +
        'autoApproved===trueだがsaved===falseの場合は保存に失敗している——retryQueueId（存在すれば元のidempotencyKeyと同一）を使い、' +
        '同じpayloadで再度proposal_createを呼べば安全に再試行できる（重複保存はされない）。',
      inputSchema: {
        type: z.enum(PROPOSAL_TYPES).describe('提案の種別'),
        target: z.string().min(1).describe('人間可読な短いラベル'),
        payload: z.record(z.unknown()).describe('typeに対応するrecordを含むデータ'),
        reason: z.string().min(1).describe('なぜこの提案をするのか'),
        signals: approvalSignalsShape,
      },
    },
    async ({ type, target, payload, reason, signals }) =>
      runTool(() => connector.createProposal({ type, target, payload, reason, signals })),
  );
}
