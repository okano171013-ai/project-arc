import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Connector } from '../../connector/Connector.js';
import { runTool } from '../toolResult.js';

export function registerNutritionLogListTool(server: McpServer, connector: Connector): void {
  server.registerTool(
    'nutrition_log_list',
    {
      title: 'List Nutrition Logs',
      description:
        'NutritionLog（栄養推定記録、Version25 Life Log Phase 2）を新しい順に最大limit件取得する。mealLogIdで絞り込み可能。日次合計はnutrition_summary_by_dateで再計算取得する。書き込みはproposal_create（type: NutritionLog）→proposal_approveを使う。',
      inputSchema: {
        limit: z.number().int().positive().describe('取得する最大件数（必須、全件取得禁止、最大100）'),
        mealLogId: z.string().optional().describe('対象MealLogのIDで絞り込む'),
      },
    },
    async ({ limit, mealLogId }) => runTool(() => connector.listNutritionLogs({ limit, mealLogId })),
  );
}
