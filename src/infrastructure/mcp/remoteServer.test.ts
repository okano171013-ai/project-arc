import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { rm } from 'node:fs/promises';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createApp } from '../http/server.js';
import { Connector } from '../connector/Connector.js';
import { createRemoteMcpApp } from './remoteServer.js';

/**
 * Remote MCP（Streamable HTTP）のend-to-endテスト。指示書15章の
 * 「Remote MCP → Connector → Reflection取得」のローカル版——実際の
 * HTTPSトンネル・ChatGPT接続はClaude Codeでは検証できないため対象外
 * （`docs/reports/Version18_Report.md`参照）。
 */
describe('Remote MCP Server (Streamable HTTP)', () => {
  const DATA_DIR = 'data/_test-remote-mcp';
  const API_KEY = 'remote-mcp-test-key';
  let httpApiServer: Server;
  let remoteMcpServer: Server;
  let mcpUrl: URL;

  beforeAll(async () => {
    await rm(DATA_DIR, { recursive: true, force: true });
    httpApiServer = createApp({ dataDir: DATA_DIR, apiKey: API_KEY });
    await new Promise<void>((resolve) => httpApiServer.listen(0, '127.0.0.1', resolve));
    const apiAddress = httpApiServer.address() as AddressInfo;

    const connector = new Connector({ baseUrl: `http://127.0.0.1:${apiAddress.port}`, apiKey: API_KEY });
    remoteMcpServer = createRemoteMcpApp(connector);
    await new Promise<void>((resolve) => remoteMcpServer.listen(0, '127.0.0.1', resolve));
    const mcpAddress = remoteMcpServer.address() as AddressInfo;
    mcpUrl = new URL(`http://127.0.0.1:${mcpAddress.port}/mcp`);
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => remoteMcpServer.close(() => resolve()));
    await new Promise<void>((resolve) => httpApiServer.close(() => resolve()));
    await rm(DATA_DIR, { recursive: true, force: true });
  });

  function textOf(result: Awaited<ReturnType<Client['callTool']>>): string {
    const content = result.content as Array<{ type: string; text?: string }>;
    return content[0]?.text ?? '';
  }

  it('accepts a connection with no Authorization header at all (ChatGPT No-Auth mode, ADR 0044)', async () => {
    const transport = new StreamableHTTPClientTransport(mcpUrl);
    const client = new Client({ name: 'no-auth-client', version: '1.0.0' });
    await expect(client.connect(transport)).resolves.not.toThrow();
    await client.close();
  });

  it('drives Read -> Proposal -> Approve over real HTTP (指示書15章のローカル版)', async () => {
    const transport = new StreamableHTTPClientTransport(mcpUrl);
    const client = new Client({ name: 'remote-mcp-test-client', version: '1.0.0' });
    await client.connect(transport);

    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toContain('read_reflection');
    expect(tools).toHaveLength(10);

    const reflections = await client.callTool({ name: 'read_reflection', arguments: { limit: 5 } });
    expect(reflections.isError).toBeFalsy();
    expect(JSON.parse(textOf(reflections))).toEqual({ reflections: [] });

    const created = await client.callTool({
      name: 'proposal_create',
      arguments: {
        type: 'AgentMessage',
        target: 'Remote MCP経由のテスト',
        payload: { record: { direction: 'ToClaudeCode', content: 'Remote MCP動作確認' } },
        reason: 'テスト',
      },
    });
    expect(created.isError).toBeFalsy();
    const proposal = JSON.parse(textOf(created));

    const approved = await client.callTool({ name: 'proposal_approve', arguments: proposal });
    expect(approved.isError).toBeFalsy();
    expect(JSON.parse(textOf(approved)).type).toBe('AgentMessage');

    await client.close();
  });
});
