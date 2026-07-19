#!/usr/bin/env node
/**
 * ARC Mobile Ingress — ローカルMVP（Version35、ADR 0064・0065）
 *
 * 将来クラウド常駐先へそのまま移設できることを想定した、
 * Mobile Ingress単体のHTTPサーバー。**127.0.0.1限定**——外部への
 * トンネル公開・認証実装は本Versionのスコープ外（ADR 0064
 * 「完全ローカル」制約）。Owner自身のスマートフォンからの実接続も、
 * 同一Wi-Fi内でのローカルテストに限る想定。
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
  const port = Number(process.env.MOBILE_INGRESS_PORT ?? 3941);
  const app = createMobileIngressApp();
  app.listen(port, '127.0.0.1', () => {
    console.error(
      `ARC Mobile Ingress (local MVP) listening on http://127.0.0.1:${port} ` +
        '(127.0.0.1限定、外部公開なし。ADR 0064)',
    );
  });
}
