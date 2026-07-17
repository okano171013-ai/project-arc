import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Connector } from '../../connector/Connector.js';
import { runTool } from '../toolResult.js';

export function registerNutritionSummaryByDateTool(server: McpServer, connector: Connector): void {
  server.registerTool(
    'nutrition_summary_by_date',
    {
      title: 'Summarize Nutrition By Date',
      description:
        '指定日のNutritionLogをMealLog経由で紐づけ、日次合計を都度再計算して返す（Version25、原記録とは別の派生集計）。合計値は保存されない。',
      inputSchema: {
        date: z.string().describe('対象日（YYYY-MM-DD、occurredAtの前方一致）'),
      },
    },
    async ({ date }) => runTool(() => connector.summarizeNutritionByDate(date)),
  );
}
