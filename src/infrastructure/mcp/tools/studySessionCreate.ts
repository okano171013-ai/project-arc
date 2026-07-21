import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Connector } from '../../connector/Connector.js';
import { runTool } from '../toolResult.js';

export function registerStudySessionCreateTool(server: McpServer, connector: Connector): void {
  server.registerTool(
    'study_session_create',
    {
      title: 'Start Study Session',
      description:
        '「今から勉強する」を開始する（Version40）。既存のProposal承認経路とは独立した直接保存——完了していないセッションのため正本のStudySessionへはまだ書き込まれない。' +
        'study_session_finishを呼ぶまでは日次・期間集計（study_summary_by_date/study_summary_by_period）に含まれない。戻り値のidはstudy_session_update/study_session_finishで使う。',
      inputSchema: {
        subject: z.string().min(1).describe('科目・教材名'),
        task: z.string().optional().describe('今回取り組む具体的なタスク（任意）'),
      },
    },
    async ({ subject, task }) => runTool(() => connector.startStudySession({ subject, task, source: 'mcp' })),
  );
}
