import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { rm } from 'node:fs/promises';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '../http/server.js';
import { Connector } from '../connector/Connector.js';
import { createRemoteMcpApp } from './remoteServer.js';

/**
 * Study Session Ingestion（Version27）のend-to-endテスト。実際の
 * HTTPSトンネル・外部タイマーは検証対象外——remoteServer.ts（公開側）
 * が専用tokenで認証し、Connector経由でserver.ts（内部側）へ転送する
 * 一連をローカルで確認する（ADR 0054）。
 */
describe('Remote MCP Server — Study Session Ingestion (Version27)', () => {
  const DATA_DIR = 'data/_test-remote-mcp-study-session';
  const API_KEY = 'internal-api-key';
  const STUDY_TIMER_TOKEN = 'timer-secret-token';
  let httpApiServer: Server;
  let remoteMcpServer: Server;
  let baseUrl: string;

  beforeAll(async () => {
    await rm(DATA_DIR, { recursive: true, force: true });
    httpApiServer = createApp({ dataDir: DATA_DIR, apiKey: API_KEY });
    await new Promise<void>((resolve) => httpApiServer.listen(0, '127.0.0.1', resolve));
    const apiAddress = httpApiServer.address() as AddressInfo;

    const connector = new Connector({ baseUrl: `http://127.0.0.1:${apiAddress.port}`, apiKey: API_KEY });
    remoteMcpServer = createRemoteMcpApp(connector, undefined, {
      apiToken: STUDY_TIMER_TOKEN,
      allowedOrigins: ['https://timer.example.com'],
    });
    await new Promise<void>((resolve) => remoteMcpServer.listen(0, '127.0.0.1', resolve));
    const mcpAddress = remoteMcpServer.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${mcpAddress.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => remoteMcpServer.close(() => resolve()));
    await new Promise<void>((resolve) => httpApiServer.close(() => resolve()));
    await rm(DATA_DIR, { recursive: true, force: true });
  });

  // 実際の壁時計時刻に対して安全に過去となるよう、固定の過去日付を使う
  // （StudySessionは未来のstartedAt/endedAtを拒否するため）。
  const validRecord = {
    sessionId: 'remote-session-1',
    subject: '行政法',
    task: '判例百選',
    startedAt: '2026-07-17T10:00:00.000Z',
    endedAt: '2026-07-17T11:00:00.000Z',
    durationMs: 60 * 60 * 1000,
    source: 'arc-study-timer',
    clientCreatedAt: '2026-07-17T11:00:05.000Z',
  };

  it('rejects a request with no Authorization header', async () => {
    const res = await fetch(`${baseUrl}/api/study-sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validRecord),
    });
    expect(res.status).toBe(401);
  });

  it('rejects a request with the wrong token', async () => {
    const res = await fetch(`${baseUrl}/api/study-sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer wrong-token' },
      body: JSON.stringify(validRecord),
    });
    expect(res.status).toBe(401);
  });

  it('records a session with the correct token, dedupes on resend, and confirms /mcp is unaffected', async () => {
    const first = await fetch(`${baseUrl}/api/study-sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${STUDY_TIMER_TOKEN}` },
      body: JSON.stringify(validRecord),
    });
    expect(first.status).toBe(201);
    const firstJson = (await first.json()) as { ok: boolean; sessionId: string; storedAt: string };
    expect(firstJson.ok).toBe(true);
    expect(firstJson.sessionId).toBe('remote-session-1');

    const second = await fetch(`${baseUrl}/api/study-sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${STUDY_TIMER_TOKEN}` },
      body: JSON.stringify({ ...validRecord, subject: '民訴法' }),
    });
    expect(second.status).toBe(200);
    const secondJson = (await second.json()) as { duplicate: boolean; sessionId: string };
    expect(secondJson.duplicate).toBe(true);

    const summary = await fetch(
      `${baseUrl}/api/study-sessions/summary?from=2026-07-17T00:00:00.000Z&to=2026-07-18T00:00:00.000Z`,
      { headers: { Authorization: `Bearer ${STUDY_TIMER_TOKEN}` } },
    );
    expect(summary.status).toBe(200);
    const summaryJson = (await summary.json()) as { sessionCount: number; totalDurationMs: number };
    expect(summaryJson.sessionCount).toBe(1);
    expect(summaryJson.totalDurationMs).toBe(60 * 60 * 1000);
  });

  it('adds CORS headers only for an allowed origin', async () => {
    const allowed = await fetch(`${baseUrl}/api/study-sessions/summary?from=2026-07-01T00:00:00.000Z&to=2026-07-02T00:00:00.000Z`, {
      headers: { Authorization: `Bearer ${STUDY_TIMER_TOKEN}`, Origin: 'https://timer.example.com' },
    });
    expect(allowed.headers.get('access-control-allow-origin')).toBe('https://timer.example.com');

    const disallowed = await fetch(`${baseUrl}/api/study-sessions/summary?from=2026-07-01T00:00:00.000Z&to=2026-07-02T00:00:00.000Z`, {
      headers: { Authorization: `Bearer ${STUDY_TIMER_TOKEN}`, Origin: 'https://evil.example.com' },
    });
    expect(disallowed.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('responds to an OPTIONS preflight without requiring auth', async () => {
    const res = await fetch(`${baseUrl}/api/study-sessions`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://timer.example.com' },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('https://timer.example.com');
  });

  it('leaves /mcp reachable with no Authorization header (ADR 0044 unaffected)', async () => {
    const res = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'initialize', id: 1, params: {} }),
    });
    expect(res.status).not.toBe(401);
  });
});

describe('Remote MCP Server — Study Session Ingestion default (no token configured)', () => {
  const DATA_DIR = 'data/_test-remote-mcp-study-session-unconfigured';
  let httpApiServer: Server;
  let remoteMcpServer: Server;
  let baseUrl: string;

  beforeAll(async () => {
    await rm(DATA_DIR, { recursive: true, force: true });
    httpApiServer = createApp({ dataDir: DATA_DIR });
    await new Promise<void>((resolve) => httpApiServer.listen(0, '127.0.0.1', resolve));
    const apiAddress = httpApiServer.address() as AddressInfo;

    const connector = new Connector({ baseUrl: `http://127.0.0.1:${apiAddress.port}` });
    remoteMcpServer = createRemoteMcpApp(connector); // studySession省略 = fail-closed
    await new Promise<void>((resolve) => remoteMcpServer.listen(0, '127.0.0.1', resolve));
    const mcpAddress = remoteMcpServer.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${mcpAddress.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => remoteMcpServer.close(() => resolve()));
    await new Promise<void>((resolve) => httpApiServer.close(() => resolve()));
    await rm(DATA_DIR, { recursive: true, force: true });
  });

  it('rejects every request, even with a bearer token supplied by the caller', async () => {
    const res = await fetch(`${baseUrl}/api/study-sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer anything' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(401);
  });
});
