import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response } from 'express';
import { LocalOAuthProvider } from './LocalOAuthProvider.js';
import type { OAuthClientInformationFull } from '@modelcontextprotocol/sdk/shared/auth.js';

function fakeResponse(): Response & { _status?: number; _body?: string; _redirectedTo?: string } {
  const res: Partial<Response> & { _status?: number; _body?: string; _redirectedTo?: string } = {};
  res.status = ((code: number) => {
    res._status = code;
    return res as Response;
  }) as Response['status'];
  res.type = (() => res as Response) as Response['type'];
  res.send = ((body: string) => {
    res._body = body;
    return res as Response;
  }) as Response['send'];
  res.redirect = ((url: string) => {
    res._redirectedTo = url;
  }) as Response['redirect'];
  return res as Response & { _status?: number; _body?: string; _redirectedTo?: string };
}

function fakeRequest(body: Record<string, string>): Request {
  return { body } as Request;
}

describe('LocalOAuthProvider', () => {
  const PASSCODE = 'correct-horse-battery-staple';
  let provider: LocalOAuthProvider;
  let client: OAuthClientInformationFull;

  beforeEach(async () => {
    provider = new LocalOAuthProvider(PASSCODE);
    client = await provider.clientsStore.registerClient!({
      redirect_uris: ['https://chatgpt.example/callback'],
      client_name: 'ChatGPT Connector (test)',
    });
  });

  it('rejects construction with an empty passcode (Passcode必須)', () => {
    expect(() => new LocalOAuthProvider('')).toThrow('non-empty owner passcode');
  });

  it('registers a client via Dynamic Client Registration (DCR)', () => {
    expect(client.client_id).toBeTruthy();
    expect(provider.clientsStore.getClient(client.client_id)).toEqual(client);
  });

  it('authorize() renders a passcode form without redirecting (フォーム表示・未リダイレクト)', async () => {
    const res = fakeResponse();
    await provider.authorize(
      client,
      { codeChallenge: 'challenge-abc', redirectUri: client.redirect_uris[0]! },
      res,
    );
    expect(res._redirectedTo).toBeUndefined();
    expect(res._body).toContain('Passcode');
  });

  it('authorize() rejects an unregistered redirect_uri (未登録redirect_uri拒否)', async () => {
    const res = fakeResponse();
    await provider.authorize(client, { codeChallenge: 'c', redirectUri: 'https://evil.example/cb' }, res);
    expect(res._status).toBe(400);
  });

  it('handleConfirm() redirects with a code when the passcode is correct (正しいPasscode)', async () => {
    const res = fakeResponse();
    await provider.handleConfirm(
      fakeRequest({
        client_id: client.client_id,
        redirect_uri: client.redirect_uris[0]!,
        code_challenge: 'challenge-abc',
        state: 'xyz',
        passcode: PASSCODE,
      }),
      res,
    );
    expect(res._redirectedTo).toBeTruthy();
    const url = new URL(res._redirectedTo!);
    expect(url.searchParams.get('code')).toBeTruthy();
    expect(url.searchParams.get('state')).toBe('xyz');
  });

  it('handleConfirm() re-renders the form (no redirect) when the passcode is wrong (誤ったPasscode)', async () => {
    const res = fakeResponse();
    await provider.handleConfirm(
      fakeRequest({
        client_id: client.client_id,
        redirect_uri: client.redirect_uris[0]!,
        code_challenge: 'challenge-abc',
        passcode: 'wrong',
      }),
      res,
    );
    expect(res._redirectedTo).toBeUndefined();
    expect(res._status).toBe(401);
  });

  async function issueCode(): Promise<string> {
    const res = fakeResponse();
    await provider.handleConfirm(
      fakeRequest({
        client_id: client.client_id,
        redirect_uri: client.redirect_uris[0]!,
        code_challenge: 'challenge-abc',
        scopes: 'mcp:tools',
        passcode: PASSCODE,
      }),
      res,
    );
    return new URL(res._redirectedTo!).searchParams.get('code')!;
  }

  it('challengeForAuthorizationCode() returns the stored PKCE challenge (PKCE challenge保持)', async () => {
    const code = await issueCode();
    await expect(provider.challengeForAuthorizationCode(client, code)).resolves.toBe('challenge-abc');
  });

  it('exchangeAuthorizationCode() issues access+refresh tokens and consumes the code once (コード1回使い切り)', async () => {
    const code = await issueCode();
    const tokens = await provider.exchangeAuthorizationCode(client, code);
    expect(tokens.access_token).toBeTruthy();
    expect(tokens.refresh_token).toBeTruthy();
    expect(tokens.scope).toBe('mcp:tools');

    await expect(provider.exchangeAuthorizationCode(client, code)).rejects.toThrow('Invalid authorization code');
  });

  it('rejects a code exchange from a different client (別clientでのコード使用を拒否)', async () => {
    const code = await issueCode();
    const otherClient = await provider.clientsStore.registerClient!({
      redirect_uris: ['https://other.example/cb'],
    });
    await expect(provider.exchangeAuthorizationCode(otherClient, code)).rejects.toThrow(
      'was not issued to this client',
    );
  });

  it('verifyAccessToken() validates a freshly issued token (発行直後のtoken検証)', async () => {
    const code = await issueCode();
    const tokens = await provider.exchangeAuthorizationCode(client, code);
    const authInfo = await provider.verifyAccessToken(tokens.access_token);
    expect(authInfo.clientId).toBe(client.client_id);
    expect(authInfo.scopes).toEqual(['mcp:tools']);
  });

  it('verifyAccessToken() rejects an unknown token (未知のtokenを拒否)', async () => {
    await expect(provider.verifyAccessToken('does-not-exist')).rejects.toThrow('Invalid access token');
  });

  it('exchangeRefreshToken() issues a new access token (リフレッシュ)', async () => {
    const code = await issueCode();
    const { refresh_token: refreshToken } = await provider.exchangeAuthorizationCode(client, code);
    const refreshed = await provider.exchangeRefreshToken(client, refreshToken!);
    expect(refreshed.access_token).toBeTruthy();
    await expect(provider.verifyAccessToken(refreshed.access_token)).resolves.toBeTruthy();
  });

  it('exchangeRefreshToken() rejects scopes exceeding the original grant (scope拡大の拒否)', async () => {
    const code = await issueCode();
    const { refresh_token: refreshToken } = await provider.exchangeAuthorizationCode(client, code);
    await expect(
      provider.exchangeRefreshToken(client, refreshToken!, ['mcp:tools', 'mcp:admin']),
    ).rejects.toThrow('exceed the originally granted scopes');
  });

  it('exchangeRefreshToken() rejects a refresh token past its 30-day TTL (30日超過での失効、32bit setTimeoutオーバーフロー回避の回帰確認)', async () => {
    const code = await issueCode();
    const { refresh_token: refreshToken } = await provider.exchangeAuthorizationCode(client, code);
    const realNow = Date.now;
    vi.spyOn(Date, 'now').mockImplementation(() => realNow() + 31 * 24 * 60 * 60 * 1000);
    await expect(provider.exchangeRefreshToken(client, refreshToken!)).rejects.toThrow('Refresh token expired');
    vi.restoreAllMocks();
  });

  it('revokeToken() invalidates an access token immediately (即時失効)', async () => {
    const code = await issueCode();
    const tokens = await provider.exchangeAuthorizationCode(client, code);
    await provider.revokeToken!(client, { token: tokens.access_token });
    await expect(provider.verifyAccessToken(tokens.access_token)).rejects.toThrow('Invalid access token');
  });
});
