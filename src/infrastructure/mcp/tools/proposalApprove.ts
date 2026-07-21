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
        'Ownerが承認したProposalを、proposal_createの戻り値そのままで渡す。ここで初めてRepositoryへ書き込まれる。IDだけで承認する経路はない——Proposalは一切保存されていないため。' +
        '既にautoApproved===trueなProposal（proposal_createの時点で自動保存済み）を渡すとエラーになる——二重保存を防ぐため。' +
        '戻り値のsaved・verifiedを確認すること（Version40、ADR 0072）：この呼び出し自体が例外を投げずに返った場合はsaved:trueだが、' +
        'verified（対応する型のみ付与）がtrueで初めてread-after-write検証済みと言える。',
      inputSchema: proposalShape,
    },
    async (proposal) => runTool(() => connector.approveProposal(proposal)),
  );
}
