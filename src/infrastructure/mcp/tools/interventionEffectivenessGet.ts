import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Connector } from '../../connector/Connector.js';
import { runTool } from '../toolResult.js';

export function registerInterventionEffectivenessGetTool(server: McpServer, connector: Connector): void {
  server.registerTool(
    'intervention_effectiveness_get',
    {
      title: 'Get Intervention Effectiveness',
      description:
        '指定期間のIntervention応答結果（Acknowledged/Dismissed/Snoozed件数、却下率、平均再開時間等、Version26 行動介入レイヤー）を集計する。保存済みデータの機械的な集計のみ——実際の効果測定は実運用データの蓄積が前提。',
      inputSchema: {
        from: z.string().describe('集計開始（ISO8601、generatedAtの下限、含む）'),
        to: z.string().describe('集計終了（ISO8601、generatedAtの上限、含む）'),
      },
    },
    async ({ from, to }) => runTool(() => connector.measureInterventionEffectiveness(from, to)),
  );
}
