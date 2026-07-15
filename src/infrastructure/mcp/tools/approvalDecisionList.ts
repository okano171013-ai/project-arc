import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Connector } from '../../connector/Connector.js';
import { runTool } from '../toolResult.js';

const LEVELS = ['Level0', 'Level1', 'Level2'] as const;

export function registerApprovalDecisionListTool(server: McpServer, connector: Connector): void {
  server.registerTool(
    'approval_decision_list',
    {
      title: 'List Approval Decisions',
      description:
        'proposal_create/proposal_approve/proposal_rejectのたびに機械的に記録される承認レベル判定の監査ログ（ApprovalDecision）を一覧取得する（Version21、ADR 0048）。levelで絞り込み可能。',
      inputSchema: {
        level: z.enum(LEVELS).optional().describe('レベルで絞り込む（任意）'),
      },
    },
    async ({ level }) => runTool(() => connector.listApprovalDecisions(level)),
  );
}
