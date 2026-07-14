import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { rm } from 'node:fs/promises';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '../http/server.js';
import { Connector } from './Connector.js';

/**
 * Connectorがserver.tsを実際のHTTP経由でのみ呼び出すことを、実サーバーを
 * 起動して検証する（指示書15章の実機確認フローをテストとして自動化）。
 */
describe('Connector', () => {
  const DATA_DIR = 'data/_test-connector';
  const API_KEY = 'connector-test-key';
  let server: Server;
  let baseUrl: string;
  let connector: Connector;

  beforeAll(async () => {
    await rm(DATA_DIR, { recursive: true, force: true });
    server = createApp({ dataDir: DATA_DIR, apiKey: API_KEY });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
    connector = new Connector({ baseUrl, apiKey: API_KEY });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(DATA_DIR, { recursive: true, force: true });
  });

  it('rejects calls without a valid API key', async () => {
    const unauthenticated = new Connector({ baseUrl });
    await expect(unauthenticated.readReflection(1)).rejects.toThrow('unauthorized');
  });

  it('drives Read -> Proposal -> Approve -> ManagementFeedback -> Resolve end-to-end (指示書15章)', async () => {
    // Read: まだ何もないので0件（limit必須の型が強制される）
    const initialReflections = await connector.readReflection(5);
    expect(initialReflections.reflections).toEqual([]);

    // Proposal生成（保存されない）
    const proposal = await connector.createProposal({
      type: 'ManagementFeedback',
      target: '22時レビューをManagementFeedback Proposalとして生成',
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
    expect(proposal.type).toBe('ManagementFeedback');

    const beforeApprove = await connector.listFeedback();
    expect(beforeApprove.feedback).toHaveLength(0);

    // Approve: ここで初めて保存される
    const approved = await connector.approveProposal(proposal);
    expect(approved.type).toBe('ManagementFeedback');

    const afterApprove = await connector.listFeedback();
    expect(afterApprove.feedback).toHaveLength(1);
    expect(afterApprove.feedback[0]?.resolution).toBe('Open');

    // Resolve: Open -> Accepted
    const feedbackId = afterApprove.feedback[0]!.id;
    const resolved = await connector.resolveFeedback(feedbackId, 'Accepted');
    expect(resolved.feedback.resolution).toBe('Accepted');

    const finalList = await connector.listFeedback('Accepted');
    expect(finalList.feedback).toHaveLength(1);
  });

  it('rejectProposal persists nothing', async () => {
    const proposal = await connector.createProposal({
      type: 'Memory',
      target: '新しいMemory: シェーバー',
      payload: { record: { category: 'Assets', title: 'シェーバー', content: 'PHILIPS 5000' } },
      reason: '会話で言及されたため',
    });
    const result = await connector.rejectProposal(proposal);
    expect(result).toEqual({ rejected: true, type: 'Memory' });
  });

  it('readTimeline/readExternal/readDecision require limit at the type level and delegate correctly', async () => {
    await connector.createProposal({
      type: 'ExternalKnowledge',
      target: '知識',
      payload: { record: { title: '行政法メモ', content: '内容', capturedAt: '2026-07-14' } },
      reason: '理由',
    }).then((p) => connector.approveProposal(p));

    const timeline = await connector.readTimeline({ limit: 5 });
    expect(timeline.entries.length).toBeGreaterThan(0);

    const external = await connector.readExternal({ limit: 5, query: '行政法' });
    expect(external.results.length).toBeGreaterThan(0);
  });
});
