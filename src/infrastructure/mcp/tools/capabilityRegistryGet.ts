import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getMcpCapabilityRegistry } from '../capabilityRegistry.js';

export function registerCapabilityRegistryGetTool(server: McpServer): void {
  server.registerTool(
    'capability_registry_get',
    {
      title: 'Get Project ARC MCP Capability Registry',
      description:
        'Returns the canonical MCP schema version, Project ARC version, build commit, tool names/count, and Proposal types. ' +
        'Also returns environment (cwd, data directory, data file count, process start time, uptime seconds) to detect stale long-lived MCP processes or mismatched local/remote/sandbox datastores (Version40, ADR 0072). ' +
        'If the reported toolCount is lower than what this description promises, or environment.dataFileCount is 0 while you expected real data, treat the connection as suspect and ask the Owner to verify which process/tunnel you actually reached.',
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
