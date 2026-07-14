import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Connector } from '../../connector/Connector.js';
import { runTool } from '../toolResult.js';
import { RESOLUTIONS } from './resolutionSchema.js';

export function registerManagementFeedbackResolveTool(
  server: McpServer,
  connector: Connector,
): void {
  server.registerTool(
    'management_feedback_resolve',
    {
      title: 'Resolve Management Feedback',
      description:
        'ManagementFeedbackのresolutionを遷移させる（Open→Accepted→Implemented→Closed、またはRejected）。不正な遷移はエラーになる。',
      inputSchema: {
        id: z.string().min(1).describe('ManagementFeedbackのID'),
        resolution: z.enum(RESOLUTIONS).describe('遷移先のresolution'),
      },
    },
    async ({ id, resolution }) => runTool(() => connector.resolveFeedback(id, resolution)),
  );
}
