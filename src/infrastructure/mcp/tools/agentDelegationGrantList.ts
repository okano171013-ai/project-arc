import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Connector } from '../../connector/Connector.js';
import { runTool } from '../toolResult.js';

const STATUSES = ['Active', 'Paused', 'Revoked'] as const;

export function registerAgentDelegationGrantListTool(server: McpServer, connector: Connector): void {
  server.registerTool(
    'agent_delegation_grant_list',
    {
      title: 'List Agent Delegation Grants',
      description:
        'Ownerが発行したAgentDelegationGrant（生活記録の自動保存を許可する委譲書）を一覧取得する（Version24、Constitution第4条限定改定）。statusで絞り込み可能。書き込みはproposal_create（type: AgentDelegationGrant、payload: {action, record?, id?}）→proposal_approveを使う。',
      inputSchema: {
        status: z.enum(STATUSES).optional().describe('statusで絞り込む（任意）'),
      },
    },
    async ({ status }) => runTool(() => connector.listAgentDelegationGrants(status)),
  );
}
