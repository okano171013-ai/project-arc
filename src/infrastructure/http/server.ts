#!/usr/bin/env node
/**
 * ARC Connector（Version7、Version9でBridge Layerのimport/exportを追加）
 *
 * Project ARCのApplication層を、CLI以外からも呼び出せるようにする
 * HTTP API。ADR 0008・ADR 0010参照。重要な制約：
 *
 * - このServer自身は「何を記録すべきか」を判断しない（ai-roles.md、
 *   ADR 0007の方針を継承）。`/capture`は確定済みdestinationsを
 *   受け取って書き込むだけ。`/capture/suggest`が返すのは機械的な
 *   下書き提案のみ。`/bridge/import`も`type`が確定済みの入力のみを
 *   受け付ける。
 * - ローカル専用（127.0.0.1のみ）。認証は未実装（ADR 0008参照、
 *   将来リモート接続が必要になった時点で追加する）。
 * - 新規の外部依存は追加せず、Node.js標準の`http`モジュールのみで
 *   実装する（Principle 9: 段階的拡張／YAGNI）。
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { pathToFileURL } from 'node:url';

import { RecordDailyReflectionUseCase } from '../../application/use-cases/reflection/RecordDailyReflection.js';
import { AddSkinLogUseCase } from '../../application/use-cases/skin/AddSkinLog.js';
import { RecordPurchaseUseCase } from '../../application/use-cases/purchase/RecordPurchase.js';
import { StartUsingPurchaseUseCase } from '../../application/use-cases/purchase/StartUsingPurchase.js';
import { FinishPurchaseUseCase } from '../../application/use-cases/purchase/FinishPurchase.js';
import { AddAppearanceLogUseCase } from '../../application/use-cases/appearance/AddAppearanceLog.js';
import { SuggestCaptureDestinationsUseCase } from '../../application/use-cases/capture/SuggestCaptureDestinations.js';
import { RecordCaptureUseCase } from '../../application/use-cases/capture/RecordCapture.js';
import { GetTimelineUseCase } from '../../application/use-cases/timeline/GetTimeline.js';
import { AddThirdPersonEvaluationUseCase } from '../../application/use-cases/evaluation/AddThirdPersonEvaluation.js';
import { ImportLogsUseCase } from '../../application/use-cases/bridge/ImportLogs.js';
import { ExportLogsUseCase } from '../../application/use-cases/bridge/ExportLogs.js';
import type { BridgeLogType } from '../../application/use-cases/bridge/BridgeLogType.js';
import type { TimelineSource } from '../../domain/value-objects/TimelineEntry.js';
import { AddExternalSourceUseCase } from '../../application/use-cases/external-source/AddExternalSource.js';
import { ListExternalSourcesUseCase } from '../../application/use-cases/external-source/ListExternalSources.js';
import { GetExternalSourceUseCase } from '../../application/use-cases/external-source/GetExternalSource.js';
import { UpdateExternalSourceUseCase } from '../../application/use-cases/external-source/UpdateExternalSource.js';
import { DeleteExternalSourceUseCase } from '../../application/use-cases/external-source/DeleteExternalSource.js';
import { AddExternalKnowledgeUseCase } from '../../application/use-cases/external-knowledge/AddExternalKnowledge.js';
import { ListExternalKnowledgeUseCase } from '../../application/use-cases/external-knowledge/ListExternalKnowledge.js';
import { GetExternalKnowledgeUseCase } from '../../application/use-cases/external-knowledge/GetExternalKnowledge.js';
import { UpdateExternalKnowledgeUseCase } from '../../application/use-cases/external-knowledge/UpdateExternalKnowledge.js';
import { DeleteExternalKnowledgeUseCase } from '../../application/use-cases/external-knowledge/DeleteExternalKnowledge.js';
import { SearchExternalKnowledgeUseCase } from '../../application/use-cases/external-knowledge/SearchExternalKnowledge.js';
import type { ExternalKnowledgeStatus } from '../../domain/entities/ExternalKnowledge.js';

import { JsonFileReflectionRepository } from '../../adapters/repositories/JsonFileReflectionRepository.js';
import { JsonFileMemoryRepository } from '../../adapters/repositories/JsonFileMemoryRepository.js';
import { JsonFileInventoryRepository } from '../../adapters/repositories/JsonFileInventoryRepository.js';
import { JsonFileSkinLogRepository } from '../../adapters/repositories/JsonFileSkinLogRepository.js';
import { JsonFilePurchaseLogRepository } from '../../adapters/repositories/JsonFilePurchaseLogRepository.js';
import { JsonFileChallengeLogRepository } from '../../adapters/repositories/JsonFileChallengeLogRepository.js';
import { JsonFileAppearanceLogRepository } from '../../adapters/repositories/JsonFileAppearanceLogRepository.js';
import { JsonFileCaptureRepository } from '../../adapters/repositories/JsonFileCaptureRepository.js';
import { JsonFileThirdPersonEvaluationRepository } from '../../adapters/repositories/JsonFileThirdPersonEvaluationRepository.js';
import { JsonFileExternalSourceRepository } from '../../adapters/repositories/JsonFileExternalSourceRepository.js';
import { JsonFileExternalKnowledgeRepository } from '../../adapters/repositories/JsonFileExternalKnowledgeRepository.js';
import { RuleBasedCaptureClassifier } from '../../adapters/providers/RuleBasedCaptureClassifier.js';

import {
  serializeReflection,
  serializeSkinLog,
  serializePurchaseLog,
  serializeAppearanceLog,
  serializeCapture,
  serializeThirdPersonEvaluation,
  serializeExternalSource,
  serializeExternalKnowledge,
} from '../../application/serializers.js';

export interface BuildAppOptions {
  /** テスト時に本番の`data/`と隔離するためのディレクトリ差し替え。 */
  dataDir?: string;
}

function repoPath(dataDir: string | undefined, filename: string): string | undefined {
  return dataDir ? `${dataDir}/${filename}` : undefined;
}

/** UseCase/Repositoryの組み立て。 */
export function buildUseCases(options: BuildAppOptions = {}) {
  const { dataDir } = options;

  const reflectionRepository = new JsonFileReflectionRepository(
    repoPath(dataDir, 'reflections.json'),
  );
  const memoryRepository = new JsonFileMemoryRepository(repoPath(dataDir, 'memory.json'));
  const inventoryRepository = new JsonFileInventoryRepository(repoPath(dataDir, 'inventory.json'));
  const skinLogRepository = new JsonFileSkinLogRepository(repoPath(dataDir, 'skin-log.json'));
  const purchaseLogRepository = new JsonFilePurchaseLogRepository(
    repoPath(dataDir, 'purchase-log.json'),
  );
  const challengeLogRepository = new JsonFileChallengeLogRepository(
    repoPath(dataDir, 'challenge-log.json'),
  );
  const appearanceLogRepository = new JsonFileAppearanceLogRepository(
    repoPath(dataDir, 'appearance-log.json'),
  );
  const captureRepository = new JsonFileCaptureRepository(repoPath(dataDir, 'capture-log.json'));
  const thirdPersonEvaluationRepository = new JsonFileThirdPersonEvaluationRepository(
    repoPath(dataDir, 'third-person-evaluation.json'),
  );
  const externalSourceRepository = new JsonFileExternalSourceRepository(
    repoPath(dataDir, 'external-sources.json'),
  );
  const externalKnowledgeRepository = new JsonFileExternalKnowledgeRepository(
    repoPath(dataDir, 'external-knowledge.json'),
  );
  const classifier = new RuleBasedCaptureClassifier();

  return {
    recordDailyReflection: new RecordDailyReflectionUseCase(reflectionRepository),
    addSkinLog: new AddSkinLogUseCase(skinLogRepository),
    recordPurchase: new RecordPurchaseUseCase(purchaseLogRepository),
    startUsingPurchase: new StartUsingPurchaseUseCase(purchaseLogRepository),
    finishPurchase: new FinishPurchaseUseCase(purchaseLogRepository),
    addAppearanceLog: new AddAppearanceLogUseCase(appearanceLogRepository),
    addThirdPersonEvaluation: new AddThirdPersonEvaluationUseCase(thirdPersonEvaluationRepository),
    suggestCaptureDestinations: new SuggestCaptureDestinationsUseCase(classifier),
    recordCapture: new RecordCaptureUseCase(
      captureRepository,
      skinLogRepository,
      purchaseLogRepository,
      challengeLogRepository,
      appearanceLogRepository,
      thirdPersonEvaluationRepository,
    ),
    getTimeline: new GetTimelineUseCase(
      reflectionRepository,
      appearanceLogRepository,
      skinLogRepository,
      purchaseLogRepository,
      challengeLogRepository,
      captureRepository,
      thirdPersonEvaluationRepository,
      externalKnowledgeRepository,
      externalSourceRepository,
    ),
    importLogs: new ImportLogsUseCase(
      reflectionRepository,
      memoryRepository,
      inventoryRepository,
      appearanceLogRepository,
      skinLogRepository,
      purchaseLogRepository,
      challengeLogRepository,
      thirdPersonEvaluationRepository,
      externalSourceRepository,
      externalKnowledgeRepository,
    ),
    exportLogs: new ExportLogsUseCase(
      reflectionRepository,
      memoryRepository,
      inventoryRepository,
      appearanceLogRepository,
      skinLogRepository,
      purchaseLogRepository,
      challengeLogRepository,
      thirdPersonEvaluationRepository,
      externalSourceRepository,
      externalKnowledgeRepository,
    ),
    addExternalSource: new AddExternalSourceUseCase(externalSourceRepository),
    listExternalSources: new ListExternalSourcesUseCase(externalSourceRepository),
    getExternalSource: new GetExternalSourceUseCase(externalSourceRepository),
    updateExternalSource: new UpdateExternalSourceUseCase(externalSourceRepository),
    deleteExternalSource: new DeleteExternalSourceUseCase(externalSourceRepository),
    addExternalKnowledge: new AddExternalKnowledgeUseCase(
      externalKnowledgeRepository,
      externalSourceRepository,
    ),
    listExternalKnowledge: new ListExternalKnowledgeUseCase(externalKnowledgeRepository),
    getExternalKnowledge: new GetExternalKnowledgeUseCase(externalKnowledgeRepository),
    updateExternalKnowledge: new UpdateExternalKnowledgeUseCase(
      externalKnowledgeRepository,
      externalSourceRepository,
    ),
    deleteExternalKnowledge: new DeleteExternalKnowledgeUseCase(externalKnowledgeRepository),
    searchExternalKnowledge: new SearchExternalKnowledgeUseCase(
      externalKnowledgeRepository,
      externalSourceRepository,
    ),
  };
}

export type UseCases = ReturnType<typeof buildUseCases>;

interface JsonResult {
  status: number;
  body: unknown;
}

function ok(body: unknown, status = 200): JsonResult {
  return { status, body: { ok: true, data: body } };
}

function fail(error: unknown, status = 400): JsonResult {
  const message = error instanceof Error ? error.message : String(error);
  return { status, body: { ok: false, error: message } };
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

type Handler = (req: IncomingMessage, params: Record<string, string>) => Promise<JsonResult>;

interface Route {
  method: string;
  pattern: RegExp;
  paramNames: string[];
  handler: Handler;
}

function route(method: string, path: string, handler: Handler): Route {
  const paramNames: string[] = [];
  const patternSource = path
    .split('/')
    .map((segment) => {
      if (segment.startsWith(':')) {
        paramNames.push(segment.slice(1));
        return '([^/]+)';
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return { method, pattern: new RegExp(`^${patternSource}$`), paramNames, handler };
}

/**
 * ARC ConnectorのHTTPアプリを組み立てる。UseCases自体は分類・解釈を
 * 一切行わない（`/capture`は確定済みdestinations必須、
 * `/capture/suggest`はキーワード一致の下書き提案を返すのみ）。
 */
export function createApp(options: BuildAppOptions = {}) {
  const useCases = buildUseCases(options);

  const routes: Route[] = [
    route('GET', '/health', async () => ok({ service: 'project-arc', status: 'ok' })),

    route('GET', '/timeline', async (req) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const since = url.searchParams.get('since') ?? undefined;
      const source = (url.searchParams.get('source') ?? undefined) as TimelineSource | undefined;
      const limitRaw = url.searchParams.get('limit');
      const limit = limitRaw ? Number(limitRaw) : undefined;
      const result = await useCases.getTimeline.execute({ since, source, limit });
      return ok({ entries: result.entries });
    }),

    route('POST', '/reflection', async (req) => {
      const body = await readJsonBody(req);
      const date = body.date as string;
      const record = body.record as Parameters<
        typeof useCases.recordDailyReflection.execute
      >[0]['record'];
      const result = await useCases.recordDailyReflection.execute({ date, record });
      return ok({
        reflection: serializeReflection(result.reflection),
        hasMinimumRoutine: result.hasMinimumRoutine,
        score: result.score,
        previousScore: result.previousScore,
        scoreDelta: result.scoreDelta,
      });
    }),

    route('POST', '/skin', async (req) => {
      const body = await readJsonBody(req);
      const record = body.record as Parameters<typeof useCases.addSkinLog.execute>[0]['record'];
      const result = await useCases.addSkinLog.execute({ record });
      return ok({ log: serializeSkinLog(result.log) }, 201);
    }),

    route('POST', '/appearance', async (req) => {
      const body = await readJsonBody(req);
      const record = body.record as Parameters<
        typeof useCases.addAppearanceLog.execute
      >[0]['record'];
      const result = await useCases.addAppearanceLog.execute({ record });
      return ok({ log: serializeAppearanceLog(result.log) }, 201);
    }),

    route('POST', '/purchase', async (req) => {
      const body = await readJsonBody(req);
      const record = body.record as Parameters<
        typeof useCases.recordPurchase.execute
      >[0]['record'];
      const result = await useCases.recordPurchase.execute({ record });
      return ok({ purchase: serializePurchaseLog(result.purchase) }, 201);
    }),

    route('POST', '/purchase/:id/start', async (req, params) => {
      const body = await readJsonBody(req);
      const result = await useCases.startUsingPurchase.execute({
        id: params.id!,
        date: body.date as string,
      });
      return ok({ purchase: serializePurchaseLog(result.purchase) });
    }),

    route('POST', '/purchase/:id/finish', async (req, params) => {
      const body = await readJsonBody(req);
      const result = await useCases.finishPurchase.execute({
        id: params.id!,
        date: body.date as string,
      });
      return ok({ purchase: serializePurchaseLog(result.purchase) });
    }),

    route('POST', '/capture/suggest', async (req) => {
      const body = await readJsonBody(req);
      const result = await useCases.suggestCaptureDestinations.execute({
        text: body.text as string | undefined,
        photoPath: body.photoPath as string | undefined,
      });
      return ok({ suggestions: result.suggestions });
    }),

    route('POST', '/capture', async (req) => {
      const body = await readJsonBody(req);
      const result = await useCases.recordCapture.execute({
        text: body.text as string | undefined,
        photoPath: body.photoPath as string | undefined,
        capturedAt: body.capturedAt as string,
        suggestions: body.suggestions as Parameters<
          typeof useCases.recordCapture.execute
        >[0]['suggestions'],
        destinations: body.destinations as Parameters<
          typeof useCases.recordCapture.execute
        >[0]['destinations'],
      });
      return ok(
        { capture: serializeCapture(result.capture), applied: result.applied },
        201,
      );
    }),

    route('POST', '/evaluation', async (req) => {
      const body = await readJsonBody(req);
      const record = body.record as Parameters<
        typeof useCases.addThirdPersonEvaluation.execute
      >[0]['record'];
      const result = await useCases.addThirdPersonEvaluation.execute({ record });
      return ok({ evaluation: serializeThirdPersonEvaluation(result.evaluation) }, 201);
    }),

    route('POST', '/bridge/import', async (req) => {
      const body = await readJsonBody(req);
      const logs = body.logs as Parameters<typeof useCases.importLogs.execute>[0]['logs'];
      const result = await useCases.importLogs.execute({ logs });
      return ok(result);
    }),

    route('GET', '/bridge/export', async (req) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const type = (url.searchParams.get('type') ?? undefined) as BridgeLogType | undefined;
      const result = await useCases.exportLogs.execute({ type });
      return ok(result);
    }),

    // --- External Brain（Version10） ---
    // `/external-knowledge/search`は`/external-knowledge/:id`より前に
    // 置く必要がある（先勝ちルーティングで"search"がidと誤認識されないため）。
    route('GET', '/external-knowledge/search', async (req) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const query = url.searchParams.get('q') ?? undefined;
      const status = (url.searchParams.get('status') ?? undefined) as
        | ExternalKnowledgeStatus
        | undefined;
      const result = await useCases.searchExternalKnowledge.execute({ query, status });
      return ok({
        results: result.results.map((r) => ({
          knowledge: serializeExternalKnowledge(r.knowledge),
          source: r.source ? serializeExternalSource(r.source) : null,
          matchedIn: r.matchedIn,
        })),
      });
    }),

    route('GET', '/external-knowledge', async (req) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const status = (url.searchParams.get('status') ?? undefined) as
        | ExternalKnowledgeStatus
        | undefined;
      const result = await useCases.listExternalKnowledge.execute({ status });
      return ok({ knowledge: result.knowledge.map(serializeExternalKnowledge) });
    }),

    route('GET', '/external-knowledge/:id', async (_req, params) => {
      const result = await useCases.getExternalKnowledge.execute({ id: params.id! });
      if (!result.knowledge) return fail(new Error('not found'), 404);
      return ok({ knowledge: serializeExternalKnowledge(result.knowledge) });
    }),

    route('POST', '/external-knowledge', async (req) => {
      const body = await readJsonBody(req);
      const record = body.record as Parameters<
        typeof useCases.addExternalKnowledge.execute
      >[0]['record'];
      const result = await useCases.addExternalKnowledge.execute({ record });
      return ok({ knowledge: serializeExternalKnowledge(result.knowledge) }, 201);
    }),

    route('PATCH', '/external-knowledge/:id', async (req, params) => {
      const body = await readJsonBody(req);
      const changes = body.changes as Parameters<
        typeof useCases.updateExternalKnowledge.execute
      >[0]['changes'];
      const result = await useCases.updateExternalKnowledge.execute({
        id: params.id!,
        changes,
      });
      return ok({ knowledge: serializeExternalKnowledge(result.knowledge) });
    }),

    route('DELETE', '/external-knowledge/:id', async (_req, params) => {
      await useCases.deleteExternalKnowledge.execute({ id: params.id! });
      return ok({ deleted: true });
    }),

    route('GET', '/external-sources', async () => {
      const result = await useCases.listExternalSources.execute();
      return ok({ sources: result.sources.map(serializeExternalSource) });
    }),

    route('GET', '/external-sources/:id', async (_req, params) => {
      const result = await useCases.getExternalSource.execute({ id: params.id! });
      if (!result.source) return fail(new Error('not found'), 404);
      return ok({ source: serializeExternalSource(result.source) });
    }),

    route('POST', '/external-sources', async (req) => {
      const body = await readJsonBody(req);
      const record = body.record as Parameters<
        typeof useCases.addExternalSource.execute
      >[0]['record'];
      const result = await useCases.addExternalSource.execute({ record });
      return ok({ source: serializeExternalSource(result.source) }, 201);
    }),

    route('PATCH', '/external-sources/:id', async (req, params) => {
      const body = await readJsonBody(req);
      const changes = body.changes as Parameters<
        typeof useCases.updateExternalSource.execute
      >[0]['changes'];
      const result = await useCases.updateExternalSource.execute({ id: params.id!, changes });
      return ok({ source: serializeExternalSource(result.source) });
    }),

    route('DELETE', '/external-sources/:id', async (_req, params) => {
      await useCases.deleteExternalSource.execute({ id: params.id! });
      return ok({ deleted: true });
    }),
  ];

  return createServer((req, res) => {
    void handleRequest(req, res, routes);
  });
}

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  routes: Route[],
): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const method = req.method ?? 'GET';

  for (const r of routes) {
    if (r.method !== method) continue;
    const match = r.pattern.exec(url.pathname);
    if (!match) continue;

    const params: Record<string, string> = {};
    r.paramNames.forEach((name, i) => {
      params[name] = decodeURIComponent(match[i + 1] ?? '');
    });

    let result: JsonResult;
    try {
      result = await r.handler(req, params);
    } catch (error) {
      result = fail(error, 400);
    }
    res.writeHead(result.status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(result.body));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ ok: false, error: 'not found' }));
}

const DEFAULT_PORT = 3939;

function isMainModule(): boolean {
  return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]!).href;
}

if (isMainModule()) {
  const port = Number(process.env.PORT) || DEFAULT_PORT;
  const app = createApp();
  // ローカル専用（127.0.0.1のみ）。リモート接続が必要になった場合の
  // 認証設計はADR 0008参照（Version7では未実装、意図的な先送り）。
  app.listen(port, '127.0.0.1', () => {
    console.log(`ARC Connector listening on http://127.0.0.1:${port}`);
  });
}
