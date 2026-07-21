import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Connector } from '../../connector/Connector.js';
import { runTool } from '../toolResult.js';

export function registerStudySessionUpdateTool(server: McpServer, connector: Connector): void {
  server.registerTool(
    'study_session_update',
    {
      title: 'Update Study Session',
      description:
        '進行中のStudySession（study_session_createで開始したもの）の科目・タスクを訂正する（Version40）。開始・終了時刻はここでは変更できない——終了はstudy_session_finishを使う。',
      inputSchema: {
        id: z.string().min(1).describe('study_session_createが返したid'),
        subject: z.string().min(1).optional().describe('訂正後の科目・教材名（任意）'),
        task: z.string().optional().describe('訂正後のタスク（任意）'),
      },
    },
    async ({ id, subject, task }) => runTool(() => connector.updateStudySession({ id, subject, task })),
  );
}
