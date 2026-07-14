import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Connector } from '../../connector/Connector.js';
import { runTool } from '../toolResult.js';
import { proposalShape } from './proposalSchema.js';

export function registerProposalRejectTool(server: McpServer, connector: Connector): void {
  server.registerTool(
    'proposal_reject',
    {
      title: 'Reject Proposal',
      description: 'Ownerが却下したProposalを渡す。何も保存されない。',
      inputSchema: proposalShape,
    },
    async (proposal) => runTool(() => connector.rejectProposal(proposal)),
  );
}
