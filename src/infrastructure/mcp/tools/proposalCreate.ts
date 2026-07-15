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
        '書き込み提案（Proposal）を組み立てて返すだけで、何も保存しない。保存するには、この戻り値をそのままproposal_approveへ渡し、Ownerの承認を得る必要がある。signalsを渡すと承認レベル（Level0/1/2）が機械的に分類され、戻り値のapprovalLevelに現れる（ADR 0048）。',
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
