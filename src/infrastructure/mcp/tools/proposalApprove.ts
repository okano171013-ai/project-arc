import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Connector } from '../../connector/Connector.js';
import { runTool } from '../toolResult.js';
import { proposalShape } from './proposalSchema.js';

export function registerProposalApproveTool(server: McpServer, connector: Connector): void {
  server.registerTool(
    'proposal_approve',
    {
      title: 'Approve Proposal',
      description:
        'Ownerが承認したProposalを、proposal_createの戻り値そのままで渡す。ここで初めてRepositoryへ書き込まれる。IDだけで承認する経路はない——Proposalは一切保存されていないため。',
      inputSchema: proposalShape,
    },
    async (proposal) => runTool(() => connector.approveProposal(proposal)),
  );
}
