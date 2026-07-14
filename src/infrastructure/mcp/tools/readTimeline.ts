import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Connector } from '../../connector/Connector.js';
import { runTool } from '../toolResult.js';

export function registerReadTimelineTool(server: McpServer, connector: Connector): void {
  server.registerTool(
    'read_timeline',
    {
      title: 'Read Timeline',
      description:
        '各Logを横断した時系列を新しい順に最大limit件取得する。全件取得はできない。',
      inputSchema: {
        limit: z.number().int().positive().describe('取得する最大件数（必須、全件取得禁止）'),
        since: z.string().optional().describe('この日付以降（YYYY-MM-DD）のみ対象'),
        source: z.string().optional().describe('特定のsourceのみに絞り込む'),
      },
    },
    async ({ limit, since, source }) =>
      runTool(() => connector.readTimeline({ limit, since, source })),
  );
}
