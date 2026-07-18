import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Connector } from '../../connector/Connector.js';
import { runTool } from '../toolResult.js';

export function registerCheckInListTool(server: McpServer, connector: Connector): void {
  server.registerTool(
    'check_in_list',
    {
      title: 'List Check-Ins',
      description:
        'CheckIn（原則2時間ごとの行動確認記録、Version26 行動介入レイヤー）を新しい順に最大limit件取得する。dateで絞り込み可能。書き込みはproposal_create（type: CheckIn）→proposal_approveを使う。',
      inputSchema: {
        limit: z.number().int().positive().describe('取得する最大件数（必須、全件取得禁止、最大100）'),
        date: z.string().optional().describe('occurredAtの前方一致（例: 2026-07-18）'),
      },
    },
    async ({ limit, date }) => runTool(() => connector.listCheckIns({ limit, date })),
  );
}
