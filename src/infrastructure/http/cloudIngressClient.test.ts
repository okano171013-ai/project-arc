import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { HttpCloudIngressClient } from './cloudIngressClient.js';

/**
 * `HttpCloudIngressClient`のend-to-endテスト。実際のHTTPサーバーを
 * 起動して駆動する。ここでは`cloudflare/src/worker.test.ts`で
 * 別途Miniflareで実機検証済みのWorker実装そのものは再利用せず、
 * 同じ契約（`GET /ingress?status=Accepted`・`POST /ingress/:id/ack`、
 * pull tokenでの認証）を満たす軽量なfake serverで駆動する
 * ——pull clientの責務（HTTPリクエストの組み立て・レスポンス解析・
 * エラー時の例外）だけを検証する目的のため、Worker本体の重い起動
 * コストを持ち込まない。
 */
function startFakeCloudServer(pullToken: string): Promise<{ server: Server; baseUrl: string; ackedIds: string[] }> {
  const ackedIds: string[] = [];
  const records = [
    {
      id: 'cloud-1',
      idempotencyKey: 'idem-1',
      payloadType: 'Reflection',
      payload: { date: '2026-07-20', record: { proudOf: 'fake server test' } },
      clientCreatedAt: '2026-07-20T10:00:00.000Z',
    },
  ];

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${pullToken}`) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'unauthorized' }));
      return;
    }
    if (url.pathname === '/ingress' && url.searchParams.get('status') === 'Accepted' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ records }));
      return;
    }
    const ackMatch = /^\/ingress\/([^/]+)\/ack$/.exec(url.pathname);
    if (ackMatch && req.method === 'POST') {
      ackedIds.push(ackMatch[1] as string);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ acked: ackMatch[1] }));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as AddressInfo;
      resolve({ server, baseUrl: `http://127.0.0.1:${address.port}`, ackedIds });
    });
  });
}

describe('HttpCloudIngressClient (Version38, ADR 0069)', () => {
  const PULL_TOKEN = 'pull-secret';
  let ctx: Awaited<ReturnType<typeof startFakeCloudServer>>;

  beforeEach(async () => {
    ctx = await startFakeCloudServer(PULL_TOKEN);
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => ctx.server.close(() => resolve()));
  });

  it('listAccepted() parses the records including payload', async () => {
    const client = new HttpCloudIngressClient(ctx.baseUrl, PULL_TOKEN);
    const records = await client.listAccepted();
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ id: 'cloud-1', idempotencyKey: 'idem-1', payloadType: 'Reflection' });
    expect((records[0]?.payload as { record?: { proudOf?: string } })?.record?.proudOf).toBe('fake server test');
  });

  it('listAccepted() throws with a clear message on the wrong token', async () => {
    const client = new HttpCloudIngressClient(ctx.baseUrl, 'wrong-token');
    await expect(client.listAccepted()).rejects.toThrow(/HTTP 401/);
  });

  it('ack() sends a POST to the correct URL', async () => {
    const client = new HttpCloudIngressClient(ctx.baseUrl, PULL_TOKEN);
    await client.ack('cloud-1');
    expect(ctx.ackedIds).toEqual(['cloud-1']);
  });

  it('ack() throws on failure', async () => {
    const client = new HttpCloudIngressClient(ctx.baseUrl, 'wrong-token');
    await expect(client.ack('cloud-1')).rejects.toThrow(/HTTP 401/);
  });
});
