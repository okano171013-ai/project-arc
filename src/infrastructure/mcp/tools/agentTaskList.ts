import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Connector } from '../../connector/Connector.js';
import { runTool } from '../toolResult.js';

const STATUSES = ['Proposed', 'Ready', 'Claimed', 'InProgress', 'Review', 'ChangesRequested', 'Accepted', 'Closed'] as const;

/**
 * agent_task_list（Version34、ADR 0061）
 *
 * 読み取り専用公開のみ。claim/heartbeat/状態遷移等のwrite用MCP
 * Toolは意図的に追加しない（別工程として扱う、権限境界・脅威モデル
 * 再確認後に着手、`docs/security/remote-mcp-threat-model.md`参照）。
 */
export function registerAgentTaskListTool(server: McpServer, connector: Connector): void {
  server.registerTool(
    'agent_task_list',
    {
      title: 'List Agent Tasks',
      description:
        'Program Aの開発task（AgentTask）を一覧取得する（Version34、ADR 0061）。status・relatedVersionで絞り込み可能。読み取り専用——claim/heartbeat/状態遷移等の書き込みはこのMCP Toolでは提供しない（別工程）。',
      inputSchema: {
        status: z.enum(STATUSES).optional().describe('statusで絞り込む（任意）'),
        relatedVersion: z.string().optional().describe('関連Versionで絞り込む（任意、例: "Version34"）'),
      },
    },
    async ({ status, relatedVersion }) => runTool(() => connector.listAgentTasks({ status, relatedVersion })),
  );
}
