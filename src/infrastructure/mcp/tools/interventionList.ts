import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Connector } from '../../connector/Connector.js';
import { runTool } from '../toolResult.js';

const INTERVENTION_STATUSES = ['Pending', 'Acknowledged', 'Dismissed', 'Snoozed'] as const;

export function registerInterventionListTool(server: McpServer, connector: Connector): void {
  server.registerTool(
    'intervention_list',
    {
      title: 'List Interventions',
      description:
        'Intervention（決定的ルールエンジンが生成した介入、Version26 行動介入レイヤー）を新しい順に最大limit件取得する。statusで絞り込み可能。生成自体はこのMCP経由では行えない（ローカルスケジューラのみ、ADR 0053）——応答（acknowledge/dismiss/snooze）はproposal_create（type: InterventionResponse）→proposal_approveを使う。',
      inputSchema: {
        limit: z.number().int().positive().describe('取得する最大件数（必須、全件取得禁止、最大100）'),
        status: z.enum(INTERVENTION_STATUSES).optional().describe('状態で絞り込む'),
      },
    },
    async ({ limit, status }) => runTool(() => connector.listInterventions({ limit, status })),
  );
}
