import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Connector } from '../../connector/Connector.js';
import { runTool } from '../toolResult.js';

const DIRECTIONS = ['ToClaudeCode', 'ToARC'] as const;

export function registerAgentMessageListTool(server: McpServer, connector: Connector): void {
  server.registerTool(
    'agent_message_list',
    {
      title: 'List Agent Messages',
      description:
        'ARC↔Claude Code間の指示書・Feedbackの往復記録（AgentMessage）を一覧取得する。direction/relatedVersionで絞り込み可能。書き込みはproposal_create（type: AgentMessage）→proposal_approveを使う。',
      inputSchema: {
        direction: z.enum(DIRECTIONS).optional().describe('方向で絞り込む（任意）'),
        relatedVersion: z.string().optional().describe('関連Versionで絞り込む（任意、例: "Version17"）'),
      },
    },
    async ({ direction, relatedVersion }) =>
      runTool(() => connector.listAgentMessages(direction, relatedVersion)),
  );
}
