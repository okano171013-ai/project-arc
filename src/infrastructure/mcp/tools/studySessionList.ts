import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Connector } from '../../connector/Connector.js';
import { runTool } from '../toolResult.js';

export function registerStudySessionListTool(server: McpServer, connector: Connector): void {
  server.registerTool(
    'study_session_list',
    {
      title: 'List Study Sessions',
      description:
        '進行中（InProgress）・完了済み（Completed）のStudySessionを新しい順に最大limit件取得する（Version40）。' +
        '「今なにか勉強中か」を確認する場合は、まずstatus: InProgressの有無を見ること——Timelineの件数から学習有無を推測してはいけない（Owner指示、Version40）。dateはCompletedのみに適用（startedAtの前方一致、例: 2026-07-20）。',
      inputSchema: {
        limit: z.number().int().positive().describe('取得する最大件数（必須、全件取得禁止、最大100）'),
        date: z.string().optional().describe('startedAtの前方一致（例: 2026-07-20）、Completedのみに適用'),
      },
    },
    async ({ limit, date }) => runTool(() => connector.listStudySessions({ limit, date })),
  );
}
