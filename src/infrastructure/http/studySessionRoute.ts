/**
 * Study Session Ingestion Route（Version27）
 *
 * ARC Study Timer（Owner本人が使う外部の学習タイマーアプリ）から
 * 学習セッションログを受信する専用の公開エンドポイント。既存のWrite
 * Proposal Layer（`/proposal/create`→Owner承認→`/proposal/approve`）
 * とは意図的に別の経路——タイマー自身が保持する専用Bearer tokenを
 * 持つリクエストのみ、固定スキーマに限定して自動保存を許可する
 * （Reflection/Memory等の汎用書き込みには使えない、指示書要件）。
 *
 * `remoteServer.ts`（公開トンネルに晒される唯一のプロセス、port
 * 3940）から呼ばれる想定——ARC Connector HTTP API（`server.ts`、port
 * 3939）は127.0.0.1限定のままトンネルされないため、外部タイマーが
 * 到達できるのは`remoteServer.ts`側のみ（ADR 0054参照）。認証後は
 * 既存の`Connector`（Version15）経由で`server.ts`へ内部転送する——
 * MCP Toolと同じ「Connectorのみに依存する」構成（ADR 0038）を守り、
 * Application/Domain層をこのプロセスへ直接importしない。
 *
 * 認証はfail-closed：`apiToken`未設定時は常に401を返す——他のAPI Key
 * （`ARC_API_KEY`、Version15）が未設定時に無認証で開く設計（ADR 0036、
 * 127.0.0.1限定のため許容）とは逆で、こちらは常時公開されるエンド
 * ポイントのため、明示的に設定されない限り一切受け付けない。
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Connector } from '../connector/Connector.js';
import { isAuthorized } from '../security/apiKeyAuth.js';

const BASE_PATH = '/api/study-sessions';
const SUMMARY_PATH = '/api/study-sessions/summary';

export interface StudySessionRouteOptions {
  /** 未設定（空文字含む）なら、このルートは常に401を返す（fail-closed）。 */
  apiToken: string | undefined;
  /** CORS許可オリジンの一覧。空配列ならブラウザからのクロスオリジンは常に拒否される。 */
  allowedOrigins: string[];
}

export function matchesStudySessionPath(pathname: string): boolean {
  return pathname === BASE_PATH || pathname === SUMMARY_PATH;
}

function applyCors(req: IncomingMessage, res: ServerResponse, allowedOrigins: string[]): void {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const raw = Buffer.concat(chunks).toString('utf-8');
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error('invalid JSON body');
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

export async function handleStudySessionRequest(
  req: IncomingMessage,
  res: ServerResponse,
  connector: Connector,
  options: StudySessionRouteOptions,
): Promise<void> {
  applyCors(req, res, options.allowedOrigins);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (!options.apiToken || !isAuthorized(req.headers.authorization, options.apiToken)) {
    sendJson(res, 401, { ok: false, error: 'unauthorized' });
    return;
  }

  const url = new URL(req.url ?? '/', 'http://localhost');

  try {
    if (req.method === 'POST' && url.pathname === BASE_PATH) {
      const body = await readJsonBody(req);
      const result = await connector.recordStudySession({
        sessionId: body.sessionId as string,
        subject: body.subject as string,
        task: body.task as string | undefined,
        startedAt: body.startedAt as string,
        endedAt: body.endedAt as string,
        durationMs: body.durationMs as number,
        source: body.source as string,
        clientCreatedAt: body.clientCreatedAt as string,
      });
      if (result.duplicate) {
        sendJson(res, 200, { ok: true, duplicate: true, sessionId: result.sessionId });
        return;
      }
      sendJson(res, 201, { ok: true, sessionId: result.sessionId, storedAt: result.storedAt });
      return;
    }

    if (req.method === 'GET' && url.pathname === SUMMARY_PATH) {
      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');
      if (!from || !to) throw new Error('from and to are required');
      const result = await connector.summarizeStudySessions(from, to);
      sendJson(res, 200, { ok: true, ...result });
      return;
    }

    sendJson(res, 404, { ok: false, error: 'not found' });
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}
