import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { rm } from 'node:fs/promises';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createMobileIngressApp } from './mobileIngress.js';

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
});
