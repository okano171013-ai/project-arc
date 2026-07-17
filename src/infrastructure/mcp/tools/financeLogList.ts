import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Connector } from '../../connector/Connector.js';
import { runTool } from '../toolResult.js';

export function registerFinanceLogListTool(server: McpServer, connector: Connector): void {
  server.registerTool(
    'finance_log_list',
    {
      title: 'List Finance Logs',
      description:
        'FinanceLog（収支の原取引記録、Version25 Life Log Phase 2）を新しい順に最大limit件取得する。date/category/typeで絞り込み可能。カード番号・口座番号・認証情報は記録しないこと。書き込みはproposal_create（type: FinanceLog）→proposal_approveを使う。',
      inputSchema: {
        limit: z.number().int().positive().describe('取得する最大件数（必須、全件取得禁止、最大100）'),
        date: z.string().optional().describe('occurredAtの前方一致（例: 2026-07-17）'),
        category: z.string().optional().describe('カテゴリで絞り込む'),
        type: z.enum(['Income', 'Expense']).optional().describe('収入/支出で絞り込む'),
      },
    },
    async ({ limit, date, category, type }) =>
      runTool(() => connector.listFinanceLogs({ limit, date, category, type })),
  );
}
