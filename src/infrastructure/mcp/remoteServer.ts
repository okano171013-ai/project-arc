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
 * 認証：`/mcp`エンドポイントへの受信リクエストにBearer認証は
 * **課さない**（ADR 0044、当初のADR 0041の方針を実機接続確認により
 * 訂正）。ChatGPT Developer Modeの「認証なし」モードは
 * `Authorization`ヘッダーを一切送らないため、Bearer必須のままでは
 * ChatGPTから絶対に接続できないことが実機検証で判明した——
 * フルのOAuth 2.1 Authorization Server実装はVersion18のスコープ外の
 * ままとしたため、現実的な選択肢は「認証なしで受け付ける」のみ。
 * **このためトンネル起動中は公開URLを知る誰でもアクセスできる**——
 * 検証後は必ずトンネルを停止すること（`docs/setup/
 * chatgpt-mcp-connection.md`参照）。Connector→ARC Connector HTTP API
 * 間の認証（`ARC_API_KEY`）は本変更と無関係で従来どおり機能する。
 *
 * 重要な前提：このサーバー自身もHTTPサーバーを内包しない
 * Project ARC本体を呼び出す構成——ARC Connector HTTP API
 * （`pnpm run api`）が別プロセスとして起動済みであることが前提
 * （Version16〜17と同じ制約）。実際に外部（ChatGPT）から到達させる
 * には、別途HTTPSトンネル（`docs/setup/chatgpt-mcp-connection.md`
 * 参照）でこのプロセスを公開する必要がある——トンネルサービスへの
 * 契約はOwner自身の操作が必要（安全ガイドライン、ADR 0042）。
 *
 * Version22追記（ADR 0049）：`MCP_OAUTH_ENABLED=true`のときのみ、
 * `LocalOAuthProvider`によるOAuth 2.1試作を有効化する。**既定は
 * false固定**——このフラグを立てない限り、上記の「認証しない」挙動を
 * 1バイトも変えない。本番のngrok/Cloudflareトンネル・実際の`.env`では
 * Version22時点でこのフラグを有効化していない（Owner承認待ち、
 * `docs/setup/remote-mcp-oauth-migration.md`参照）。
 */
import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { pathToFileURL } from 'node:url';
import express from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js';
import { Connector } from '../connector/Connector.js';
import { loadConnectorConfig } from '../connector/connectorConfig.js';
import { loadEnv } from '../config/env.js';
import { buildMcpServer } from './server.js';
import { LocalOAuthProvider } from '../security/oauth/LocalOAuthProvider.js';
import { matchesStudySessionPath, handleStudySessionRequest, type StudySessionRouteOptions } from '../http/studySessionRoute.js';

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const raw = Buffer.concat(chunks).toString('utf-8');
  if (!raw.trim()) return undefined;
  return JSON.parse(raw);
}

export interface RemoteMcpOAuthOptions {
  readonly issuerUrl: URL;
  readonly ownerPasscode: string;
}

/**
 * `oauth`省略時（既定）は、ADR 0044のまま生の`node:http`サーバーを
 * 返す——Version18〜21から1バイトも挙動を変えない。`oauth`指定時のみ
 * Expressで`mcpAuthRouter`（SDK同梱、Version22で追加）を配線する。
 *
 * `studySession`（Version27）はどちらの分岐でも同じ`handleStudySession
 * Request`を呼ぶ——`/mcp`のOAuth有無とは独立した、専用Bearer tokenに
 * よる別の認証境界（ADR 0054）。
 */
export function createRemoteMcpApp(
  connector: Connector,
  oauth?: RemoteMcpOAuthOptions,
  studySession?: StudySessionRouteOptions,
): Server {
  const transports: Record<string, StreamableHTTPServerTransport> = {};
  const studySessionOptions: StudySessionRouteOptions = studySession ?? { apiToken: undefined, allowedOrigins: [] };

  if (!oauth) {
    return createServer((req, res) => {
      const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
      if (matchesStudySessionPath(pathname)) {
        void handleStudySessionRequest(req, res, connector, studySessionOptions);
        return;
      }
      void handleRequest(req, res, connector, transports);
    });
  }

  const provider = new LocalOAuthProvider(oauth.ownerPasscode);
  const app = express();

  app.use((req, res, next) => {
    if (matchesStudySessionPath(req.path)) {
      void handleStudySessionRequest(req, res, connector, studySessionOptions);
      return;
    }
    next();
  });

  // `mcpAuthRouter`配下の各ハンドラ（authorize/token/register/revoke）は
  // 内部で個別にボディパーサーを適用済み（SDK側の実装）。`/mcp`には
  // ボディパーサーを一切適用しない——`readJsonBody`が読むべき生の
  // リクエストストリームを先に消費してしまうと、既存のMCPリクエスト
  // 処理が壊れるため。
  app.use(mcpAuthRouter({ provider, issuerUrl: oauth.issuerUrl, scopesSupported: ['mcp:tools'] }));
  app.post('/authorize/confirm', express.urlencoded({ extended: false }), (req, res) => {
    void provider.handleConfirm(req, res);
  });

  app.all('/mcp', requireBearerAuth({ verifier: provider }), (req, res) => {
    void handleRequest(req, res, connector, transports);
  });

  // ExpressのappはNode標準のリクエストリスナーとして`createServer`に
  // 渡せる——生のhttp.Serverと同じ`.listen()`/`.close()`/`.address()`
  // インターフェースを維持し、既存の呼び出し側（テスト・main）を
  // 変更せずに済む。
  return createServer(app);
}

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  connector: Connector,
  transports: Record<string, StreamableHTTPServerTransport>,
): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost');

  if (url.pathname !== '/mcp') {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'not found' }));
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
  const connector = new Connector(loadConnectorConfig());

  let oauth: RemoteMcpOAuthOptions | undefined;
  if (env.MCP_OAUTH_ENABLED) {
    if (!env.MCP_OAUTH_OWNER_PASSCODE) {
      console.error('MCP_OAUTH_ENABLED=true requires MCP_OAUTH_OWNER_PASSCODE to be set. Exiting.');
      process.exit(1);
    }
    oauth = {
      issuerUrl: new URL(`http://127.0.0.1:${env.MCP_HTTP_PORT}`),
      ownerPasscode: env.MCP_OAUTH_OWNER_PASSCODE,
    };
  }

  const studySession: StudySessionRouteOptions = {
    apiToken: env.STUDY_TIMER_API_TOKEN,
    allowedOrigins: env.STUDY_TIMER_ALLOWED_ORIGINS
      ? env.STUDY_TIMER_ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
      : [],
  };

  const app = createRemoteMcpApp(connector, oauth, studySession);
  app.listen(env.MCP_HTTP_PORT, '127.0.0.1', () => {
    if (oauth) {
      console.error(
        `Project ARC Remote MCP server listening on http://127.0.0.1:${env.MCP_HTTP_PORT}/mcp ` +
          '(OAuth 2.1試作が有効、ADR 0049。ローカルPasscodeゲート経由のみ接続可能)',
      );
    } else {
      console.error(
        `Project ARC Remote MCP server listening on http://127.0.0.1:${env.MCP_HTTP_PORT}/mcp ` +
          '(NO AUTH — anyone who can reach this port/tunnel can call it, see ADR 0044)',
      );
    }
    console.error(
      studySession.apiToken
        ? `  /api/study-sessions is active (allowed origins: ${studySession.allowedOrigins.join(', ') || '(none — non-browser clients only)'})`
        : '  /api/study-sessions is disabled (STUDY_TIMER_API_TOKEN not set, fail-closed)',
    );
  });
}
