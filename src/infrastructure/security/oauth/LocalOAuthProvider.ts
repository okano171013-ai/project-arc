/**
 * LocalOAuthProvider（Version22、Authority Boundary and Secure Approval）
 *
 * Remote MCPサーバー（ChatGPT接続用、`remoteServer.ts`）向けの、
 * インメモリ・ローカル完結のOAuth 2.1 Authorization Server試作。
 * ADR 0049「認証方式3案比較」でB案として推奨した設計を実装する。
 *
 * 目的はChatGPT Developer Modeの「OAuth」接続モードと噛み合う認可
 * フローを、外部サービス・追加契約・実秘密情報の外部送信なしで
 * 用意すること。認可の実体は「Ownerだけが知るPasscode」
 * （`MCP_OAUTH_OWNER_PASSCODE`、`.env`）であり、このPasscodeは
 * このサーバー自身が返すHTMLフォームからこのサーバー自身へPOSTされる
 * だけで完結する——ChatGPT・Anthropic等いかなる第三者にも送信しない。
 *
 * 重要な制約（ADR 0049）：
 * - インメモリのみ。プロセス再起動で全クライアント・トークンが失効する
 *   （本番運用にはVersion22のスコープ外の永続化が別途必要）。
 * - `MCP_OAUTH_ENABLED`（`remoteServer.ts`側）がtrueの場合のみ
 *   インスタンス化される。デフォルトでは一切ロードされない。
 * - `docs/security/remote-mcp-threat-model.md`・
 *   `docs/adr/0049-version22-authority-boundary-scope.md`参照。
 */
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import type {
  OAuthServerProvider,
  AuthorizationParams,
} from '@modelcontextprotocol/sdk/server/auth/provider.js';
import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';
import type {
  OAuthClientInformationFull,
  OAuthTokenRevocationRequest,
  OAuthTokens,
} from '@modelcontextprotocol/sdk/shared/auth.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { InvalidGrantError, InvalidTokenError } from '@modelcontextprotocol/sdk/server/auth/errors.js';

const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000; // 1時間
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30日
const AUTHORIZATION_CODE_TTL_MS = 5 * 60 * 1000; // 5分

interface PendingAuthorization {
  readonly clientId: string;
  readonly params: AuthorizationParams;
  readonly expiresAt: number;
}

interface StoredAccessToken {
  readonly clientId: string;
  readonly scopes: string[];
  readonly expiresAt: number;
  readonly resource?: URL;
}

interface StoredRefreshToken {
  readonly clientId: string;
  readonly scopes: string[];
  readonly expiresAt: number;
}

class InMemoryClientsStore implements OAuthRegisteredClientsStore {
  private readonly clients = new Map<string, OAuthClientInformationFull>();

  getClient(clientId: string): OAuthClientInformationFull | undefined {
    return this.clients.get(clientId);
  }

  registerClient(
    client: Omit<OAuthClientInformationFull, 'client_id' | 'client_id_issued_at'>,
  ): OAuthClientInformationFull {
    const full: OAuthClientInformationFull = {
      ...client,
      client_id: randomUUID(),
      client_id_issued_at: Math.floor(Date.now() / 1000),
    };
    this.clients.set(full.client_id, full);
    return full;
  }
}

/**
 * タイミング攻撃を避けるため`timingSafeEqual`で比較する。長さが異なる
 * 場合は`timingSafeEqual`が例外を投げるため、先に固定長へ正規化する。
 */
function passcodeMatches(input: string, expected: string): boolean {
  const inputBuf = Buffer.from(input.padEnd(expected.length, '\0'));
  const expectedBuf = Buffer.from(expected.padEnd(expected.length, '\0'));
  if (inputBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(inputBuf, expectedBuf) && input.length === expected.length;
}

export class LocalOAuthProvider implements OAuthServerProvider {
  readonly clientsStore: OAuthRegisteredClientsStore = new InMemoryClientsStore();

  private readonly pendingAuthorizations = new Map<string, PendingAuthorization>();
  private readonly accessTokens = new Map<string, StoredAccessToken>();
  private readonly refreshTokens = new Map<string, StoredRefreshToken>();

  constructor(private readonly ownerPasscode: string) {
    if (!ownerPasscode) {
      throw new Error('LocalOAuthProvider requires a non-empty owner passcode');
    }
  }

  /**
   * SDKの`authorizationHandler`から呼ばれる。redirectはまだ行わず、
   * Passcode入力フォームを直接描画する——フォームの送信先
   * （`/authorize/confirm`）は`remoteServer.ts`側で個別に配線する
   * SDK非経由のルートで、そこで初めてPasscodeを検証しコードを発行する。
   */
  async authorize(client: OAuthClientInformationFull, params: AuthorizationParams, res: Response): Promise<void> {
    if (!client.redirect_uris.includes(params.redirectUri)) {
      res.status(400).send('Unregistered redirect_uri');
      return;
    }
    res.status(200).type('html').send(renderPasscodeForm({ client, params, error: undefined }));
  }

  /**
   * `/authorize/confirm`（SDK非経由、`remoteServer.ts`が配線する独自
   * ルート）から呼ばれる。PasscodeがOwnerのものと一致すれば認可コードを
   * 発行しリダイレクトする。誤りならフォームを再描画する。
   */
  async handleConfirm(req: Request, res: Response): Promise<void> {
    const body = req.body as Record<string, string | undefined>;
    const clientId = body.client_id;
    const codeChallenge = body.code_challenge;
    const redirectUri = body.redirect_uri;
    if (!clientId || !codeChallenge || !redirectUri) {
      res.status(400).send('Missing required fields');
      return;
    }
    const client = await this.clientsStore.getClient(clientId);
    if (!client) {
      res.status(400).send('Unknown client');
      return;
    }
    const params: AuthorizationParams = {
      state: body.state || undefined,
      scopes: body.scopes ? body.scopes.split(' ') : undefined,
      codeChallenge,
      redirectUri,
      resource: body.resource ? new URL(body.resource) : undefined,
    };

    if (!passcodeMatches(body.passcode ?? '', this.ownerPasscode)) {
      res.status(401).type('html').send(renderPasscodeForm({ client, params, error: 'Passcodeが一致しません' }));
      return;
    }

    const code = randomUUID();
    this.pendingAuthorizations.set(code, {
      clientId: client.client_id,
      params,
      expiresAt: Date.now() + AUTHORIZATION_CODE_TTL_MS,
    });

    const redirectTarget = new URL(params.redirectUri);
    redirectTarget.searchParams.set('code', code);
    if (params.state !== undefined) redirectTarget.searchParams.set('state', params.state);
    res.redirect(redirectTarget.toString());
  }

  async challengeForAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
  ): Promise<string> {
    const pending = this.getValidPendingAuthorization(client, authorizationCode);
    return pending.params.codeChallenge;
  }

  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
  ): Promise<OAuthTokens> {
    const pending = this.getValidPendingAuthorization(client, authorizationCode);
    this.pendingAuthorizations.delete(authorizationCode);
    return this.issueTokens(client.client_id, pending.params.scopes ?? [], pending.params.resource);
  }

  async exchangeRefreshToken(
    client: OAuthClientInformationFull,
    refreshToken: string,
    scopes?: string[],
    resource?: URL,
  ): Promise<OAuthTokens> {
    const stored = this.refreshTokens.get(refreshToken);
    if (!stored || stored.clientId !== client.client_id) {
      throw new InvalidGrantError('Invalid refresh token');
    }
    if (stored.expiresAt < Date.now()) {
      this.refreshTokens.delete(refreshToken);
      throw new InvalidGrantError('Refresh token expired');
    }
    // リフレッシュ時に要求されたscopeは、元の付与範囲を超えられない。
    const requestedScopes = scopes ?? stored.scopes;
    const isSubset = requestedScopes.every((scope) => stored.scopes.includes(scope));
    if (!isSubset) {
      throw new InvalidGrantError('Requested scopes exceed the originally granted scopes');
    }
    this.refreshTokens.delete(refreshToken);
    return this.issueTokens(client.client_id, requestedScopes, resource);
  }

  /**
   * `InvalidTokenError`を投げる——`requireBearerAuth`ミドルウェアは
   * このエラー型を明示的に見て401（`WWW-Authenticate`ヘッダー付き）を
   * 返す。通常の`Error`のままだと500として扱われてしまう
   * （SDK側`bearerAuth.js`の実装、実機確認で発覚した挙動）。
   */
  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const stored = this.accessTokens.get(token);
    if (!stored) {
      throw new InvalidTokenError('Invalid access token');
    }
    if (stored.expiresAt < Date.now()) {
      this.accessTokens.delete(token);
      throw new InvalidTokenError('Access token expired');
    }
    return {
      token,
      clientId: stored.clientId,
      scopes: stored.scopes,
      expiresAt: Math.floor(stored.expiresAt / 1000),
      resource: stored.resource,
    };
  }

  async revokeToken(_client: OAuthClientInformationFull, request: OAuthTokenRevocationRequest): Promise<void> {
    this.accessTokens.delete(request.token);
    this.refreshTokens.delete(request.token);
  }

  private getValidPendingAuthorization(
    client: OAuthClientInformationFull,
    authorizationCode: string,
  ): PendingAuthorization {
    const pending = this.pendingAuthorizations.get(authorizationCode);
    if (!pending) {
      throw new InvalidGrantError('Invalid authorization code');
    }
    if (pending.expiresAt < Date.now()) {
      this.pendingAuthorizations.delete(authorizationCode);
      throw new InvalidGrantError('Authorization code expired');
    }
    if (pending.clientId !== client.client_id) {
      throw new InvalidGrantError('Authorization code was not issued to this client');
    }
    return pending;
  }

  private issueTokens(clientId: string, scopes: string[], resource?: URL): OAuthTokens {
    const accessToken = randomBytes(32).toString('base64url');
    const refreshToken = randomBytes(32).toString('base64url');
    this.accessTokens.set(accessToken, {
      clientId,
      scopes,
      expiresAt: Date.now() + ACCESS_TOKEN_TTL_MS,
      resource,
    });
    this.refreshTokens.set(refreshToken, {
      clientId,
      scopes,
      expiresAt: Date.now() + REFRESH_TOKEN_TTL_MS,
    });
    // 失効判定は使用時（exchangeRefreshToken）の遅延評価で行う——
    // `setTimeout`はNode.jsの32bit符号付き整数上限（約24.8日）を
    // REFRESH_TOKEN_TTL_MS（30日）が超えるため使わない。
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'bearer',
      expires_in: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
      scope: scopes.join(' '),
    };
  }
}

function renderPasscodeForm(params: {
  client: OAuthClientInformationFull;
  params: AuthorizationParams;
  error: string | undefined;
}): string {
  const { client, params: authParams, error } = params;
  const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return `<!doctype html>
<html lang="ja">
<head><meta charset="utf-8"><title>Project ARC — Owner確認</title></head>
<body style="font-family: sans-serif; max-width: 28rem; margin: 4rem auto;">
  <h1>Project ARCへのアクセス許可</h1>
  <p>「${escape(client.client_name ?? client.client_id)}」がProject ARCへの
     アクセスを要求しています。Owner本人であることを確認するため、
     Passcodeを入力してください。</p>
  ${error ? `<p style="color:red;">${escape(error)}</p>` : ''}
  <form method="POST" action="/authorize/confirm">
    <input type="hidden" name="client_id" value="${escape(client.client_id)}">
    <input type="hidden" name="redirect_uri" value="${escape(authParams.redirectUri)}">
    <input type="hidden" name="state" value="${escape(authParams.state ?? '')}">
    <input type="hidden" name="code_challenge" value="${escape(authParams.codeChallenge)}">
    <input type="hidden" name="scopes" value="${escape((authParams.scopes ?? []).join(' '))}">
    <input type="hidden" name="resource" value="${escape(authParams.resource?.toString() ?? '')}">
    <label>Passcode: <input type="password" name="passcode" autofocus></label>
    <button type="submit">許可する</button>
  </form>
</body>
</html>`;
}
