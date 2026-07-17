import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Connector } from '../../connector/Connector.js';
import { runTool } from '../toolResult.js';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'other'] as const;

export function registerMealLogListTool(server: McpServer, connector: Connector): void {
  server.registerTool(
    'meal_log_list',
    {
      title: 'List Meal Logs',
      description:
        'MealLog（食事記録、Version25 Life Log Phase 2）を新しい順に最大limit件取得する。dateまたはmealTypeで絞り込み可能。書き込みはproposal_create（type: MealLog）→proposal_approveを使う。',
      inputSchema: {
        limit: z.number().int().positive().describe('取得する最大件数（必須、全件取得禁止、最大100）'),
        date: z.string().optional().describe('occurredAtの前方一致（例: 2026-07-17）'),
        mealType: z.enum(MEAL_TYPES).optional().describe('食事区分で絞り込む'),
      },
    },
    async ({ limit, date, mealType }) => runTool(() => connector.listMealLogs({ limit, date, mealType })),
  );
}
