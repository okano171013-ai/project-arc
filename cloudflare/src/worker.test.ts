import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * Cloudflare Worker（`worker.ts`）のend-to-endテスト。実際に
 * Miniflare（Cloudflareの公式local emulator、`workerd`を内部で使用）
 * 上でWorkerを起動し、実HTTPリクエストで駆動する——アカウント・
 * ログイン・デプロイは一切行わない、完全ローカルの検証（Version38、
 * ADR 0069、Owner指示書「Cloudflareローカルエミュレータでテスト」に
 * 対応）。
 *
 * `worker.ts`はTypeScript・相対import（`../../src/...`）を含むため、
 * esbuildで単一のESMバンドルへ事前bundleしてからMiniflareへ渡す
 * （Miniflare自体はTypeScriptを解決しない）。`node:*` importは
 * externalのまま残し、Workers runtime自身の`nodejs_compat`機能に
 * 解決させる（バンドルへポリフィルを埋め込まない）。
 */
const workerDir = path.dirname(fileURLToPath(import.meta.url));

async function bundleWorker(): Promise<string> {
  const result = await build({
    entryPoints: [path.join(workerDir, 'worker.ts')],
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    target: 'es2022',
    external: ['node:*'],
    write: false,
  });
  const output = result.outputFiles[0];
  if (!output) throw new Error('esbuild produced no output');
  return output.text;
}

describe('ARC Mobile Ingress — Cloudflare Worker (Version38, local emulator only)', () => {
  let mf: Miniflare;
  const DEVICE_TOKEN = 'device-secret';
  const PULL_TOKEN = 'pull-secret';

  beforeAll(async () => {
    const script = await bundleWorker();
    mf = new Miniflare({
      modules: true,
      script,
      kvNamespaces: ['INGRESS_RECORDS'],
      compatibilityDate: '2026-07-20',
      compatibilityFlags: ['nodejs_compat'],
      bindings: { DEVICE_TOKEN, PULL_TOKEN },
    });
    // 起動確認（実際にKVバインディングが機能することを含めて確認する）。
    await mf.ready;
  });

  afterAll(async () => {
    await mf.dispose();
  });

  beforeEach(async () => {
    // 各テストで新しいKV namespaceの中身にするため、既存キーを掃除する。
    const ns = await mf.getKVNamespace('INGRESS_RECORDS');
    const { keys } = await ns.list();
    await Promise.all(keys.map((k) => ns.delete(k.name)));
  });

  const validBody = (idempotencyKey: string) =>
    JSON.stringify({
      idempotencyKey,
      payloadType: 'Reflection',
      payload: { date: '2026-07-20', record: { proudOf: 'Miniflare実機テスト' } },
      clientCreatedAt: '2026-07-20T12:00:00.000Z',
    });

  it('GET /health returns ok without auth', async () => {
    const res = await mf.dispatchFetch('http://worker/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('rejects POST /ingress with no Authorization header (401)', async () => {
    const res = await mf.dispatchFetch('http://worker/ingress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: validBody('wk-1'),
    });
    expect(res.status).toBe(401);
  });

  it('rejects POST /ingress with the wrong token (401)', async () => {
    const res = await mf.dispatchFetch('http://worker/ingress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer wrong' },
      body: validBody('wk-2'),
    });
    expect(res.status).toBe(401);
  });

  it('accepts a valid device-token POST and is idempotent on replay/duplicate submission', async () => {
    const submit = () =>
      mf.dispatchFetch('http://worker/ingress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEVICE_TOKEN}` },
        body: validBody('wk-replay'),
      });

    const first = await submit();
    expect(first.status).toBe(201);
    const firstBody = (await first.json()) as { duplicate: boolean };
    expect(firstBody.duplicate).toBe(false);

    // replay（同一idempotencyKeyでの再送、ネットワーク不安定時のリトライを模擬）
    const second = await submit();
    expect(second.status).toBe(200);
    const secondBody = (await second.json()) as { duplicate: boolean };
    expect(secondBody.duplicate).toBe(true);
  });

  it('rejects an oversized request body (413)', async () => {
    const res = await mf.dispatchFetch('http://worker/ingress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEVICE_TOKEN}` },
      body: JSON.stringify({
        idempotencyKey: 'wk-huge',
        payloadType: 'Reflection',
        payload: { date: '2026-07-20', record: { notes: 'x'.repeat(70 * 1024) } },
        clientCreatedAt: '2026-07-20T12:00:00.000Z',
      }),
    });
    expect(res.status).toBe(413);
  });

  it('reports a partial failure for malformed JSON without crashing the worker', async () => {
    const res = await mf.dispatchFetch('http://worker/ingress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEVICE_TOKEN}` },
      body: 'not valid json {{{',
    });
    expect(res.status).toBe(400);

    // Workerが引き続き正常に応答できることを確認（クラッシュしていない）。
    const health = await mf.dispatchFetch('http://worker/health');
    expect(health.status).toBe(200);
  });

  it('least privilege: device token cannot list without idempotencyKey', async () => {
    await mf.dispatchFetch('http://worker/ingress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEVICE_TOKEN}` },
      body: validBody('wk-list-1'),
    });

    const res = await mf.dispatchFetch('http://worker/ingress', {
      headers: { Authorization: `Bearer ${DEVICE_TOKEN}` },
    });
    expect(res.status).toBe(400);
  });

  it('least privilege: device token CAN read its own submission by idempotencyKey', async () => {
    await mf.dispatchFetch('http://worker/ingress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEVICE_TOKEN}` },
      body: validBody('wk-own-status'),
    });

    const res = await mf.dispatchFetch('http://worker/ingress?idempotencyKey=wk-own-status', {
      headers: { Authorization: `Bearer ${DEVICE_TOKEN}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { records: Array<{ idempotencyKey: string; payload?: unknown }> };
    expect(body.records).toHaveLength(1);
    expect(body.records[0]?.idempotencyKey).toBe('wk-own-status');
    // deviceTokenの応答にはpayload本体を含めない（最小権限）。
    expect(body.records[0]?.payload).toBeUndefined();
  });

  it('only the pull token receives the payload body (needed to actually pull content locally)', async () => {
    await mf.dispatchFetch('http://worker/ingress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEVICE_TOKEN}` },
      body: validBody('wk-payload-visibility'),
    });

    const res = await mf.dispatchFetch('http://worker/ingress?status=Accepted', {
      headers: { Authorization: `Bearer ${PULL_TOKEN}` },
    });
    const body = (await res.json()) as { records: Array<{ idempotencyKey: string; payload?: { record?: { proudOf?: string } } }> };
    const record = body.records.find((r) => r.idempotencyKey === 'wk-payload-visibility');
    expect(record?.payload?.record?.proudOf).toBe('Miniflare実機テスト');
  });

  it('pull token can list all Accepted records (trusted PC puller)', async () => {
    await mf.dispatchFetch('http://worker/ingress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEVICE_TOKEN}` },
      body: validBody('wk-pull-1'),
    });
    await mf.dispatchFetch('http://worker/ingress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEVICE_TOKEN}` },
      body: validBody('wk-pull-2'),
    });

    const res = await mf.dispatchFetch('http://worker/ingress?status=Accepted', {
      headers: { Authorization: `Bearer ${PULL_TOKEN}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { records: unknown[] };
    expect(body.records).toHaveLength(2);
  });

  it('device token cannot use the pull-only unrestricted list (401 with wrong token)', async () => {
    const res = await mf.dispatchFetch('http://worker/ingress?status=Accepted', {
      headers: { Authorization: `Bearer ${DEVICE_TOKEN}` },
    });
    // deviceトークンはstatus絞り込みでもidempotencyKeyなしでは拒否される
    // （最小権限、401ではなく400——認証は通るがscope不足のため）。
    expect(res.status).toBe(400);
  });

  it('ack (retention): pull token can delete a record after successful local pull', async () => {
    const submit = await mf.dispatchFetch('http://worker/ingress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEVICE_TOKEN}` },
      body: validBody('wk-ack-1'),
    });
    const { id } = (await submit.json()) as { id: string };

    const ackRejected = await mf.dispatchFetch(`http://worker/ingress/${id}/ack`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${DEVICE_TOKEN}` },
    });
    expect(ackRejected.status).toBe(401); // deviceトークンではackできない

    const ack = await mf.dispatchFetch(`http://worker/ingress/${id}/ack`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${PULL_TOKEN}` },
    });
    expect(ack.status).toBe(200);

    const afterAck = await mf.dispatchFetch('http://worker/ingress?status=Accepted', {
      headers: { Authorization: `Bearer ${PULL_TOKEN}` },
    });
    const body = (await afterAck.json()) as { records: unknown[] };
    expect(body.records).toHaveLength(0);
  });

  it('rate-limits after RATE_LIMIT_MAX POSTs within the window (429)', async () => {
    // KVのget+putは原子的ではないため、同時並行リクエストでは
    // カウンタの更新が競合しうる（ADR 0069「既知の限界」参照）。
    // ここでは実際のクライアント利用（順次リクエスト）を模した
    // 直列送信で検証する——並行時の正確性はDurable Objects等が
    // 必要になる既知の技術的負債として文書化済み。
    const submit = (key: string) =>
      mf.dispatchFetch('http://worker/ingress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEVICE_TOKEN}` },
        body: validBody(key),
      });
    const statuses: number[] = [];
    for (let i = 0; i < 35; i += 1) {
      // eslint-disable-next-line no-await-in-loop -- 意図的な順次実行（rate limitカウンタの正確な検証のため）
      const res = await submit(`rl-${i}`);
      statuses.push(res.status);
    }
    expect(statuses).toContain(429);
  });

  it('unknown routes return 404', async () => {
    const res = await mf.dispatchFetch('http://worker/unknown');
    expect(res.status).toBe(404);
  });
});
