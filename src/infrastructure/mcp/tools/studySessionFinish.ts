import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Connector } from '../../connector/Connector.js';
import { runTool } from '../toolResult.js';

export function registerStudySessionFinishTool(server: McpServer, connector: Connector): void {
  server.registerTool(
    'study_session_finish',
    {
      title: 'Finish Study Session',
      description:
        '進行中のStudySessionを終了し、正本のStudySession（study_summary_by_date/study_summary_by_periodの集計対象）へ確定保存する（Version40）。' +
        '呼び出し時点までの経過時間がdurationMsとして記録される——12時間を超える場合は保存に失敗する（非現実的な長さの拒否、Version27から継続する既存の検証）。',
      inputSchema: {
        id: z.string().min(1).describe('study_session_createが返したid'),
      },
    },
    async ({ id }) => runTool(() => connector.finishStudySession(id)),
  );
}
