import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Connector } from '../../connector/Connector.js';
import { runTool } from '../toolResult.js';

export function registerReadExternalTool(server: McpServer, connector: Connector): void {
  server.registerTool(
    'read_external',
    {
      title: 'Read External Knowledge',
      description:
        'External Brain（ExternalKnowledge）をタイトル・タグ・トピック一致のスコア順に最大limit件取得する。全件取得はできない。',
      inputSchema: {
        limit: z.number().int().positive().describe('取得する最大件数（必須、全件取得禁止）'),
        query: z.string().optional().describe('検索キーワード'),
        tags: z.array(z.string()).optional().describe('絞り込むタグ'),
        topics: z.array(z.string()).optional().describe('絞り込むトピック'),
      },
    },
    async ({ limit, query, tags, topics }) =>
      runTool(() => connector.readExternal({ limit, query, tags, topics })),
  );
}
