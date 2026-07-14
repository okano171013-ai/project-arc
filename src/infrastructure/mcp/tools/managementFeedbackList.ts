import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Connector } from '../../connector/Connector.js';
import { runTool } from '../toolResult.js';
import { RESOLUTIONS } from './resolutionSchema.js';

export function registerManagementFeedbackListTool(server: McpServer, connector: Connector): void {
  server.registerTool(
    'management_feedback_list',
    {
      title: 'List Management Feedback',
      description:
        'ARC視点のProject ARC運用改善提案（ManagementFeedback）を一覧取得する。resolutionで絞り込み可能。',
      inputSchema: {
        resolution: z.enum(RESOLUTIONS).optional().describe('resolutionで絞り込む（任意）'),
      },
    },
    async ({ resolution }) => runTool(() => connector.listFeedback(resolution)),
  );
}
