import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Connector } from '../../connector/Connector.js';
import { runTool } from '../toolResult.js';

export function registerInterventionPolicySettingsGetTool(server: McpServer, connector: Connector): void {
  server.registerTool(
    'intervention_policy_settings_get',
    {
      title: 'Get Intervention Policy Settings',
      description:
        '介入ポリシー設定（quiet hours・除外ウィンドウ・1日あたりの通知上限等、Version26 行動介入レイヤー）を取得する。未設定ならOwner確認済みの既定値を返す（isDefault: true）。更新はproposal_create（type: InterventionPolicySettings、常にLevel2）→proposal_approveを使う。',
      inputSchema: {},
    },
    async () => runTool(() => connector.getInterventionPolicySettings()),
  );
}
