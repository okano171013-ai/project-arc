import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { rm } from 'node:fs/promises';
import { createHash, randomBytes } from 'node:crypto';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '../http/server.js';
import { Connector } from '../connector/Connector.js';
import { createRemoteMcpApp } from './remoteServer.js';

/**
 * Version22（Authority Boundary and Secure Approval、ADR 0049）の
 * OAuth 2.1試作をend-to-endで検証する。`MCP_OAUTH_ENABLED`相当の
 * オプションを明示的に渡した場合のみ有効化される経路であり、既存の
 * `remoteServer.test.ts`（flagなし、既定挙動）とは別ファイルに分離
 * して、既存の無認証挙動の回帰確認と混同しないようにする。
 *
 * 実際のHTTPリクエストでDynamic Client Registration→Passcode認可
 * （PKCE）→token交換→bearer保護された`/mcp`呼び出しの一連を駆動する
 * （指示書15章の精神：実物を起動して駆動する）。
 */
describe('Remote MCP Server — OAuth 2.1 prototype (flag on, Version22)', () => {
  const DATA_DIR = 'data/_test-remote-mcp-oauth';
  const API_KEY = 'remote-mcp-oauth-test-key';
  const OWNER_PASSCODE = 'correct-horse-battery-staple';
  const MCP_PORT = 39876; // issuerUrlに自己参照させる必要があるため固定ポートを使う

  let httpApiServer: Server;
  let remoteMcpServer: Server;
  let issuerUrl: URL;

  beforeAll(async () => {
    await rm(DATA_DIR, { recursive: true, force: true });
    httpApiServer = createApp({ dataDir: DATA_DIR, apiKey: API_KEY });
    await new Promise<void>((resolve) => httpApiServer.listen(0, '127.0.0.1', resolve));
    const apiAddress = httpApiServer.address() as AddressInfo;

    const connector = new Connector({ baseUrl: `http://127.0.0.1:${apiAddress.port}`, apiKey: API_KEY });
    issuerUrl = new URL(`http://127.0.0.1:${MCP_PORT}`);
    remoteMcpServer = createRemoteMcpApp(connector, { issuerUrl, ownerPasscode: OWNER_PASSCODE });
    await new Promise<void>((resolve) => remoteMcpServer.listen(MCP_PORT, '127.0.0.1', resolve));
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => remoteMcpServer.close(() => resolve()));
    await new Promise<void>((resolve) => httpApiServer.close(() => resolve()));
    await rm(DATA_DIR, { recursive: true, force: true });
  });

  function pkcePair(): { verifier: string; challenge: string } {
    const verifier = randomBytes(32).toString('base64url');
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    return { verifier, challenge };
  }

  it('rejects /mcp without a Bearer token (無トークンでのアクセス拒否)', async () => {
    const res = await fetch(new URL('/mcp', issuerUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'initialize', id: 1, params: {} }),
    });
    expect(res.status).toBe(401);
  });

  it('rejects /authorize/confirm with the wrong passcode (誤ったPasscodeの拒否)', async () => {
    const register = await fetch(new URL('/register', issuerUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ redirect_uris: ['http://127.0.0.1:1/callback'] }),
    });
    const client = (await register.json()) as { client_id: string };

    const { challenge } = pkcePair();
    const confirm = await fetch(new URL('/authorize/confirm', issuerUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      redirect: 'manual',
      body: new URLSearchParams({
        client_id: client.client_id,
        redirect_uri: 'http://127.0.0.1:1/callback',
        code_challenge: challenge,
        passcode: 'wrong-passcode',
      }),
    });
    expect(confirm.status).toBe(401);
  });

  it('drives DCR -> passcode authorize -> PKCE token exchange -> bearer-protected /mcp call (実HTTPリクエストでの一連)', async () => {
    // 1. Dynamic Client Registration
    const register = await fetch(new URL('/register', issuerUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        redirect_uris: ['http://127.0.0.1:1/callback'],
        client_name: 'Version22 e2e test client',
        token_endpoint_auth_method: 'none', // 公開クライアント（PKCEのみ）、ChatGPT Connectorの実際の登録方式を想定
      }),
    });
    expect(register.status).toBe(201);
    const client = (await register.json()) as { client_id: string };
    expect(client.client_id).toBeTruthy();

    // 2. GET /authorize は最初はPasscodeフォームを返す（リダイレクトしない）
    const { verifier, challenge } = pkcePair();
    const authorizeUrl = new URL('/authorize', issuerUrl);
    authorizeUrl.searchParams.set('client_id', client.client_id);
    authorizeUrl.searchParams.set('redirect_uri', 'http://127.0.0.1:1/callback');
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('code_challenge', challenge);
    authorizeUrl.searchParams.set('code_challenge_method', 'S256');
    authorizeUrl.searchParams.set('state', 'test-state');
    const authorizeGet = await fetch(authorizeUrl, { redirect: 'manual' });
    expect(authorizeGet.status).toBe(200);
    expect(await authorizeGet.text()).toContain('Passcode');

    // 3. POST /authorize/confirm に正しいPasscodeを送るとcode付きでリダイレクトされる
    const confirm = await fetch(new URL('/authorize/confirm', issuerUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      redirect: 'manual',
      body: new URLSearchParams({
        client_id: client.client_id,
        redirect_uri: 'http://127.0.0.1:1/callback',
        code_challenge: challenge,
        state: 'test-state',
        passcode: OWNER_PASSCODE,
      }),
    });
    expect(confirm.status).toBe(302);
    const redirectLocation = new URL(confirm.headers.get('location')!);
    expect(redirectLocation.searchParams.get('state')).toBe('test-state');
    const code = redirectLocation.searchParams.get('code');
    expect(code).toBeTruthy();

    // 4. POST /token でPKCE code_verifierを添えてtoken交換
    const token = await fetch(new URL('/token', issuerUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code!,
        code_verifier: verifier,
        client_id: client.client_id,
        redirect_uri: 'http://127.0.0.1:1/callback',
      }),
    });
    expect(token.status).toBe(200);
    const tokens = (await token.json()) as { access_token: string; refresh_token: string };
    expect(tokens.access_token).toBeTruthy();

    // 5. 発行されたaccess_tokenでbearer保護された/mcpへアクセスできる
    const mcpCall = await fetch(new URL('/mcp', issuerUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        Authorization: `Bearer ${tokens.access_token}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        id: 1,
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'oauth-e2e-test', version: '1.0.0' },
        },
      }),
    });
    expect(mcpCall.status).toBe(200);

    // 6. 誤ったtokenでは/mcpにアクセスできない
    const rejected = await fetch(new URL('/mcp', issuerUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer not-a-real-token' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'initialize', id: 2, params: {} }),
    });
    expect(rejected.status).toBe(401);
  });
});
