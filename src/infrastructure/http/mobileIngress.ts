#!/usr/bin/env node
/**
 * ARC Mobile Ingress — ローカルMVP（Version35、ADR 0064・0065）
 *
 * 将来クラウド常駐先へそのまま移設できることを想定した、
 * Mobile Ingress単体のHTTPサーバー。**既定は127.0.0.1限定**——外部
 * （インターネット）へのトンネル公開・認証実装は引き続きスコープ外
 * （ADR 0064「完全ローカル」制約）。
 *
 * Version36で、同一Wi-Fi内のスマートフォンから実際に送信できるよう
 * `MOBILE_INGRESS_HOST`環境変数（既定`127.0.0.1`）を追加した。
 * `0.0.0.0`等へ変更するとLAN内の他デバイスから到達可能になる
 * ——これはインターネットへの公開ではないが、認証なしのAPIへLAN内の
 * 他デバイスが到達できる状態になる点はOwnerの判断事項であるため、
 * 既定値は変更していない（opt-in、`ARC_API_KEY`・`MCP_OAUTH_ENABLED`と
 * 同じ設計方針）。
 *
 * ADR 0059の「Transport、Canonical Storeではない」設計に従い、
 * このサーバー自身はlocalのReflection等Repositoryへは一切書き込ま
 * ない——`IngressRecordRepository`（Accepted状態の受信箱）のみを
 * 扱う。Canonicalize（local反映）は`pnpm mobile-sync`
 * （`src/infrastructure/cli/mobileSync.ts`）が別途行う。
 */
import { createServer, type IncomingMessage, type ServerResponse, type Server } from 'node:http';
import { ReceiveIngressRecordUseCase } from '../../application/use-cases/mobile-ingress/ReceiveIngressRecord.js';
import { ListIngressRecordsUseCase } from '../../application/use-cases/mobile-ingress/ListIngressRecords.js';
import { JsonFileIngressRecordRepository } from '../../adapters/repositories/JsonFileIngressRecordRepository.js';
import type { IngressRecordStatus } from '../../domain/entities/IngressRecord.js';
import { isMainModule } from '../runner/runnerLock.js';
import { loadEnv } from '../config/env.js';

/**
 * Quick Capture — Reflectionを送信するための最小限のHTMLフォーム
 * （Version36）。外部JS依存なし、`fetch`のみで`POST /ingress`を叩く。
 * 送信側クライアントが存在しなかったVersion35の空白（Report10章）を
 * 埋める最小実装。
 */
const QUICK_CAPTURE_HTML = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ARC Mobile Ingress — Quick Capture</title>
<style>
  body { font-family: sans-serif; max-width: 480px; margin: 2rem auto; padding: 0 1rem; }
  label { display: block; margin-top: 1rem; font-weight: bold; }
  input, textarea, select { width: 100%; box-sizing: border-box; padding: 0.5rem; margin-top: 0.25rem; }
  button { margin-top: 1.5rem; padding: 0.75rem 1.5rem; width: 100%; }
  #status { margin-top: 1rem; padding: 0.75rem; border-radius: 4px; display: none; }
  #status.ok { display: block; background: #e6f4ea; color: #1e4620; }
  #status.err { display: block; background: #fce8e6; color: #611a15; }
</style>
</head>
<body>
<h1>ARC Quick Capture</h1>
<p>今日の振り返りをProject ARCへ送信します（受信のみ、PC起動時に反映されます）。</p>
<form id="f">
  <label>日付<input type="date" name="date" required></label>
  <label>今日頑張ったこと<input type="text" name="proudOf"></label>
  <label>今日の出来事<textarea name="todaysEvents" rows="3"></textarea></label>
  <label>気分
    <select name="mood">
      <option value="">（未選択）</option>
      <option value="great">great</option>
      <option value="good">good</option>
      <option value="neutral">neutral</option>
      <option value="low">low</option>
      <option value="bad">bad</option>
    </select>
  </label>
  <label>メモ<textarea name="notes" rows="3"></textarea></label>
  <button type="submit">送信</button>
</form>
<div id="status"></div>
<script>
const form = document.getElementById('f');
const statusEl = document.getElementById('status');
form.querySelector('input[name="date"]').valueAsDate = new Date();
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  const record = {};
  const proudOf = fd.get('proudOf');
  const todaysEvents = fd.get('todaysEvents');
  const mood = fd.get('mood');
  const notes = fd.get('notes');
  if (proudOf) record.proudOf = proudOf;
  if (todaysEvents) record.todaysEvents = todaysEvents;
  if (mood) record.mood = mood;
  if (notes) record.notes = notes;
  const body = {
    idempotencyKey: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()),
    payloadType: 'Reflection',
    payload: { date: fd.get('date'), record },
    clientCreatedAt: new Date().toISOString(),
  };
  statusEl.className = '';
  statusEl.textContent = '送信中...';
  statusEl.style.display = 'block';
  try {
    const res = await fetch('/ingress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (res.ok) {
      statusEl.className = 'ok';
      statusEl.textContent = json.duplicate ? '送信済みでした（重複）' : '送信しました（PC起動時にProject ARCへ反映されます）';
    } else {
      statusEl.className = 'err';
      statusEl.textContent = 'エラー: ' + (json.error || res.status);
    }
  } catch (err) {
    statusEl.className = 'err';
    statusEl.textContent = 'エラー: ' + err;
  }
});
</script>
</body>
</html>
`;

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString('utf-8');
  return raw.trim() ? JSON.parse(raw) : undefined;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

export function createMobileIngressApp(dataDir = 'data'): Server {
  const repository = new JsonFileIngressRecordRepository(`${dataDir}/ingress-records.json`);
  const receive = new ReceiveIngressRecordUseCase(repository);
  const list = new ListIngressRecordsUseCase(repository);

  return createServer((req, res) => {
    void handle(req, res).catch((error: unknown) => {
      if (!res.headersSent) {
        sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
      }
    });
  });

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://localhost');

    if (url.pathname === '/health') {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (url.pathname === '/' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(QUICK_CAPTURE_HTML);
      return;
    }

    if (url.pathname === '/ingress' && req.method === 'POST') {
      const body = (await readJsonBody(req)) as
        | { idempotencyKey?: string; payloadType?: string; payload?: Record<string, unknown>; clientCreatedAt?: string }
        | undefined;
      if (!body?.idempotencyKey || !body.payloadType || !body.payload || !body.clientCreatedAt) {
        sendJson(res, 400, { error: 'idempotencyKey, payloadType, payload, clientCreatedAt are all required' });
        return;
      }
      try {
        const result = await receive.execute({
          idempotencyKey: body.idempotencyKey,
          payloadType: body.payloadType as never,
          payload: body.payload,
          clientCreatedAt: body.clientCreatedAt,
        });
        sendJson(res, result.duplicate ? 200 : 201, {
          id: result.record.id,
          status: result.record.status,
          receivedAt: result.record.receivedAt.toISOString(),
          duplicate: result.duplicate,
        });
      } catch (error) {
        sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) });
      }
      return;
    }

    if (url.pathname === '/ingress' && req.method === 'GET') {
      const status = (url.searchParams.get('status') ?? undefined) as IngressRecordStatus | undefined;
      const result = await list.execute({ status });
      sendJson(res, 200, {
        records: result.records.map((r) => ({
          id: r.id,
          status: r.status,
          payloadType: r.data.payloadType,
          idempotencyKey: r.data.idempotencyKey,
          receivedAt: r.receivedAt.toISOString(),
          retryCount: r.retryCount,
          failureReason: r.failureReason,
          canonicalizedAs: r.canonicalizedAs,
        })),
      });
      return;
    }

    sendJson(res, 404, { error: 'not found' });
  }
}

if (isMainModule(import.meta.url)) {
  const { MOBILE_INGRESS_PORT: port, MOBILE_INGRESS_HOST: host } = loadEnv();
  const app = createMobileIngressApp();
  app.listen(port, host, () => {
    const exposureNote =
      host === '127.0.0.1'
        ? '127.0.0.1限定、外部公開なし。ADR 0064'
        : `MOBILE_INGRESS_HOST=${host}（既定値から変更済み）。認証なしのままLAN内の他デバイスから到達可能——Owner自身の判断で設定したことを前提とする（Version36）`;
    console.error(`ARC Mobile Ingress (local MVP) listening on http://${host}:${port} (${exposureNote})`);
  });
}
