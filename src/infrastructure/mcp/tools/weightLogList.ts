import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Connector } from '../../connector/Connector.js';
import { runTool } from '../toolResult.js';

export function registerWeightLogListTool(server: McpServer, connector: Connector): void {
  server.registerTool(
    'weight_log_list',
    {
      title: 'List Weight Logs',
      description:
        'WeightLog（体重記録、Version25 Life Log Phase 2）を新しい順に最大limit件取得する。dateで絞り込み可能。同日複数計測を許容する（一意性制約なし）。書き込みはproposal_create（type: WeightLog）→proposal_approveを使う。',
      inputSchema: {
        limit: z.number().int().positive().describe('取得する最大件数（必須、全件取得禁止、最大100）'),
        date: z.string().optional().describe('measuredAtの前方一致（例: 2026-07-17）'),
      },
    },
    async ({ limit, date }) => runTool(() => connector.listWeightLogs({ limit, date })),
  );
}
