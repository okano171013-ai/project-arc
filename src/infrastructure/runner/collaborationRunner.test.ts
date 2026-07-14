import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { rm, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '../http/server.js';
import { Connector } from '../connector/Connector.js';
import { runOnce, runOnceWithLock } from './collaborationRunner.js';

/**
 * Collaboration Runner（Version20 v1）のend-to-endテスト。実際の
 * `createApp()`を起動し、実HTTP経由でAgentMessage/ManagementFeedback
 * を作成した状態でRunnerを駆動する（`remoteServer.test.ts`と同じ
 * 「実物を起動して確認する」流儀）。Runner自身はAI推論を行わない
 * （ADR 0046）ため、検証するのは「新着を機械的に検知できるか」
 * 「状態ファイルで既読を正しく追跡できるか」「ロックが機能するか」
 * のみ。
 */
describe('Collaboration Runner', () => {
  const API_DATA_DIR = 'data/_test-runner-api';
  const RUNNER_DATA_DIR = 'data/_test-runner-state';
  const API_KEY = 'runner-test-key';
  let httpApiServer: Server;
  let connector: Connector;

  beforeAll(async () => {
    await rm(API_DATA_DIR, { recursive: true, force: true });
    httpApiServer = createApp({ dataDir: API_DATA_DIR, apiKey: API_KEY });
    await new Promise<void>((resolve) => httpApiServer.listen(0, '127.0.0.1', resolve));
    const address = httpApiServer.address() as AddressInfo;
    connector = new Connector({ baseUrl: `http://127.0.0.1:${address.port}`, apiKey: API_KEY });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => httpApiServer.close(() => resolve()));
    await rm(API_DATA_DIR, { recursive: true, force: true });
  });

  beforeEach(async () => {
    await rm(RUNNER_DATA_DIR, { recursive: true, force: true });
  });

  async function createAgentMessage(content: string): Promise<void> {
    const proposal = await connector.createProposal({
      type: 'AgentMessage',
      target: content,
      payload: { record: { direction: 'ToClaudeCode', content } },
      reason: 'テスト',
    });
    await connector.approveProposal(proposal);
  }

  it('初回実行では既存の全AgentMessage/ManagementFeedbackを新着として検知し、通知ファイルを書き出す', async () => {
    await createAgentMessage('初回検知テスト');

    const result = await runOnce(connector, RUNNER_DATA_DIR);

    expect(result.detected).toHaveLength(1);
    expect(result.detected[0]?.kind).toBe('AgentMessage');
    expect(result.notificationPath).toBeDefined();
    expect(existsSync(result.notificationPath!)).toBe(true);
    const notification = await readFile(result.notificationPath!, 'utf-8');
    expect(notification).toContain('初回検知テスト');
    expect(existsSync(path.join(RUNNER_DATA_DIR, 'runner-state.json'))).toBe(true);
  });

  it('新着がなければ2回目の実行では何も検知しない', async () => {
    await createAgentMessage('状態追跡テスト');
    await runOnce(connector, RUNNER_DATA_DIR);

    const second = await runOnce(connector, RUNNER_DATA_DIR);

    expect(second.detected).toHaveLength(0);
    expect(second.notificationPath).toBeUndefined();
  });

  it('2回目実行までの間に追加された1件だけを検知する', async () => {
    await createAgentMessage('1件目');
    await runOnce(connector, RUNNER_DATA_DIR);

    await createAgentMessage('2件目（新着）');
    const result = await runOnce(connector, RUNNER_DATA_DIR);

    expect(result.detected).toHaveLength(1);
    expect(result.detected[0]?.summary).toContain('2件目');
  });

  it('内容の解釈・提案文言を書き出さない（機械的な列挙のみ、ADR 0046）', async () => {
    await createAgentMessage('内容チェック用');
    const result = await runOnce(connector, RUNNER_DATA_DIR);
    const notification = await readFile(result.notificationPath!, 'utf-8');

    expect(notification).toContain('内容の解釈・実装方針の提案は含まない');
  });

  it('実行中のロックが存在する間は2重実行をスキップする', async () => {
    await mkdir(RUNNER_DATA_DIR, { recursive: true });
    await writeFile(
      path.join(RUNNER_DATA_DIR, 'runner.lock'),
      JSON.stringify({ pid: 999999, startedAt: new Date().toISOString() }),
      'utf-8',
    );

    const result = await runOnceWithLock(connector, RUNNER_DATA_DIR);

    expect(result.skipped).toBe(true);
  });

  it('古い（30分以上前の）ロックは無視して実行を続行する', async () => {
    await mkdir(RUNNER_DATA_DIR, { recursive: true });
    const staleTime = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    await writeFile(
      path.join(RUNNER_DATA_DIR, 'runner.lock'),
      JSON.stringify({ pid: 999999, startedAt: staleTime }),
      'utf-8',
    );

    const result = await runOnceWithLock(connector, RUNNER_DATA_DIR);

    expect(result.skipped).toBe(false);
  });
});
