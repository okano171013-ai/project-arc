import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Connector } from '../../connector/Connector.js';
import { runTool } from '../toolResult.js';

export function registerDailyBehaviorScoreGetTool(server: McpServer, connector: Connector): void {
  server.registerTool(
    'daily_behavior_score_get',
    {
      title: 'Get Daily Behavior Score',
      description:
        '指定日の合成行動スコア（Version26 行動介入レイヤー）を取得する。既存Reflectionスコアにチェックイン実施率・Acknowledged介入の減点を組み合わせた派生指標——Reflection.score()自体は変更しない。前日比・7日/30日比較を含み、データ不足時はavailable: falseで比較不能を明示する。',
      inputSchema: {
        date: z.string().describe('対象日（YYYY-MM-DD）'),
      },
    },
    async ({ date }) => runTool(() => connector.getDailyBehaviorScore(date)),
  );
}
