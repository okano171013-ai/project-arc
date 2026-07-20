#!/usr/bin/env node
/**
 * ARC Mobile Ingress — ローカルMVP（Version35、ADR 0064・0065）。
 * 専用認証・rate limit・入力上限・監査ログはVersion37（ADR 0066）で追加。
 * Version38で、認証時の`GET /ingress`を`idempotencyKey`必須（最小権限、
 * 電話側は自分のsubmission状態確認に限定）へ変更した（ADR 0069）。
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
import { randomBytes } from 'node:crypto';
import { ReceiveIngressRecordUseCase } from '../../application/use-cases/mobile-ingress/ReceiveIngressRecord.js';
import { ListIngressRecordsUseCase } from '../../application/use-cases/mobile-ingress/ListIngressRecords.js';
import { JsonFileIngressRecordRepository } from '../../adapters/repositories/JsonFileIngressRecordRepository.js';
import type { IngressRecordStatus } from '../../domain/entities/IngressRecord.js';
import { isMainModule } from '../runner/runnerLock.js';
import { loadEnv } from '../config/env.js';
import { renderQuickCaptureHtml } from './quickCaptureHtml.js';

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
      const nonce = randomBytes(16).toString('base64');
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; form-action 'self'`,
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(renderQuickCaptureHtml(nonce));
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
      // 最小権限（Version38、Owner指示）：認証を要求する構成
      // （apiToken設定時）では、全件・状態別の無制限一覧を許可しない
      // ——電話側の既定の利用は「自分が送った1件の状態確認」に限定する。
      // token未設定（既定のローカル運用）ではVersion35〜37と同じ挙動を
      // 維持する。
      if (options.apiToken && !idempotencyKey) {
        audit('rejected', 400, 'idempotencyKey required when authenticated (least privilege, Version38)');
        sendJson(res, 400, {
          error: 'idempotencyKey is required when MOBILE_INGRESS_API_TOKEN is configured (least privilege)',
        });
        return;
      }
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
