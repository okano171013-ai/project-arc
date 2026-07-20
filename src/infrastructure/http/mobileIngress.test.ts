import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { rm, readFile } from 'node:fs/promises';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createMobileIngressApp, validateExposureConfig, MAX_BODY_BYTES } from './mobileIngress.js';

/**
 * Mobile Ingress（ローカルMVP、Version35）のend-to-endテスト。実際に
 * HTTPサーバーを起動し、実HTTPリクエストで駆動する
 * （指示書15章の精神）。
 */
describe('ARC Mobile Ingress (local MVP)', () => {
  const DATA_DIR = 'data/_test-mobile-ingress';
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    await rm(DATA_DIR, { recursive: true, force: true });
    server = createMobileIngressApp(DATA_DIR);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(DATA_DIR, { recursive: true, force: true });
  });

  it('GET /health returns ok', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('POST /ingress accepts a record and GET /ingress lists it', async () => {
    const res = await fetch(`${baseUrl}/ingress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey: 'http-test-1',
        payloadType: 'Reflection',
        payload: { date: '2026-07-19', record: { proudOf: '実機テスト' } },
        clientCreatedAt: '2026-07-19T21:00:00.000Z',
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { status: string; duplicate: boolean };
    expect(body.status).toBe('Accepted');
    expect(body.duplicate).toBe(false);

    const list = await fetch(`${baseUrl}/ingress`);
    const listBody = (await list.json()) as { records: Array<{ idempotencyKey: string }> };
    expect(listBody.records.some((r) => r.idempotencyKey === 'http-test-1')).toBe(true);
  });

  it('resubmitting the same idempotencyKey returns 200, not a duplicate record', async () => {
    const submit = () =>
      fetch(`${baseUrl}/ingress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey: 'http-test-2',
          payloadType: 'Reflection',
          payload: { date: '2026-07-18', record: { proudOf: '1回目' } },
          clientCreatedAt: '2026-07-18T21:00:00.000Z',
        }),
      });

    const first = await submit();
    expect(first.status).toBe(201);
    const second = await submit();
    expect(second.status).toBe(200);
    const secondBody = (await second.json()) as { duplicate: boolean };
    expect(secondBody.duplicate).toBe(true);

    const list = await fetch(`${baseUrl}/ingress?status=Accepted`);
    const listBody = (await list.json()) as { records: Array<{ idempotencyKey: string }> };
    expect(listBody.records.filter((r) => r.idempotencyKey === 'http-test-2')).toHaveLength(1);
  });

  it('rejects a request missing required fields', async () => {
    const res = await fetch(`${baseUrl}/ingress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idempotencyKey: 'incomplete' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown routes', async () => {
    const res = await fetch(`${baseUrl}/unknown`);
    expect(res.status).toBe(404);
  });

  it('GET / serves the Quick Capture HTML form (Version36)', async () => {
    const res = await fetch(`${baseUrl}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    const html = await res.text();
    expect(html).toContain('<form id="f">');
    expect(html).toContain("fetch('/ingress'");
  });

  it('GET / sends a nonce-based CSP with no unsafe-inline (Version39)', async () => {
    const res = await fetch(`${baseUrl}/`);
    const csp = res.headers.get('content-security-policy');
    expect(csp).toBeTruthy();
    expect(csp).not.toContain('unsafe-inline');
    expect(csp).toMatch(/script-src 'nonce-[A-Za-z0-9+/=]+'/);
    const html = await res.text();
    const nonceMatch = /nonce-([A-Za-z0-9+/=]+)/.exec(csp ?? '');
    expect(nonceMatch).not.toBeNull();
    // HTML内の<script>/<style>タグが同じnonceを使っていることを確認する。
    expect(html).toContain(`<script nonce="${nonceMatch?.[1]}">`);
    expect(html).toContain(`<style nonce="${nonceMatch?.[1]}">`);
  });

  it('GET / never embeds a token value or secret in the page (Version39)', async () => {
    const res = await fetch(`${baseUrl}/`);
    const html = await res.text();
    // トークン欄は必ず空のpassword inputとして始まり、サーバー側の
    // MOBILE_INGRESS_API_TOKEN等の値がHTMLへ焼き込まれていないことを確認する。
    expect(html).toContain('id="tokenInput"');
    expect(html).not.toMatch(/value="[^"]+"\s+id="tokenInput"/);
    expect(html).not.toMatch(/id="tokenInput"[^>]*value="[^"]+"/);
  });

  it('GET /ingress?idempotencyKey= returns only the matching record (Version37 read contract)', async () => {
    await fetch(`${baseUrl}/ingress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey: 'lookup-test-1',
        payloadType: 'Reflection',
        payload: { date: '2026-07-19', record: { proudOf: '状態確認テスト' } },
        clientCreatedAt: '2026-07-19T21:00:00.000Z',
      }),
    });

    const res = await fetch(`${baseUrl}/ingress?idempotencyKey=lookup-test-1`);
    const body = (await res.json()) as { records: Array<{ idempotencyKey: string }> };
    expect(body.records).toHaveLength(1);
    expect(body.records[0]?.idempotencyKey).toBe('lookup-test-1');

    const empty = await fetch(`${baseUrl}/ingress?idempotencyKey=no-such-key`);
    const emptyBody = (await empty.json()) as { records: unknown[] };
    expect(emptyBody.records).toHaveLength(0);
  });

  it('rejects an oversized request body with 413 (Version37)', async () => {
    const res = await fetch(`${baseUrl}/ingress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey: 'too-big',
        payloadType: 'Reflection',
        payload: { date: '2026-07-19', record: { notes: 'x'.repeat(MAX_BODY_BYTES + 1) } },
        clientCreatedAt: '2026-07-19T21:00:00.000Z',
      }),
    });
    expect(res.status).toBe(413);
  });

  it('appends an audit log entry for accepted and rejected requests (Version37)', async () => {
    await fetch(`${baseUrl}/ingress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idempotencyKey: 'incomplete-for-audit' }),
    });
    const log = await readFile(`${DATA_DIR}/logs/mobile-ingress-audit.log`, 'utf-8');
    const lines = log.trim().split('\n').map((l) => JSON.parse(l) as { outcome: string; status: number });
    expect(lines.some((l) => l.outcome === 'accepted')).toBe(true);
    expect(lines.some((l) => l.outcome === 'rejected' && l.status === 400)).toBe(true);
    // Authorizationヘッダーの値そのものはログに含めない
    expect(log).not.toContain('Bearer');
  });
});

describe('ARC Mobile Ingress — auth, rate limit (Version37)', () => {
  const DATA_DIR = 'data/_test-mobile-ingress-auth';
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    await rm(DATA_DIR, { recursive: true, force: true });
    server = createMobileIngressApp(DATA_DIR, { apiToken: 'secret-token', rateLimitMax: 2 });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(DATA_DIR, { recursive: true, force: true });
  });

  const validBody = () =>
    JSON.stringify({
      idempotencyKey: `auth-test-${Math.random()}`,
      payloadType: 'Reflection',
      payload: { date: '2026-07-19', record: { proudOf: '認証テスト' } },
      clientCreatedAt: '2026-07-19T21:00:00.000Z',
    });

  it('rejects POST /ingress with no Authorization header (401)', async () => {
    const res = await fetch(`${baseUrl}/ingress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: validBody(),
    });
    expect(res.status).toBe(401);
  });

  it('rejects POST /ingress with the wrong token (401)', async () => {
    const res = await fetch(`${baseUrl}/ingress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer wrong-token' },
      body: validBody(),
    });
    expect(res.status).toBe(401);
  });

  it('rejects GET /ingress with no Authorization header (401)', async () => {
    const res = await fetch(`${baseUrl}/ingress`);
    expect(res.status).toBe(401);
  });

  it('accepts requests with the correct token', async () => {
    const res = await fetch(`${baseUrl}/ingress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer secret-token' },
      body: validBody(),
    });
    expect(res.status).toBe(201);
  });

  it('GET / and GET /health stay open without a token (unauthenticated routes are unaffected)', async () => {
    expect((await fetch(`${baseUrl}/health`)).status).toBe(200);
    expect((await fetch(`${baseUrl}/`)).status).toBe(200);
  });

  it('rate-limits after rateLimitMax requests within the window (429)', async () => {
    const authed = () =>
      fetch(`${baseUrl}/ingress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer secret-token' },
        body: validBody(),
      });
    // rateLimitMax=2、上のテストで既に何回か消費済みの可能性があるため、
    // 十分な回数送って429が含まれることだけを確認する（送信順は仮定しない）
    const results = await Promise.all([authed(), authed(), authed(), authed(), authed()]);
    const statuses = results.map((r) => r.status);
    expect(statuses).toContain(429);
  });
});

describe('ARC Mobile Ingress — least privilege GET /ingress (Version38)', () => {
  const DATA_DIR = 'data/_test-mobile-ingress-least-privilege';
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    await rm(DATA_DIR, { recursive: true, force: true });
    // rateLimitMaxを高めに設定し、rate limitのテストとは別の関心事
    // （最小権限）だけを検証する。
    server = createMobileIngressApp(DATA_DIR, { apiToken: 'least-priv-token', rateLimitMax: 100 });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(DATA_DIR, { recursive: true, force: true });
  });

  it('rejects authenticated GET /ingress without idempotencyKey (400, least privilege)', async () => {
    const res = await fetch(`${baseUrl}/ingress`, { headers: { Authorization: 'Bearer least-priv-token' } });
    expect(res.status).toBe(400);
  });

  it('rejects authenticated GET /ingress?status=Accepted without idempotencyKey too', async () => {
    const res = await fetch(`${baseUrl}/ingress?status=Accepted`, {
      headers: { Authorization: 'Bearer least-priv-token' },
    });
    expect(res.status).toBe(400);
  });

  it('allows authenticated GET /ingress?idempotencyKey= (own submission status)', async () => {
    const submit = await fetch(`${baseUrl}/ingress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer least-priv-token' },
      body: JSON.stringify({
        idempotencyKey: 'least-privilege-check',
        payloadType: 'Reflection',
        payload: { date: '2026-07-19', record: { proudOf: '最小権限テスト' } },
        clientCreatedAt: '2026-07-19T21:00:00.000Z',
      }),
    });
    expect([200, 201]).toContain(submit.status);

    const res = await fetch(`${baseUrl}/ingress?idempotencyKey=least-privilege-check`, {
      headers: { Authorization: 'Bearer least-priv-token' },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { records: unknown[] };
    expect(body.records).toHaveLength(1);
  });
});

describe('validateExposureConfig (Version37)', () => {
  it('does not throw for the default 127.0.0.1 host, with or without a token', () => {
    expect(() => validateExposureConfig('127.0.0.1', undefined)).not.toThrow();
    expect(() => validateExposureConfig('127.0.0.1', 'some-token')).not.toThrow();
  });

  it('throws when the host is changed from 127.0.0.1 without an API token (fail-closed)', () => {
    expect(() => validateExposureConfig('0.0.0.0', undefined)).toThrow(/MOBILE_INGRESS_API_TOKEN/);
  });

  it('does not throw when the host is changed and an API token is set', () => {
    expect(() => validateExposureConfig('0.0.0.0', 'some-token')).not.toThrow();
  });
});
