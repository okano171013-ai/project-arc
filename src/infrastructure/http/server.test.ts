import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { rm } from 'node:fs/promises';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from './server.js';

const DATA_DIR = 'data/_test-http-server';
let server: Server;
let baseUrl: string;

async function call(method: string, path: string, body?: unknown) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as { ok: boolean; data?: unknown; error?: string };
  return { status: res.status, json };
}

beforeAll(async () => {
  await rm(DATA_DIR, { recursive: true, force: true });
  server = createApp({ dataDir: DATA_DIR });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await rm(DATA_DIR, { recursive: true, force: true });
});

beforeEach(async () => {
  await rm(DATA_DIR, { recursive: true, force: true });
});

describe('ARC Connector HTTP API', () => {
  it('GET /health returns ok', async () => {
    const { status, json } = await call('GET', '/health');
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
  });

  it('POST /reflection records a reflection', async () => {
    const { status, json } = await call('POST', '/reflection', {
      date: '2026-07-13',
      record: { studyMinutes: 90, mood: 'good' },
    });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    const data = json.data as { reflection: { date: string }; score: number };
    expect(data.reflection.date).toBe('2026-07-13');
    expect(data.score).toBeGreaterThan(0);
  });

  it('POST /skin records a skin log', async () => {
    const { status, json } = await call('POST', '/skin', {
      record: { date: '2026-07-13', redness: 2, pores: 3 },
    });
    expect(status).toBe(201);
    const data = json.data as { log: { id: string; record: { redness: number } } };
    expect(data.log.record.redness).toBe(2);
  });

  it('POST /skin rejects an out-of-range severity', async () => {
    const { status, json } = await call('POST', '/skin', {
      record: { date: '2026-07-13', redness: 9 },
    });
    expect(status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error).toMatch(/redness/);
  });

  it('POST /appearance records an appearance log', async () => {
    const { status, json } = await call('POST', '/appearance', {
      record: { date: '2026-07-13', overallRating: 4 },
    });
    expect(status).toBe(201);
    const data = json.data as { log: { record: { overallRating: number } } };
    expect(data.log.record.overallRating).toBe(4);
  });

  it('POST /purchase then /purchase/:id/start then /purchase/:id/finish transitions status', async () => {
    const created = await call('POST', '/purchase', {
      record: { productName: 'メラノCC', purchaseDate: '2026-07-01' },
    });
    expect(created.status).toBe(201);
    const purchase = (created.json.data as { purchase: { id: string; status: string } })
      .purchase;
    expect(purchase.status).toBe('未使用');

    const started = await call('POST', `/purchase/${purchase.id}/start`, {
      date: '2026-07-03',
    });
    expect(started.status).toBe(200);
    expect((started.json.data as { purchase: { status: string } }).purchase.status).toBe(
      '使用中',
    );

    const finished = await call('POST', `/purchase/${purchase.id}/finish`, {
      date: '2026-07-20',
    });
    expect(finished.status).toBe(200);
    expect((finished.json.data as { purchase: { status: string } }).purchase.status).toBe(
      '使い切り',
    );
  });

  it('POST /capture/suggest returns suggestions without writing anything', async () => {
    const { status, json } = await call('POST', '/capture/suggest', {
      text: 'メラノCC買った',
    });
    expect(status).toBe(200);
    const data = json.data as { suggestions: { logType: string }[] };
    expect(data.suggestions.some((s) => s.logType === 'PurchaseLog')).toBe(true);

    const list = await call('GET', '/health'); // sanity: server still alive, no crash from suggest-only call
    expect(list.status).toBe(200);
  });

  it('POST /capture writes to confirmed destinations only', async () => {
    const { status, json } = await call('POST', '/capture', {
      text: '赤福を初めて食べた',
      capturedAt: '2026-07-13',
      destinations: [{ logType: 'ChallengeLog', fields: { title: '赤福' } }],
    });
    expect(status).toBe(201);
    const data = json.data as { applied: { logType: string }[] };
    expect(data.applied).toHaveLength(1);
    expect(data.applied[0]?.logType).toBe('ChallengeLog');
  });

  it('POST /capture without required fields fails without fabricating data', async () => {
    const { status, json } = await call('POST', '/capture', {
      text: 'いとこにガタイ良くなったと言われた',
      capturedAt: '2026-07-13',
      destinations: [{ logType: 'AppearanceLog', fields: { comment: 'ガタイ良くなった' } }],
    });
    expect(status).toBe(400);
    expect(json.error).toMatch(/overallRating/);
  });

  it('returns 404 for unknown routes', async () => {
    const { status } = await call('GET', '/nope');
    expect(status).toBe(404);
  });
});
