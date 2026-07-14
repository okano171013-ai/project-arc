import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Connector } from '../../connector/Connector.js';
import { runTool } from '../toolResult.js';

export function registerReadReflectionTool(server: McpServer, connector: Connector): void {
  server.registerTool(
    'read_reflection',
    {
      title: 'Read Reflection',
      description:
        '直近のReflection（日々の振り返り）を新しい順に最大limit件取得する。全件取得はできない。',
      inputSchema: {
        limit: z.number().int().positive().describe('取得する最大件数（必須、全件取得禁止）'),
      },
    },
    async ({ limit }) => runTool(() => connector.readReflection(limit)),
  );
}
