import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Connector } from '../../connector/Connector.js';
import { runTool } from '../toolResult.js';

export function registerStudySummaryByDateTool(server: McpServer, connector: Connector): void {
  server.registerTool(
    'study_summary_by_date',
    {
      title: 'Study Summary By Date',
      description:
        '指定した1日（JST基準、startedAtがその日に入るセッション）のStudySession合計時間・科目別内訳を、正本のStudySessionから計算する（Version40）。' +
        'Timelineの件数が0であることを理由に「学習時間0分」と判定してはいけない——このtoolの結果を必ず使うこと（Owner指示）。',
      inputSchema: {
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD').describe('対象日（例: 2026-07-20）'),
      },
    },
    async ({ date }) => {
      const from = new Date(`${date}T00:00:00.000+09:00`);
      const to = new Date(from);
      to.setUTCDate(to.getUTCDate() + 1);
      return runTool(() => connector.summarizeStudySessions(from.toISOString(), to.toISOString()));
    },
  );
}
