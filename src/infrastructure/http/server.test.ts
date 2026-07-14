import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { rm } from 'node:fs/promises';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from './server.js';

const DATA_DIR = 'data/_test-http-server';
let server: Server;
let baseUrl: string;

async function call(method: string, path: string, body?: unknown) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as { ok: boolean; data?: unknown; error?: string };
  return { status: res.status, json };
}

beforeAll(async () => {
  await rm(DATA_DIR, { recursive: true, force: true });
  server = createApp({ dataDir: DATA_DIR });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await rm(DATA_DIR, { recursive: true, force: true });
});

beforeEach(async () => {
  await rm(DATA_DIR, { recursive: true, force: true });
});

describe('ARC Connector HTTP API', () => {
  it('GET /health returns ok', async () => {
    const { status, json } = await call('GET', '/health');
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
  });

  it('POST /reflection records a reflection', async () => {
    const { status, json } = await call('POST', '/reflection', {
      date: '2026-07-13',
      record: { studyMinutes: 90, mood: 'good' },
    });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    const data = json.data as { reflection: { date: string }; score: number };
    expect(data.reflection.date).toBe('2026-07-13');
    expect(data.score).toBeGreaterThan(0);
  });

  it('POST /skin records a skin log', async () => {
    const { status, json } = await call('POST', '/skin', {
      record: { date: '2026-07-13', redness: 2, pores: 3 },
    });
    expect(status).toBe(201);
    const data = json.data as { log: { id: string; record: { redness: number } } };
    expect(data.log.record.redness).toBe(2);
  });

  it('POST /skin rejects an out-of-range severity', async () => {
    const { status, json } = await call('POST', '/skin', {
      record: { date: '2026-07-13', redness: 9 },
    });
    expect(status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error).toMatch(/redness/);
  });

  it('POST /appearance records an appearance log', async () => {
    const { status, json } = await call('POST', '/appearance', {
      record: { date: '2026-07-13', overallRating: 4 },
    });
    expect(status).toBe(201);
    const data = json.data as { log: { record: { overallRating: number } } };
    expect(data.log.record.overallRating).toBe(4);
  });

  it('POST /purchase then /purchase/:id/start then /purchase/:id/finish transitions status', async () => {
    const created = await call('POST', '/purchase', {
      record: { productName: 'メラノCC', purchaseDate: '2026-07-01' },
    });
    expect(created.status).toBe(201);
    const purchase = (created.json.data as { purchase: { id: string; status: string } })
      .purchase;
    expect(purchase.status).toBe('未使用');

    const started = await call('POST', `/purchase/${purchase.id}/start`, {
      date: '2026-07-03',
    });
    expect(started.status).toBe(200);
    expect((started.json.data as { purchase: { status: string } }).purchase.status).toBe(
      '使用中',
    );

    const finished = await call('POST', `/purchase/${purchase.id}/finish`, {
      date: '2026-07-20',
    });
    expect(finished.status).toBe(200);
    expect((finished.json.data as { purchase: { status: string } }).purchase.status).toBe(
      '使い切り',
    );
  });

  it('GET /timeline merges entries from multiple Logs sorted by date descending', async () => {
    await call('POST', '/skin', { record: { date: '2026-07-01', redness: 2 } });
    // /captureはChallengeLogへの書き込みと、Capture自体の監査記録の
    // 2件をどちらも同じcapturedAtで作るため、Timelineにも2件現れる。
    await call('POST', '/capture', {
      text: '赤福を初めて食べた',
      capturedAt: '2026-07-10',
      destinations: [{ logType: 'ChallengeLog', fields: { title: '赤福' } }],
    });

    const { status, json } = await call('GET', '/timeline');
    expect(status).toBe(200);
    const data = json.data as { entries: { date: string; source: string }[] };
    expect(data.entries.map((e) => e.date)).toEqual(['2026-07-10', '2026-07-10', '2026-07-01']);
    expect(data.entries.map((e) => e.source).sort()).toEqual(
      ['Capture', 'ChallengeLog', 'SkinLog'].sort(),
    );
  });

  it('GET /timeline?source= filters to a single source', async () => {
    await call('POST', '/skin', { record: { date: '2026-07-01', redness: 2 } });
    await call('POST', '/appearance', { record: { date: '2026-07-02', overallRating: 4 } });

    const { json } = await call('GET', '/timeline?source=SkinLog');
    const data = json.data as { entries: { source: string }[] };
    expect(data.entries).toHaveLength(1);
    expect(data.entries[0]?.source).toBe('SkinLog');
  });

  it('POST /capture/suggest returns suggestions without writing anything', async () => {
    const { status, json } = await call('POST', '/capture/suggest', {
      text: 'メラノCC買った',
    });
    expect(status).toBe(200);
    const data = json.data as { suggestions: { logType: string }[] };
    expect(data.suggestions.some((s) => s.logType === 'PurchaseLog')).toBe(true);

    const list = await call('GET', '/health'); // sanity: server still alive, no crash from suggest-only call
    expect(list.status).toBe(200);
  });

  it('POST /capture writes to confirmed destinations only', async () => {
    const { status, json } = await call('POST', '/capture', {
      text: '赤福を初めて食べた',
      capturedAt: '2026-07-13',
      destinations: [{ logType: 'ChallengeLog', fields: { title: '赤福' } }],
    });
    expect(status).toBe(201);
    const data = json.data as { applied: { logType: string }[] };
    expect(data.applied).toHaveLength(1);
    expect(data.applied[0]?.logType).toBe('ChallengeLog');
  });

  it('POST /capture without required fields fails without fabricating data', async () => {
    const { status, json } = await call('POST', '/capture', {
      text: 'いとこにガタイ良くなったと言われた',
      capturedAt: '2026-07-13',
      destinations: [{ logType: 'AppearanceLog', fields: { comment: 'ガタイ良くなった' } }],
    });
    expect(status).toBe(400);
    expect(json.error).toMatch(/overallRating/);
  });

  it('returns 404 for unknown routes', async () => {
    const { status } = await call('GET', '/nope');
    expect(status).toBe(404);
  });

  it('POST /evaluation records a third person evaluation', async () => {
    const { status, json } = await call('POST', '/evaluation', {
      record: { date: '2026-07-13', person: 'いとこ', evaluation: 'ガタイ良くなった' },
    });
    expect(status).toBe(201);
    const data = json.data as { evaluation: { record: { person: string } } };
    expect(data.evaluation.record.person).toBe('いとこ');
  });

  it('POST /bridge/import registers multiple log types and reports per-item results', async () => {
    const { status, json } = await call('POST', '/bridge/import', {
      logs: [
        { type: 'SkinLog', data: { record: { date: '2026-07-13', redness: 2 } } },
        { type: 'PurchaseLog', data: { record: {} } }, // productName欠如で失敗するはず
      ],
    });
    expect(status).toBe(200);
    const data = json.data as { successCount: number; failureCount: number };
    expect(data.successCount).toBe(1);
    expect(data.failureCount).toBe(1);
  });

  it('GET /bridge/export?type= exports only the requested type', async () => {
    await call('POST', '/bridge/import', {
      logs: [{ type: 'ChallengeLog', data: { record: { date: '2026-07-13', title: '赤福' } } }],
    });
    const { status, json } = await call('GET', '/bridge/export?type=ChallengeLog');
    expect(status).toBe(200);
    const data = json.data as { logs: { type: string }[] };
    expect(data.logs).toHaveLength(1);
    expect(data.logs[0]?.type).toBe('ChallengeLog');
  });

  // --- External Brain（Version10） ---

  it('POST /external-sources creates a source, GET lists and fetches it', async () => {
    const created = await call('POST', '/external-sources', {
      record: { sourceType: 'web', title: '記事A', url: 'https://example.com/a' },
    });
    expect(created.status).toBe(201);
    const source = (created.json.data as { source: { id: string; record: { title: string } } })
      .source;
    expect(source.record.title).toBe('記事A');

    const list = await call('GET', '/external-sources');
    expect((list.json.data as { sources: unknown[] }).sources).toHaveLength(1);

    const fetched = await call('GET', `/external-sources/${source.id}`);
    expect(fetched.status).toBe(200);
  });

  it('PATCH /external-sources/:id updates and DELETE removes it', async () => {
    const created = await call('POST', '/external-sources', {
      record: { sourceType: 'book', title: '元タイトル' },
    });
    const source = (created.json.data as { source: { id: string } }).source;

    const updated = await call('PATCH', `/external-sources/${source.id}`, {
      changes: { title: '更新後タイトル' },
    });
    expect(updated.status).toBe(200);
    expect((updated.json.data as { source: { record: { title: string } } }).source.record.title).toBe(
      '更新後タイトル',
    );

    const deleted = await call('DELETE', `/external-sources/${source.id}`);
    expect(deleted.status).toBe(200);
    const list = await call('GET', '/external-sources');
    expect((list.json.data as { sources: unknown[] }).sources).toHaveLength(0);
  });

  it('GET /external-sources/:id returns 404 for a missing id', async () => {
    const { status } = await call('GET', '/external-sources/does-not-exist');
    expect(status).toBe(404);
  });

  it('POST /external-knowledge without a source succeeds (出典不明でも登録できる)', async () => {
    const { status, json } = await call('POST', '/external-knowledge', {
      record: { title: '知識A', content: '本文A', capturedAt: '2026-07-13' },
    });
    expect(status).toBe(201);
    const data = json.data as { knowledge: { record: { status: string; confidence: string } } };
    expect(data.knowledge.record.status).toBe('inbox');
    expect(data.knowledge.record.confidence).toBe('unassessed');
  });

  it('POST /external-knowledge rejects a sourceId that does not exist', async () => {
    const { status, json } = await call('POST', '/external-knowledge', {
      record: { sourceId: 'does-not-exist', title: 'A', content: 'B', capturedAt: '2026-07-13' },
    });
    expect(status).toBe(400);
    expect(json.error).toMatch(/ExternalSource not found/);
  });

  it('PATCH /external-knowledge/:id can review/archive via status, DELETE removes it', async () => {
    const created = await call('POST', '/external-knowledge', {
      record: { title: 'A', content: '本文', capturedAt: '2026-07-13' },
    });
    const knowledge = (created.json.data as { knowledge: { id: string } }).knowledge;

    const reviewed = await call('PATCH', `/external-knowledge/${knowledge.id}`, {
      changes: { status: 'reviewed' },
    });
    expect(
      (reviewed.json.data as { knowledge: { record: { status: string } } }).knowledge.record
        .status,
    ).toBe('reviewed');

    const deleted = await call('DELETE', `/external-knowledge/${knowledge.id}`);
    expect(deleted.status).toBe(200);
  });

  it('GET /external-knowledge/search finds by keyword across Knowledge and related Source fields', async () => {
    const source = await call('POST', '/external-sources', {
      record: { sourceType: 'news', title: '日経新聞', publisher: '日本経済新聞社' },
    });
    const sourceId = (source.json.data as { source: { id: string } }).source.id;
    await call('POST', '/external-knowledge', {
      record: { sourceId, title: '会社法メモ', content: '株主総会について', capturedAt: '2026-07-13' },
    });

    const { status, json } = await call(
      'GET',
      `/external-knowledge/search?q=${encodeURIComponent('株主総会')}`,
    );
    expect(status).toBe(200);
    const data = json.data as { results: { matchedIn: string[] }[] };
    expect(data.results).toHaveLength(1);
    expect(data.results[0]?.matchedIn).toContain('content');
  });

  it('GET /external-knowledge?status= filters the list', async () => {
    const created = await call('POST', '/external-knowledge', {
      record: { title: 'A', content: '本文', capturedAt: '2026-07-13' },
    });
    const knowledge = (created.json.data as { knowledge: { id: string } }).knowledge;
    await call('PATCH', `/external-knowledge/${knowledge.id}`, {
      changes: { status: 'archived' },
    });
    await call('POST', '/external-knowledge', {
      record: { title: 'B', content: '本文', capturedAt: '2026-07-13' },
    });

    const { json } = await call('GET', '/external-knowledge?status=inbox');
    const data = json.data as { knowledge: { record: { title: string } }[] };
    expect(data.knowledge).toHaveLength(1);
    expect(data.knowledge[0]?.record.title).toBe('B');
  });

  it('GET /timeline includes ExternalKnowledge entries', async () => {
    await call('POST', '/external-knowledge', {
      record: { title: '会社法メモ', content: '本文', capturedAt: '2026-07-13' },
    });
    const { json } = await call('GET', '/timeline?source=ExternalKnowledge');
    const data = json.data as { entries: { title: string }[] };
    expect(data.entries).toHaveLength(1);
    expect(data.entries[0]?.title).toBe('会社法メモ');
  });

  it('POST /knowledge/retrieve ranks by relevance and returns a Context Builder block', async () => {
    const source = await call('POST', '/external-sources', {
      record: { sourceType: 'lecture', title: '〇〇先生の講義' },
    });
    const sourceId = (source.json.data as { source: { id: string } }).source.id;
    await call('POST', '/external-knowledge', {
      record: { sourceId, title: '行政法の処分性', content: '処分性は〜', capturedAt: '2026-07-13' },
    });
    await call('POST', '/external-knowledge', {
      record: { title: '無関係な知識', content: '料理について', capturedAt: '2026-07-01' },
    });

    const { status, json } = await call('POST', '/knowledge/retrieve', { query: '処分性' });
    expect(status).toBe(200);
    const data = json.data as {
      results: { knowledge: { record: { title: string } }; score: number }[];
      sources: unknown[];
      context: string;
    };
    expect(data.results).toHaveLength(1);
    expect(data.results[0]?.knowledge.record.title).toBe('行政法の処分性');
    expect(data.sources).toHaveLength(1);
    expect(data.context).toContain('【External Brain】');
    expect(data.context).toContain('処分性は〜');
  });

  it('POST /decision/support returns a DecisionContext with candidates and comparisons but no AI-authored conclusion', async () => {
    await call('POST', '/external-knowledge', {
      record: {
        title: '行政法メモ',
        content: '処分性は司法試験でよく使えるのでおすすめの論点',
        capturedAt: '2026-07-01',
        topics: ['行政法'],
      },
    });
    await call('POST', '/external-knowledge', {
      record: {
        title: '民訴法メモ',
        content: '要件事実は難しいので注意が必要',
        capturedAt: '2026-07-02',
        topics: ['民訴法'],
      },
    });

    const { status, json } = await call('POST', '/decision/support', {
      question: '行政法と民訴法どちらを優先？',
    });
    expect(status).toBe(200);
    const data = json.data as {
      decisionContext: {
        candidates: string[];
        comparisons: { candidate: string; merits: string[]; demerits: string[] }[];
        pointsForOwnerToDecide: string[];
      };
      retrievedKnowledge: unknown[];
      sources: unknown[];
    };
    expect(data.decisionContext.candidates.sort()).toEqual(['民訴法', '行政法'].sort());
    expect(data.decisionContext.comparisons).toHaveLength(2);
    expect(data.decisionContext.pointsForOwnerToDecide[0]).toContain('最終的な判断はOwner自身が行ってください');
  });

  it('POST /conversation/context routes by Intent (Retrieval/Decision/None) and never returns ARC-authored text', async () => {
    await call('POST', '/external-knowledge', {
      record: {
        title: '会社法メモ',
        content: '招集通知期間の改正について',
        capturedAt: '2026-07-01',
        topics: ['会社法'],
      },
    });

    const retrieval = await call('POST', '/conversation/context', {
      question: '前に保存した会社法のメモは？',
    });
    expect(retrieval.status).toBe(200);
    const retrievalData = retrieval.json.data as {
      conversationContext: { intent: string; retrievedKnowledge: unknown[]; decisionContext: unknown };
    };
    expect(retrievalData.conversationContext.intent).toBe('Retrieval');
    expect(retrievalData.conversationContext.retrievedKnowledge).toHaveLength(1);
    expect(retrievalData.conversationContext.decisionContext).toBeNull();

    const none = await call('POST', '/conversation/context', { question: 'こんにちは' });
    const noneData = none.json.data as {
      conversationContext: { intent: string; warnings: string[] };
    };
    expect(noneData.conversationContext.intent).toBe('None');
    expect(noneData.conversationContext.warnings.length).toBeGreaterThan(0);
  });

  // --- Read Layer（Version14） ---

  it('GET /read/reflection requires limit', async () => {
    const { status, json } = await call('GET', '/read/reflection');
    expect(status).toBe(400);
    expect(json.error).toMatch(/limit is required/);
  });

  it('GET /read/reflection returns at most `limit` reflections, newest first', async () => {
    await call('POST', '/reflection', { date: '2026-07-12', record: { studyMinutes: 30 } });
    await call('POST', '/reflection', { date: '2026-07-13', record: { studyMinutes: 60 } });

    const { status, json } = await call('GET', '/read/reflection?limit=1');
    expect(status).toBe(200);
    const data = json.data as { reflections: { date: string }[] };
    expect(data.reflections).toHaveLength(1);
    expect(data.reflections[0]?.date).toBe('2026-07-13');
  });

  it('GET /read/timeline requires limit and delegates to Timeline', async () => {
    await call('POST', '/skin', { record: { date: '2026-07-01', redness: 2 } });
    await call('POST', '/appearance', { record: { date: '2026-07-02', overallRating: 4 } });

    const missing = await call('GET', '/read/timeline');
    expect(missing.status).toBe(400);

    const { status, json } = await call('GET', '/read/timeline?limit=1');
    expect(status).toBe(200);
    const data = json.data as { entries: { date: string }[] };
    expect(data.entries).toHaveLength(1);
    expect(data.entries[0]?.date).toBe('2026-07-02');
  });

  it('GET /read/external requires limit and delegates to Knowledge Retrieval', async () => {
    await call('POST', '/external-knowledge', {
      record: { title: 'タイトル', content: '内容', capturedAt: '2026-07-01' },
    });

    const missing = await call('GET', '/read/external');
    expect(missing.status).toBe(400);

    const { status, json } = await call('GET', '/read/external?limit=10');
    expect(status).toBe(200);
    const data = json.data as { results: unknown[] };
    expect(data.results).toHaveLength(1);
  });

  it('GET /read/decision requires limit and delegates to Decision Support', async () => {
    await call('POST', '/external-knowledge', {
      record: { title: '行政法メモ', content: '内容', capturedAt: '2026-07-01', topics: ['行政法'] },
    });
    await call('POST', '/external-knowledge', {
      record: { title: '民訴法メモ', content: '内容', capturedAt: '2026-07-02', topics: ['民訴法'] },
    });

    const missing = await call('GET', '/read/decision?question=どっち？');
    expect(missing.status).toBe(400);

    const { status, json } = await call(
      'GET',
      '/read/decision?limit=1&question=' + encodeURIComponent('行政法と民訴法どっち？'),
    );
    expect(status).toBe(200);
    const data = json.data as { decisionContext: { candidates: string[] }; retrievedKnowledge: unknown[] };
    expect(data.decisionContext.candidates.sort()).toEqual(['民訴法', '行政法'].sort());
    expect(data.retrievedKnowledge.length).toBeLessThanOrEqual(1);
  });

  // --- Write Proposal Layer（Version14） ---

  it('POST /proposal/create builds a Proposal without persisting anything', async () => {
    const { status, json } = await call('POST', '/proposal/create', {
      type: 'Memory',
      target: '新しいMemory: シェーバー',
      payload: { record: { category: 'Assets', title: 'シェーバー', content: 'PHILIPS 5000' } },
      reason: '会話で言及されたため',
    });
    expect(status).toBe(201);
    const data = json.data as { proposal: { type: string; createdAt: string } };
    expect(data.proposal.type).toBe('Memory');
    expect(data.proposal.createdAt).toBeTruthy();

    const list = await call('GET', '/external-knowledge');
    expect((list.json.data as { knowledge: unknown[] }).knowledge).toHaveLength(0);
  });

  it('POST /proposal/create rejects a structurally invalid payload', async () => {
    const { status, json } = await call('POST', '/proposal/create', {
      type: 'Memory',
      target: '不正な提案',
      payload: { record: { title: '見出しのみ' } },
      reason: '理由',
    });
    expect(status).toBe(400);
    expect(json.error).toMatch(/Invalid proposal payload/);
  });

  it('POST /proposal/approve persists only after the full proposal is resent (Owner承認後のみ書き込む)', async () => {
    const created = await call('POST', '/proposal/create', {
      type: 'ManagementFeedback',
      target: 'Daily Reviewの生成時刻を早める提案',
      payload: {
        record: {
          author: 'ARC',
          category: 'Process',
          content: 'Daily Reviewをもっと早い時間に生成してほしい',
          reason: '22時だとOwnerが確認しないまま日付が変わることが多いため',
        },
      },
      reason: '22時だとOwnerが確認しないまま日付が変わることが多いため',
    });
    const proposal = (created.json.data as { proposal: unknown }).proposal;

    const approved = await call('POST', '/proposal/approve', proposal);
    expect(approved.status).toBe(200);
    expect((approved.json.data as { type: string }).type).toBe('ManagementFeedback');
  });

  it('POST /proposal/reject persists nothing', async () => {
    const created = await call('POST', '/proposal/create', {
      type: 'Memory',
      target: '対象',
      payload: { record: { category: 'Assets', title: 't', content: 'c' } },
      reason: '理由',
    });
    const proposal = (created.json.data as { proposal: unknown }).proposal;

    const rejected = await call('POST', '/proposal/reject', proposal);
    expect(rejected.status).toBe(200);
    expect(rejected.json.data).toEqual({ rejected: true, type: 'Memory' });
  });

  // --- ManagementFeedback（Version15、Connectorが呼ぶHTTPエンドポイント） ---

  it('GET /management-feedback lists feedback, optionally filtered by resolution', async () => {
    const created = await call('POST', '/proposal/create', {
      type: 'ManagementFeedback',
      target: '対象',
      payload: {
        record: { author: 'ARC', category: 'Process', content: '内容', reason: '理由' },
      },
      reason: '理由',
    });
    await call('POST', '/proposal/approve', (created.json.data as { proposal: unknown }).proposal);

    const all = await call('GET', '/management-feedback');
    expect(all.status).toBe(200);
    expect((all.json.data as { feedback: unknown[] }).feedback).toHaveLength(1);

    const openOnly = await call('GET', '/management-feedback?resolution=Open');
    expect((openOnly.json.data as { feedback: unknown[] }).feedback).toHaveLength(1);

    const acceptedOnly = await call('GET', '/management-feedback?resolution=Accepted');
    expect((acceptedOnly.json.data as { feedback: unknown[] }).feedback).toHaveLength(0);
  });

  it('POST /management-feedback/:id/resolve transitions resolution', async () => {
    const created = await call('POST', '/proposal/create', {
      type: 'ManagementFeedback',
      target: '対象',
      payload: {
        record: { author: 'ARC', category: 'Process', content: '内容', reason: '理由' },
      },
      reason: '理由',
    });
    const approved = await call(
      'POST',
      '/proposal/approve',
      (created.json.data as { proposal: unknown }).proposal,
    );
    const feedbackId = (
      (approved.json.data as { result: { feedback: { id: string } } }).result.feedback
    ).id;

    const resolved = await call('POST', `/management-feedback/${feedbackId}/resolve`, {
      resolution: 'Accepted',
    });
    expect(resolved.status).toBe(200);
    expect((resolved.json.data as { feedback: { resolution: string } }).feedback.resolution).toBe(
      'Accepted',
    );
  });
});

describe('ARC Connector HTTP API — API Key Authentication (Version15)', () => {
  const AUTH_DATA_DIR = 'data/_test-http-server-auth';
  const API_KEY = 'test-secret-key';
  let authServer: Server;
  let authBaseUrl: string;

  async function callAuth(method: string, path: string, headers?: Record<string, string>) {
    const res = await fetch(`${authBaseUrl}${path}`, { method, headers });
    const json = (await res.json()) as { ok: boolean; data?: unknown; error?: string };
    return { status: res.status, json };
  }

  beforeAll(async () => {
    await rm(AUTH_DATA_DIR, { recursive: true, force: true });
    authServer = createApp({ dataDir: AUTH_DATA_DIR, apiKey: API_KEY });
    await new Promise<void>((resolve) => authServer.listen(0, '127.0.0.1', resolve));
    const address = authServer.address() as AddressInfo;
    authBaseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => authServer.close(() => resolve()));
    await rm(AUTH_DATA_DIR, { recursive: true, force: true });
  });

  it('GET /health requires no API key even when apiKey is configured', async () => {
    const { status } = await callAuth('GET', '/health');
    expect(status).toBe(200);
  });

  it('rejects requests with no Authorization header (401)', async () => {
    const { status, json } = await callAuth('GET', '/read/reflection?limit=1');
    expect(status).toBe(401);
    expect(json.error).toBe('unauthorized');
  });

  it('rejects requests with a wrong API key (401)', async () => {
    const { status } = await callAuth('GET', '/read/reflection?limit=1', {
      Authorization: 'Bearer wrong-key',
    });
    expect(status).toBe(401);
  });

  it('accepts requests with the correct Authorization: Bearer header', async () => {
    const { status } = await callAuth('GET', '/read/reflection?limit=1', {
      Authorization: `Bearer ${API_KEY}`,
    });
    expect(status).toBe(200);
  });
});
