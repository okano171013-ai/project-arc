import { ReceiveIngressRecordUseCase } from '../../src/application/use-cases/mobile-ingress/ReceiveIngressRecord.js';
import { ListIngressRecordsUseCase } from '../../src/application/use-cases/mobile-ingress/ListIngressRecords.js';
import type { IngressRecordStatus } from '../../src/domain/entities/IngressRecord.js';
import { KvIngressRecordRepository } from './kvIngressRecordRepository.js';

/**
 * ARC Mobile Ingress — Cloudflare Workers実装（Version38、ADR 0069）
 *
 * `mobileIngress.ts`（ローカル、`node:http`ベース）と同じ
 * Application層UseCase（`ReceiveIngressRecordUseCase`・
 * `ListIngressRecordsUseCase`）を、KV backedの`IngressRecordRepository`
 * 経由でそのまま再利用する（ADR 0068「新しい抽象を追加しない」の
 * 実証）。**ローカルエミュレータ（Miniflare、`worker.test.ts`）での
 * 検証のみ——実デプロイは行っていない**（Owner指示書2026-07-20）。
 *
 * ローカル版（単一の`MOBILE_INGRESS_API_TOKEN`）とは異なり、cloud版は
 * 最小権限のため2種類のtokenを分離する（Owner指示3「全生活履歴の
 * 無制限公開を避け、既定は自分のsubmission status確認に限定」）：
 *   - `DEVICE_TOKEN`（スマホ側）：`POST /ingress`・
 *     `GET /ingress?idempotencyKey=`（自分の1件のみ）
 *   - `PULL_TOKEN`（Ownerの信頼できるPC側`pnpm mobile-sync pull`のみ）：
 *     `GET /ingress?status=Accepted`（全件）・`POST /ingress/:id/ack`
 *     （pull後の削除、retention）
 *
 * rate limitはKVベースの固定ウィンドウカウンタ（Version37の
 * ローカル版はin-memory `Map`だったが、Workersは複数isolateに
 * 分散するため共有state無しでは正確に機能しない——KVはeventual
 * consistencyのため完全に正確ではないが、個人利用規模の乱用防止には
 * 十分と判断した、ADR 0069）。
 */
export interface Env {
  INGRESS_RECORDS: KVNamespace;
  DEVICE_TOKEN?: string;
  PULL_TOKEN?: string;
}

const MAX_BODY_BYTES = 64 * 1024;
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX = 30;

async function checkRateLimit(kv: KVNamespace, key: string): Promise<boolean> {
  const bucketKey = `ratelimit:${key}:${Math.floor(Date.now() / (RATE_LIMIT_WINDOW_SECONDS * 1000))}`;
  const current = await kv.get(bucketKey);
  const count = current ? Number(current) : 0;
  if (count >= RATE_LIMIT_MAX) return false;
  await kv.put(bucketKey, String(count + 1), { expirationTtl: RATE_LIMIT_WINDOW_SECONDS * 2 });
  return true;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}

function isAuthorized(request: Request, token: string | undefined): boolean {
  if (!token) return false; // cloud版は既定でopenにしない——両tokenとも必須（ADR 0069）
  return request.headers.get('Authorization') === `Bearer ${token}`;
}

/** Workers Logs（`console.log`、cloudflare側でTail Workers/dashboard経由参照）へ記録する。tokenの値は含めない。 */
function auditLog(event: { method: string; path: string; outcome: 'accepted' | 'rejected'; status: number; reason?: string }): void {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), ...event }));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const repository = new KvIngressRecordRepository(env.INGRESS_RECORDS);
    const receive = new ReceiveIngressRecordUseCase(repository);
    const list = new ListIngressRecordsUseCase(repository);

    if (url.pathname === '/health') {
      return json({ ok: true });
    }

    if (url.pathname === '/ingress' && request.method === 'POST') {
      if (!isAuthorized(request, env.DEVICE_TOKEN)) {
        auditLog({ method: 'POST', path: url.pathname, outcome: 'rejected', status: 401, reason: 'unauthorized' });
        return json({ error: 'unauthorized' }, 401);
      }
      const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
      if (!(await checkRateLimit(env.INGRESS_RECORDS, ip))) {
        auditLog({ method: 'POST', path: url.pathname, outcome: 'rejected', status: 429, reason: 'rate limit exceeded' });
        return json({ error: 'rate limit exceeded, try again later' }, 429);
      }

      const contentLength = Number(request.headers.get('Content-Length') ?? '0');
      if (contentLength > MAX_BODY_BYTES) {
        auditLog({ method: 'POST', path: url.pathname, outcome: 'rejected', status: 413, reason: 'payload too large' });
        return json({ error: `request body exceeds ${MAX_BODY_BYTES} bytes` }, 413);
      }
      const rawBody = await request.text();
      if (rawBody.length > MAX_BODY_BYTES) {
        auditLog({ method: 'POST', path: url.pathname, outcome: 'rejected', status: 413, reason: 'payload too large' });
        return json({ error: `request body exceeds ${MAX_BODY_BYTES} bytes` }, 413);
      }

      let body: { idempotencyKey?: string; payloadType?: string; payload?: Record<string, unknown>; clientCreatedAt?: string };
      try {
        body = JSON.parse(rawBody) as typeof body;
      } catch (error) {
        auditLog({ method: 'POST', path: url.pathname, outcome: 'rejected', status: 400, reason: 'invalid JSON' });
        return json({ error: error instanceof Error ? error.message : String(error) }, 400);
      }
      if (!body.idempotencyKey || !body.payloadType || !body.payload || !body.clientCreatedAt) {
        auditLog({ method: 'POST', path: url.pathname, outcome: 'rejected', status: 400, reason: 'missing required fields' });
        return json({ error: 'idempotencyKey, payloadType, payload, clientCreatedAt are all required' }, 400);
      }

      try {
        const result = await receive.execute({
          idempotencyKey: body.idempotencyKey,
          payloadType: body.payloadType as never,
          payload: body.payload,
          clientCreatedAt: body.clientCreatedAt,
        });
        auditLog({ method: 'POST', path: url.pathname, outcome: 'accepted', status: result.duplicate ? 200 : 201 });
        return json(
          {
            id: result.record.id,
            status: result.record.status,
            receivedAt: result.record.receivedAt.toISOString(),
            duplicate: result.duplicate,
          },
          result.duplicate ? 200 : 201,
        );
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        auditLog({ method: 'POST', path: url.pathname, outcome: 'rejected', status: 400, reason });
        return json({ error: reason }, 400);
      }
    }

    if (url.pathname === '/ingress' && request.method === 'GET') {
      const idempotencyKey = url.searchParams.get('idempotencyKey') ?? undefined;
      const status = (url.searchParams.get('status') ?? undefined) as IngressRecordStatus | undefined;

      // 最小権限：deviceTokenは自分のidempotencyKey1件のみ。
      // 全件・状態別の一覧はpullTokenのみ許可する（Owner指示3）。
      const authorizedAsDevice = isAuthorized(request, env.DEVICE_TOKEN);
      const authorizedAsPuller = isAuthorized(request, env.PULL_TOKEN);

      if (!authorizedAsDevice && !authorizedAsPuller) {
        auditLog({ method: 'GET', path: url.pathname, outcome: 'rejected', status: 401, reason: 'unauthorized' });
        return json({ error: 'unauthorized' }, 401);
      }
      if (authorizedAsDevice && !authorizedAsPuller && !idempotencyKey) {
        auditLog({
          method: 'GET',
          path: url.pathname,
          outcome: 'rejected',
          status: 400,
          reason: 'idempotencyKey required for device token (least privilege)',
        });
        return json({ error: 'idempotencyKey is required for the device token (least privilege)' }, 400);
      }

      const result = await list.execute({ status, idempotencyKey });
      auditLog({ method: 'GET', path: url.pathname, outcome: 'accepted', status: 200 });
      // pullToken（信頼できるPC側puller）にのみpayload本体を返す。
      // deviceToken（スマホ）は自分のstatus確認用のメタデータのみ
      // ——「全生活履歴の無制限公開を避ける」というOwner指示3の
      // 最小権限方針を、payload本体の可視性でも一貫させる。
      return json({
        records: result.records.map((r) => ({
          id: r.id,
          status: r.status,
          payloadType: r.data.payloadType,
          idempotencyKey: r.data.idempotencyKey,
          receivedAt: r.receivedAt.toISOString(),
          retryCount: r.retryCount,
          failureReason: r.failureReason,
          canonicalizedAs: r.canonicalizedAs,
          ...(authorizedAsPuller ? { payload: r.data.payload, clientCreatedAt: r.data.clientCreatedAt } : {}),
        })),
      });
    }

    // pull完了後の削除（retention）。pullTokenのみ許可。
    const ackMatch = /^\/ingress\/([^/]+)\/ack$/.exec(url.pathname);
    if (ackMatch && request.method === 'POST') {
      if (!isAuthorized(request, env.PULL_TOKEN)) {
        auditLog({ method: 'POST', path: url.pathname, outcome: 'rejected', status: 401, reason: 'unauthorized' });
        return json({ error: 'unauthorized' }, 401);
      }
      const id = ackMatch[1] as string;
      await repository.delete(id);
      auditLog({ method: 'POST', path: url.pathname, outcome: 'accepted', status: 200 });
      return json({ acked: id });
    }

    return json({ error: 'not found' }, 404);
  },
};
