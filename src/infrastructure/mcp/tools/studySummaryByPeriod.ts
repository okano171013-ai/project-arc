import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Connector } from '../../connector/Connector.js';
import { runTool } from '../toolResult.js';

export function registerStudySummaryByPeriodTool(server: McpServer, connector: Connector): void {
  server.registerTool(
    'study_summary_by_period',
    {
      title: 'Study Summary By Period',
      description:
        '指定した期間[from, to)のStudySession合計時間・科目別内訳を、正本のStudySessionから計算する（Version40）。toは排他的上限——例えば1週間分なら to は8日目の00:00を指定する。' +
        'Timelineの件数が0であることを理由に「学習時間0分」と判定してはいけない——このtoolの結果を必ず使うこと（Owner指示）。',
      inputSchema: {
        from: z.string().describe('期間の開始（ISO8601、含む）'),
        to: z.string().describe('期間の終了（ISO8601、含まない＝排他的上限）'),
      },
    },
    async ({ from, to }) => runTool(() => connector.summarizeStudySessions(from, to)),
  );
}
