import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getMcpCapabilityRegistry } from '../capabilityRegistry.js';

export function registerCapabilityRegistryGetTool(server: McpServer): void {
  server.registerTool(
    'capability_registry_get',
    {
      title: 'Get Project ARC MCP Capability Registry',
      description:
        'Returns the canonical MCP schema version, Project ARC version, build commit, tool names/count, and Proposal types. Use it to detect stale long-lived MCP processes or mismatched local/remote connections.',
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => ({
      content: [{ type: 'text', text: JSON.stringify(getMcpCapabilityRegistry(), null, 2) }],
    }),
  );
}
