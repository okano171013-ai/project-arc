#!/usr/bin/env node
/**
 * Project ARC Remote MCP Server（Version18、Remote MCP Integration）
 *
 * ARC（ChatGPT等）がProject ARCへ直接接続できる環境を整える、
 * Streamable HTTP transportのMCPサーバー。stdio版（`server.ts`、
 * Version16、Claude Code用）とは別の新規エントリポイントであり、
 * `.mcp.json`・stdio接続には一切手を入れない（指示書12章
 * 「Claude Codeとの共存」）。
 *
 * SDKの制約：1つの`McpServer`インスタンスは1つのtransportにしか
 * 接続できない（事前調査で確認済み）ため、HTTPセッションごとに
 * `buildMcpServer(connector)`（Version16で既存、変更なし）から
 * 新しいインスタンスを生成する。
 *
 * 認証：`ARC_API_KEY`によるBearer認証を必須とする（stdio/HTTP API
 * のopt-in方針とは異なり、Remote MCPは性質上公開されうるため安全側に
 * 倒す——`ARC_API_KEY`未設定時は起動time エラーで落とす、ADR 0041）。
 * ChatGPT Developer Modeのネイティブな接続方式はOAuth 2.0/2.1または
 * 認証なしであり、静的Bearer Keyの直接入力はサポートされない
 * （事前調査、ADR 0041）——フルのOAuth 2.1 Authorization Serverは
 * Version18のスコープ外とし、この制約は`docs/setup/
 * chatgpt-mcp-connection.md`に明記する。
 *
 * 重要な前提：このサーバー自身もHTTPサーバーを内包しない
 * Project ARC本体を呼び出す構成——ARC Connector HTTP API
 * （`pnpm run api`）が別プロセスとして起動済みであることが前提
 * （Version16〜17と同じ制約）。実際に外部（ChatGPT）から到達させる
 * には、別途HTTPSトンネル（`docs/setup/chatgpt-mcp-connection.md`
 * 参照）でこのプロセスを公開する必要がある——トンネルサービスへの
 * 契約はOwner自身の操作が必要（安全ガイドライン、ADR 0042）。
 */
import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { pathToFileURL } from 'node:url';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { Connector } from '../connector/Connector.js';
import { loadConnectorConfig } from '../connector/connectorConfig.js';
import { isAuthorized } from '../security/apiKeyAuth.js';
import { loadEnv } from '../config/env.js';
import { buildMcpServer } from './server.js';

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const raw = Buffer.concat(chunks).toString('utf-8');
  if (!raw.trim()) return undefined;
  return JSON.parse(raw);
}

export function createRemoteMcpApp(connector: Connector, apiKey: string) {
  const transports: Record<string, StreamableHTTPServerTransport> = {};

  return createServer((req, res) => {
    void handleRequest(req, res, connector, apiKey, transports);
  });
}

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  connector: Connector,
  apiKey: string,
  transports: Record<string, StreamableHTTPServerTransport>,
): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost');

  if (url.pathname !== '/mcp') {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'not found' }));
    return;
  }

  if (!isAuthorized(req.headers.authorization, apiKey)) {
    res.writeHead(401, {
      'Content-Type': 'application/json; charset=utf-8',
      'WWW-Authenticate': 'Bearer',
    });
    res.end(JSON.stringify({ error: 'unauthorized' }));
    return;
  }

  try {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    let transport = sessionId ? transports[sessionId] : undefined;

    if (!transport) {
      if (req.method !== 'POST') {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'no active session' }));
        return;
      }
      const body = await readJsonBody(req);
      if (!isInitializeRequest(body)) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'expected an initialize request' }));
        return;
      }
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => {
          transports[id] = transport!;
        },
      });
      transport.onclose = () => {
        if (transport!.sessionId) delete transports[transport!.sessionId];
      };
      await buildMcpServer(connector).connect(transport);
      await transport.handleRequest(req, res, body);
      return;
    }

    const body = req.method === 'POST' ? await readJsonBody(req) : undefined;
    await transport.handleRequest(req, res, body);
  } catch (error) {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
    }
  }
}

function isMainModule(): boolean {
  return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]!).href;
}

if (isMainModule()) {
  const env = loadEnv();
  if (!env.ARC_API_KEY) {
    console.error(
      'ARC_API_KEY is required to run the Remote MCP server (unlike the local stdio/HTTP API, ' +
        'this endpoint is not opt-in — see ADR 0041). Set it in .env and retry.',
    );
    process.exit(1);
  }

  const connector = new Connector(loadConnectorConfig());
  const app = createRemoteMcpApp(connector, env.ARC_API_KEY);
  app.listen(env.MCP_HTTP_PORT, '127.0.0.1', () => {
    console.error(
      `Project ARC Remote MCP server listening on http://127.0.0.1:${env.MCP_HTTP_PORT}/mcp (Bearer auth required)`,
    );
  });
}
