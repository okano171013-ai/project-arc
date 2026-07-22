import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { HttpNotionClient } from './notionClient.js';

/**
 * `HttpNotionClient`のend-to-endテスト。Notion API本体は本サンドボックス
 * から到達できない（ADR 0075「影響」参照、プロキシポリシーで
 * `api.notion.com`への直接HTTP到達性なしを実機確認済み）ため、
 * `HttpCloudIngressClient`のテスト（`cloudIngressClient.test.ts`）と
 * 同様、実際のNotion APIと同じ契約（`POST /v1/databases/:id/query`・
 * `PATCH /v1/pages/:id`、Bearer認証・`Notion-Version`ヘッダー）を
 * 満たす軽量なfake serverで駆動する。
 */
function startFakeNotionServer(
  apiKey: string,
): Promise<{ server: Server; baseUrl: string; patchedPageIds: string[] }> {
  const patchedPageIds: string[] = [];
  const pages = [
    {
      id: 'page-1',
      created_time: '2026-07-21T09:00:00.000Z',
      properties: {
        Name: { type: 'title', title: [] },
        Type: { type: 'select', select: { name: 'Memory' } },
        Payload: {
          type: 'rich_text',
          rich_text: [
            {
              plain_text:
                '{"record":{"category":"Preferences","title":"欲しいもの","content":"fake server test"}}',
            },
          ],
        },
        Date: { type: 'date', date: { start: '2026-07-21' } },
        Synced: { type: 'checkbox', checkbox: false },
      },
    },
  ];

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${apiKey}`) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'unauthorized' }));
      return;
    }
    if (/^\/databases\/[^/]+\/query$/.exec(url.pathname) && req.method === 'POST') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ results: pages }));
      return;
    }
    const patchMatch = /^\/pages\/([^/]+)$/.exec(url.pathname);
    if (patchMatch && req.method === 'PATCH') {
      patchedPageIds.push(patchMatch[1] as string);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ id: patchMatch[1] }));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as AddressInfo;
      resolve({ server, baseUrl: `http://127.0.0.1:${address.port}`, patchedPageIds });
    });
  });
}

describe('HttpNotionClient (Version42, ADR 0075)', () => {
  const API_KEY = 'notion-secret';
  const DATABASE_ID = 'db-1';
  let ctx: Awaited<ReturnType<typeof startFakeNotionServer>>;

  beforeEach(async () => {
    ctx = await startFakeNotionServer(API_KEY);
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => ctx.server.close(() => resolve()));
  });

  it('listUnsynced() parses select/rich_text/date properties into a NotionEntryRecord', async () => {
    const client = new HttpNotionClient(API_KEY, DATABASE_ID, ctx.baseUrl);
    const records = await client.listUnsynced();
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      pageId: 'page-1',
      payloadType: 'Memory',
      clientCreatedAt: '2026-07-21',
    });
    expect((records[0]?.payload as { record?: { title?: string } })?.record?.title).toBe('欲しいもの');
  });

  it('listUnsynced() throws with a clear message on the wrong token', async () => {
    const client = new HttpNotionClient('wrong-key', DATABASE_ID, ctx.baseUrl);
    await expect(client.listUnsynced()).rejects.toThrow(/HTTP 401/);
  });

  it('markSynced() sends a PATCH to the correct page', async () => {
    const client = new HttpNotionClient(API_KEY, DATABASE_ID, ctx.baseUrl);
    await client.markSynced('page-1');
    expect(ctx.patchedPageIds).toEqual(['page-1']);
  });

  it('markSynced() throws on failure', async () => {
    const client = new HttpNotionClient('wrong-key', DATABASE_ID, ctx.baseUrl);
    await expect(client.markSynced('page-1')).rejects.toThrow(/HTTP 401/);
  });
});
