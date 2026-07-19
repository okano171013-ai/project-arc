#!/usr/bin/env node
/**
 * ARC Mobile Ingress — ローカルMVP（Version35、ADR 0064・0065）。
 * 専用認証・rate limit・入力上限・監査ログはVersion37（ADR 0066）で追加。
 *
 * 将来クラウド常駐先へそのまま移設できることを想定した、
 * Mobile Ingress単体のHTTPサーバー。**既定は127.0.0.1限定**——外部
 * （インターネット）へのトンネル公開は引き続きスコープ外（ADR 0064
 * 「完全ローカル」制約）。
 *
 * Version36で`MOBILE_INGRESS_HOST`環境変数（既定`127.0.0.1`）を
 * 追加したが、認証を実装しないままLAN公開を許すのはOwnerが明示的に
 * 却下した（2026-07-20指示書、`docs/handoff/archive/
 * Version37_ARC_Brief.md`）。Version37でfail-closedな起動ガードを
 * 追加した——`MOBILE_INGRESS_HOST`を`127.0.0.1`以外へ変更する場合、
 * `MOBILE_INGRESS_API_TOKEN`が未設定だと**起動時に例外で拒否する**
 * （`validateExposureConfig()`）。`STUDY_TIMER_API_TOKEN`と同じ
 * fail-closed方針だが、既定の`127.0.0.1`運用時は無トークンのままで
 * 動作する（Version35〜36の既存ローカル運用を壊さない）。
 *
 * ADR 0059の「Transport、Canonical Storeではない」設計に従い、
 * このサーバー自身はlocalのReflection等Repositoryへは一切書き込ま
 * ない——`IngressRecordRepository`（Accepted状態の受信箱）のみを
 * 扱う。Canonicalize（local反映）は`pnpm mobile-sync`
 * （`src/infrastructure/cli/mobileSync.ts`）が別途行う。
 */
import { createServer, type IncomingMessage, type ServerResponse, type Server } from 'node:http';
import { appendFile, mkdir } from 'node:fs/promises';
import { ReceiveIngressRecordUseCase } from '../../application/use-cases/mobile-ingress/ReceiveIngressRecord.js';
import { ListIngressRecordsUseCase } from '../../application/use-cases/mobile-ingress/ListIngressRecords.js';
import { JsonFileIngressRecordRepository } from '../../adapters/repositories/JsonFileIngressRecordRepository.js';
import type { IngressRecordStatus } from '../../domain/entities/IngressRecord.js';
import { isMainModule } from '../runner/runnerLock.js';
import { loadEnv } from '../config/env.js';

/** リクエストボディの上限（Version37）。生活ログのテキスト量に対して十分に余裕を持たせつつ、無制限バッファリングを防ぐ。 */
export const MAX_BODY_BYTES = 64 * 1024;

/** 1IPあたりのwindow内リクエスト上限（Version37、固定ウィンドウ方式）。 */
export const DEFAULT_RATE_LIMIT_MAX = 30;
export const RATE_LIMIT_WINDOW_MS = 60_000;

/**
 * `MOBILE_INGRESS_HOST`を既定値（`127.0.0.1`）以外へ変更する場合、
 * `MOBILE_INGRESS_API_TOKEN`の設定を必須にする（fail-closed、
 * Version37、Owner 2026-07-20指示書）。既定のloopback運用は無変更。
 */
export function validateExposureConfig(host: string, apiToken: string | undefined): void {
  if (host !== '127.0.0.1' && !apiToken) {
    throw new Error(
      `MOBILE_INGRESS_HOST=${host}への変更にはMOBILE_INGRESS_API_TOKENの設定が必須です` +
        '（fail-closed、Version37）。認証なしのLAN/外部公開は許可されません。' +
        'docs/security/remote-mcp-threat-model.md 10章参照。',
    );
  }
}

interface RateLimitBucket {
  count: number;
  windowStart: number;
}

function createRateLimiter(max: number) {
  const buckets = new Map<string, RateLimitBucket>();
  return function checkRateLimit(key: string): boolean {
    const now = Date.now();
    const bucket = buckets.get(key);
    if (!bucket || now - bucket.windowStart >= RATE_LIMIT_WINDOW_MS) {
      buckets.set(key, { count: 1, windowStart: now });
      return true;
    }
    bucket.count += 1;
    return bucket.count <= max;
  };
}

interface AuditEvent {
  timestamp: string;
  method: string;
  path: string;
  ip: string;
  outcome: 'accepted' | 'rejected';
  status: number;
  reason?: string;
}

/**
 * 監査ログ（Version37）。Authorizationヘッダーの値そのものは記録
 * しない——認証の成否のみを記録する。書き込み失敗はリクエスト処理を
 * 止めない（stderrへフォールバック）。
 */
async function appendAuditLog(dataDir: string, event: AuditEvent): Promise<void> {
  try {
    const dir = `${dataDir}/logs`;
    await mkdir(dir, { recursive: true });
    await appendFile(`${dir}/mobile-ingress-audit.log`, `${JSON.stringify(event)}\n`, 'utf-8');
  } catch (error) {
    console.error('[mobile-ingress] audit log write failed:', error);
  }
}

/**
 * Quick Capture — 生活ログを送信するための最小限のHTMLフォーム
 * （Version36でReflectionのみ実装、Version37でMealLog/WeightLog/
 * FinanceLogへ拡張、ADR 0066）。外部JS依存なし、`fetch`のみで
 * `POST /ingress`を叩く。送信側クライアントが存在しなかった
 * Version35の空白（Report10章）を埋める最小実装。
 *
 * NutritionLogは対象外——既存の`MealLogId`と紐付ける設計のため、
 * Mobile IngressのTransport層（Canonical Storeを直接参照しない）
 * からは対応するMealLogを選べず、意味のあるフォームを作れない
 * （Version37 Report「実装しなかった機能」参照）。
 *
 * 認証トークンを設定している場合（`MOBILE_INGRESS_API_TOKEN`）、
 * ブラウザのlocalStorageに保存したトークンを`Authorization`ヘッダーへ
 * 付与する。トークン自体はこのHTML/JSにハードコードしない。
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
  fieldset { border: none; padding: 0; margin: 0; }
  .type-fields { display: none; }
  .type-fields.active { display: block; }
  details { margin-top: 1.5rem; }
</style>
</head>
<body>
<h1>ARC Quick Capture</h1>
<p>生活ログをProject ARCへ送信します（受信のみ、PC起動時に反映されます）。</p>
<form id="f">
  <label>種類
    <select name="payloadType" id="payloadType">
      <option value="Reflection">今日の振り返り</option>
      <option value="MealLog">食事</option>
      <option value="WeightLog">体重</option>
      <option value="FinanceLog">支出・収入</option>
    </select>
  </label>

  <fieldset class="type-fields active" data-type="Reflection">
    <label>日付<input type="date" name="reflection-date" required></label>
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
  </fieldset>

  <fieldset class="type-fields" data-type="MealLog">
    <label>日時<input type="datetime-local" name="meal-occurredAt"></label>
    <label>食事の種類
      <select name="mealType">
        <option value="">（未選択）</option>
        <option value="breakfast">朝食</option>
        <option value="lunch">昼食</option>
        <option value="dinner">夕食</option>
        <option value="snack">間食</option>
        <option value="other">その他</option>
      </select>
    </label>
    <label>食べたもの（カンマ区切り）<input type="text" name="items"></label>
    <label>メモ<textarea name="meal-notes" rows="2"></textarea></label>
  </fieldset>

  <fieldset class="type-fields" data-type="WeightLog">
    <label>日時<input type="datetime-local" name="weight-measuredAt"></label>
    <label>体重（kg）<input type="number" step="0.01" name="weightKg"></label>
    <label>計測状況（例：起床後）<input type="text" name="measurementContext"></label>
  </fieldset>

  <fieldset class="type-fields" data-type="FinanceLog">
    <label>日時<input type="datetime-local" name="finance-occurredAt"></label>
    <label>種別
      <select name="financeType">
        <option value="Expense">支出</option>
        <option value="Income">収入</option>
      </select>
    </label>
    <label>金額（円）<input type="number" step="1" name="amount"></label>
    <label>カテゴリ<input type="text" name="category"></label>
  </fieldset>

  <button type="submit">送信</button>
</form>
<div id="status"></div>
<button id="checkStatusBtn" type="button" style="display:none;">状態を確認</button>
<div id="statusCheck"></div>
<details>
  <summary>APIトークン設定（LAN公開時のみ必要）</summary>
  <label>トークン<input type="password" id="tokenInput"></label>
</details>
<script>
const form = document.getElementById('f');
const statusEl = document.getElementById('status');
const typeSelect = document.getElementById('payloadType');
const tokenInput = document.getElementById('tokenInput');
const TOKEN_KEY = 'arc-mobile-ingress-token';

tokenInput.value = localStorage.getItem(TOKEN_KEY) || '';
tokenInput.addEventListener('change', () => localStorage.setItem(TOKEN_KEY, tokenInput.value));

document.querySelector('input[name="reflection-date"]').valueAsDate = new Date();
const nowLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
form.querySelector('input[name="meal-occurredAt"]').value = nowLocal;
form.querySelector('input[name="weight-measuredAt"]').value = nowLocal;
form.querySelector('input[name="finance-occurredAt"]').value = nowLocal;

function updateVisibleFields() {
  document.querySelectorAll('.type-fields').forEach((el) => {
    el.classList.toggle('active', el.dataset.type === typeSelect.value);
  });
}
typeSelect.addEventListener('change', updateVisibleFields);
updateVisibleFields();

function buildPayload(fd) {
  const type = fd.get('payloadType');
  if (type === 'Reflection') {
    const record = {};
    const proudOf = fd.get('proudOf');
    const todaysEvents = fd.get('todaysEvents');
    const mood = fd.get('mood');
    const notes = fd.get('notes');
    if (proudOf) record.proudOf = proudOf;
    if (todaysEvents) record.todaysEvents = todaysEvents;
    if (mood) record.mood = mood;
    if (notes) record.notes = notes;
    return { payloadType: 'Reflection', payload: { date: fd.get('reflection-date'), record } };
  }
  if (type === 'MealLog') {
    const items = String(fd.get('items') || '').split(',').map((s) => s.trim()).filter(Boolean);
    const record = { occurredAt: new Date(fd.get('meal-occurredAt')).toISOString(), items };
    const mealType = fd.get('mealType');
    const notes = fd.get('meal-notes');
    if (mealType) record.mealType = mealType;
    if (notes) record.notes = notes;
    return { payloadType: 'MealLog', payload: { record } };
  }
  if (type === 'WeightLog') {
    const record = {
      measuredAt: new Date(fd.get('weight-measuredAt')).toISOString(),
      weightKg: Number(fd.get('weightKg')),
    };
    const context = fd.get('measurementContext');
    if (context) record.measurementContext = context;
    return { payloadType: 'WeightLog', payload: { record } };
  }
  if (type === 'FinanceLog') {
    const record = {
      occurredAt: new Date(fd.get('finance-occurredAt')).toISOString(),
      type: fd.get('financeType'),
      amount: Number(fd.get('amount')),
    };
    const category = fd.get('category');
    if (category) record.category = category;
    return { payloadType: 'FinanceLog', payload: { record } };
  }
  throw new Error('unknown type: ' + type);
}

const checkStatusBtn = document.getElementById('checkStatusBtn');
const statusCheckEl = document.getElementById('statusCheck');
let lastIdempotencyKey = null;

function authHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (tokenInput.value) headers['Authorization'] = 'Bearer ' + tokenInput.value;
  return headers;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  let typed;
  try {
    typed = buildPayload(fd);
  } catch (err) {
    statusEl.className = 'err';
    statusEl.style.display = 'block';
    statusEl.textContent = 'エラー: ' + err;
    return;
  }
  const idempotencyKey = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random();
  const body = {
    idempotencyKey,
    payloadType: typed.payloadType,
    payload: typed.payload,
    clientCreatedAt: new Date().toISOString(),
  };
  statusEl.className = '';
  statusEl.textContent = '送信中...';
  statusEl.style.display = 'block';
  checkStatusBtn.style.display = 'none';
  statusCheckEl.textContent = '';
  try {
    const res = await fetch('/ingress', { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
    const json = await res.json();
    if (res.ok) {
      statusEl.className = 'ok';
      statusEl.textContent = json.duplicate ? '送信済みでした（重複）' : '送信しました（PC起動時にProject ARCへ反映されます）';
      lastIdempotencyKey = idempotencyKey;
      checkStatusBtn.style.display = 'block';
    } else {
      statusEl.className = 'err';
      statusEl.textContent = 'エラー: ' + (json.error || res.status);
    }
  } catch (err) {
    statusEl.className = 'err';
    statusEl.textContent = 'エラー: ' + err;
  }
});

checkStatusBtn.addEventListener('click', async () => {
  if (!lastIdempotencyKey) return;
  statusCheckEl.textContent = '確認中...';
  try {
    const res = await fetch('/ingress?idempotencyKey=' + encodeURIComponent(lastIdempotencyKey), { headers: authHeaders() });
    const json = await res.json();
    const record = json.records && json.records[0];
    statusCheckEl.textContent = record ? ('状態: ' + record.status) : '見つかりませんでした';
  } catch (err) {
    statusCheckEl.textContent = 'エラー: ' + err;
  }
});
</script>
</body>
</html>
`;

class PayloadTooLargeError extends Error {}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    total += (chunk as Buffer).length;
    if (total > MAX_BODY_BYTES) {
      throw new PayloadTooLargeError(`request body exceeds ${MAX_BODY_BYTES} bytes`);
    }
    chunks.push(chunk as Buffer);
  }
  const raw = Buffer.concat(chunks).toString('utf-8');
  return raw.trim() ? JSON.parse(raw) : undefined;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function isAuthorized(req: IncomingMessage, apiToken: string | undefined): boolean {
  if (!apiToken) return true;
  return req.headers.authorization === `Bearer ${apiToken}`;
}

export interface MobileIngressAppOptions {
  /** 設定時、`/ingress`はBearer token必須になる（fail-closed、Version37）。 */
  apiToken?: string;
  /** テスト用のrate limit上限上書き（既定`DEFAULT_RATE_LIMIT_MAX`）。 */
  rateLimitMax?: number;
}

export function createMobileIngressApp(dataDir = 'data', options: MobileIngressAppOptions = {}): Server {
  const repository = new JsonFileIngressRecordRepository(`${dataDir}/ingress-records.json`);
  const receive = new ReceiveIngressRecordUseCase(repository);
  const list = new ListIngressRecordsUseCase(repository);
  const checkRateLimit = createRateLimiter(options.rateLimitMax ?? DEFAULT_RATE_LIMIT_MAX);

  return createServer((req, res) => {
    void handle(req, res).catch((error: unknown) => {
      if (!res.headersSent) {
        sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
      }
    });
  });

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const ip = req.socket.remoteAddress ?? 'unknown';
    const audit = (outcome: AuditEvent['outcome'], status: number, reason?: string): void => {
      void appendAuditLog(dataDir, {
        timestamp: new Date().toISOString(),
        method: req.method ?? 'GET',
        path: url.pathname,
        ip,
        outcome,
        status,
        reason,
      });
    };

    if (url.pathname === '/health') {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (url.pathname === '/' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(QUICK_CAPTURE_HTML);
      return;
    }

    if (url.pathname === '/ingress') {
      if (!isAuthorized(req, options.apiToken)) {
        audit('rejected', 401, 'unauthorized');
        sendJson(res, 401, { error: 'unauthorized' });
        return;
      }
      if (!checkRateLimit(ip)) {
        audit('rejected', 429, 'rate limit exceeded');
        sendJson(res, 429, { error: 'rate limit exceeded, try again later' });
        return;
      }
    }

    if (url.pathname === '/ingress' && req.method === 'POST') {
      let body:
        | { idempotencyKey?: string; payloadType?: string; payload?: Record<string, unknown>; clientCreatedAt?: string }
        | undefined;
      try {
        body = (await readJsonBody(req)) as typeof body;
      } catch (error) {
        if (error instanceof PayloadTooLargeError) {
          audit('rejected', 413, 'payload too large');
          sendJson(res, 413, { error: error.message });
          return;
        }
        audit('rejected', 400, 'invalid JSON body');
        sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) });
        return;
      }
      if (!body?.idempotencyKey || !body.payloadType || !body.payload || !body.clientCreatedAt) {
        audit('rejected', 400, 'missing required fields');
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
        audit('accepted', result.duplicate ? 200 : 201);
        sendJson(res, result.duplicate ? 200 : 201, {
          id: result.record.id,
          status: result.record.status,
          receivedAt: result.record.receivedAt.toISOString(),
          duplicate: result.duplicate,
        });
      } catch (error) {
        audit('rejected', 400, error instanceof Error ? error.message : String(error));
        sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) });
      }
      return;
    }

    if (url.pathname === '/ingress' && req.method === 'GET') {
      const status = (url.searchParams.get('status') ?? undefined) as IngressRecordStatus | undefined;
      const idempotencyKey = url.searchParams.get('idempotencyKey') ?? undefined;
      const result = await list.execute({ status, idempotencyKey });
      audit('accepted', 200);
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
  const {
    MOBILE_INGRESS_PORT: port,
    MOBILE_INGRESS_HOST: host,
    MOBILE_INGRESS_API_TOKEN: apiToken,
  } = loadEnv();
  validateExposureConfig(host, apiToken);
  const app = createMobileIngressApp('data', { apiToken });
  app.listen(port, host, () => {
    const exposureNote =
      host === '127.0.0.1'
        ? '127.0.0.1限定、外部公開なし。ADR 0064'
        : `MOBILE_INGRESS_HOST=${host}（既定値から変更済み）。MOBILE_INGRESS_API_TOKEN必須のfail-closed認証つき（Version37）`;
    console.error(`ARC Mobile Ingress (local MVP) listening on http://${host}:${port} (${exposureNote})`);
  });
}
