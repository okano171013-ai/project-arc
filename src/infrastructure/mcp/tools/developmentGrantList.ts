import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Connector } from '../../connector/Connector.js';
import { runTool } from '../toolResult.js';

const STATUSES = ['Active', 'Paused', 'Revoked'] as const;

/**
 * development_grant_list（Version34、ADR 0060）
 *
 * 読み取り専用公開のみ。create/pause/resume/revokeはOwner専権事項
 * のため、対応するwrite用MCP Toolは意図的に追加しない
 * （別工程として扱う、`docs/security/remote-mcp-threat-model.md`
 * 参照）。
 */
export function registerDevelopmentGrantListTool(server: McpServer, connector: Connector): void {
  server.registerTool(
    'development_grant_list',
    {
      title: 'List Development Grants',
      description:
        'Ownerが発行したDevelopmentGrant（Program Aの開発task継続を許可する委譲書）を一覧取得する（Version34、ADR 0060）。statusで絞り込み可能。読み取り専用——書き込みはこのMCP Toolでは提供しない（Owner専権事項、別工程）。',
      inputSchema: {
        status: z.enum(STATUSES).optional().describe('statusで絞り込む（任意）'),
      },
    },
    async ({ status }) => runTool(() => connector.listDevelopmentGrants(status)),
  );
}
