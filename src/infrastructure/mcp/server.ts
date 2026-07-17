#!/usr/bin/env node
/**
 * Project ARC MCP Server（Version16、MCP Integration）
 *
 * ARC（Claude等）が初めてProject ARCを直接利用できるようにする、
 * stdioベースのMCPサーバー。「薄いアダプタ」として実装し、
 * Project ARC本体（Connector/HTTP API/ReadGateway/
 * WriteProposalGateway/UseCase/Domain）には一切手を入れない
 * （ADR 0038）。`Connector`（Version15）のみに依存し、Application/
 * Domain層は一切importしない（ADR 0034の継続）。
 *
 * 重要な前提：このMCPサーバー自身はHTTPサーバーを内包しない。
 * ARC Connector HTTP API（`pnpm run api`）が別プロセスとして
 * 起動済みであることが前提。
 */
import { pathToFileURL } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Connector } from '../connector/Connector.js';
import { loadConnectorConfig } from '../connector/connectorConfig.js';
import { registerReadReflectionTool } from './tools/readReflection.js';
import { registerReadTimelineTool } from './tools/readTimeline.js';
import { registerReadExternalTool } from './tools/readExternal.js';
import { registerReadDecisionTool } from './tools/readDecision.js';
import { registerProposalCreateTool } from './tools/proposalCreate.js';
import { registerProposalApproveTool } from './tools/proposalApprove.js';
import { registerProposalRejectTool } from './tools/proposalReject.js';
import { registerManagementFeedbackListTool } from './tools/managementFeedbackList.js';
import { registerManagementFeedbackResolveTool } from './tools/managementFeedbackResolve.js';
import { registerAgentMessageListTool } from './tools/agentMessageList.js';
import { registerApprovalDecisionListTool } from './tools/approvalDecisionList.js';
import { registerAgentDelegationGrantListTool } from './tools/agentDelegationGrantList.js';
import { registerMealLogListTool } from './tools/mealLogList.js';
import { registerNutritionLogListTool } from './tools/nutritionLogList.js';
import { registerNutritionSummaryByDateTool } from './tools/nutritionSummaryByDate.js';
import { registerWeightLogListTool } from './tools/weightLogList.js';
import { registerFinanceLogListTool } from './tools/financeLogList.js';

export function buildMcpServer(connector: Connector): McpServer {
  const server = new McpServer({ name: 'project-arc', version: '1.0.0' });

  registerReadReflectionTool(server, connector);
  registerReadTimelineTool(server, connector);
  registerReadExternalTool(server, connector);
  registerReadDecisionTool(server, connector);
  registerProposalCreateTool(server, connector);
  registerProposalApproveTool(server, connector);
  registerProposalRejectTool(server, connector);
  registerManagementFeedbackListTool(server, connector);
  registerManagementFeedbackResolveTool(server, connector);
  registerAgentMessageListTool(server, connector);
  registerApprovalDecisionListTool(server, connector);
  registerAgentDelegationGrantListTool(server, connector);
  registerMealLogListTool(server, connector);
  registerNutritionLogListTool(server, connector);
  registerNutritionSummaryByDateTool(server, connector);
  registerWeightLogListTool(server, connector);
  registerFinanceLogListTool(server, connector);

  return server;
}

async function main(): Promise<void> {
  const connector = new Connector(loadConnectorConfig());
  const server = buildMcpServer(connector);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdoutはJSON-RPCチャンネルのため、ログは必ずstderrへ出す。
  console.error('Project ARC MCP server running on stdio');
}

function isMainModule(): boolean {
  return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]!).href;
}

if (isMainModule()) {
  main().catch((error: unknown) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
