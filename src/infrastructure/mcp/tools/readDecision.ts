import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Connector } from '../../connector/Connector.js';
import { runTool } from '../toolResult.js';

export function registerReadDecisionTool(server: McpServer, connector: Connector): void {
  server.registerTool(
    'read_decision',
    {
      title: 'Read Decision Support',
      description:
        '質問文から選択肢・比較材料（DecisionContext）を取得する。結論・優先順位はSystemが生成しない。',
      inputSchema: {
        question: z.string().min(1).describe('質問文'),
        limit: z.number().int().positive().describe('取得する最大件数（必須、全件取得禁止）'),
        candidates: z.array(z.string()).optional().describe('明示的な候補（任意）'),
        tags: z.array(z.string()).optional().describe('絞り込むタグ'),
        topics: z.array(z.string()).optional().describe('絞り込むトピック'),
      },
    },
    async ({ question, limit, candidates, tags, topics }) =>
      runTool(() => connector.readDecision({ question, limit, candidates, tags, topics })),
  );
}
