#!/usr/bin/env node
/**
 * Collaboration Runner（Version20、v1）
 *
 * ARCからの指示（AgentMessage `33274dc6-...`）は「監視し、承認不要の
 * 範囲で開発・実装まで進める」ことを求めていたが、無人稼働のまま
 * 内容を「解釈」して実装方針を決めることはConstitution第2条・
 * ADR 0045の境界に抵触する（Owner自身も「監視・下書き作成まで」と
 * 回答済み）。v1は意図的にスコープを絞り、**機械的な新着検知と
 * 通知ファイルの作成のみ**を行う——内容の解釈・実装方針の提案・
 * コード変更・commit・Proposal作成/承認は一切行わない（ADR 0046）。
 *
 * 1回実行して終了するスクリプトとして実装し、繰り返し実行は
 * Windowsタスクスケジューラに委ねる（`scripts/register-scheduled-
 * tasks.ps1`）——独自の常駐ループ・再起動・重複防止ロジックを
 * 作り込まない（YAGNI、ADR 0046）。
 *
 * 前提：`pnpm run api`（ARC Connector HTTP API）が別プロセスとして
 * 起動済みであること。
 */
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Connector } from '../connector/Connector.js';
import { loadConnectorConfig } from '../connector/connectorConfig.js';

/** このロックより古いものは、前回実行がクラッシュしたとみなし無視する。 */
const STALE_LOCK_MS = 30 * 60 * 1000;

interface RunnerState {
  lastSeenAgentMessageAt?: string;
  lastSeenFeedbackAt?: string;
}

interface RunnerPaths {
  statePath: string;
  lockPath: string;
  logPath: string;
  notificationsDir: string;
}

function paths(dataDir: string): RunnerPaths {
  return {
    statePath: path.join(dataDir, 'runner-state.json'),
    lockPath: path.join(dataDir, 'runner.lock'),
    logPath: path.join(dataDir, 'runner.log'),
    notificationsDir: path.join(dataDir, 'runner-notifications'),
  };
}

async function readState(p: RunnerPaths): Promise<RunnerState> {
  if (!existsSync(p.statePath)) return {};
  const raw = await readFile(p.statePath, 'utf-8');
  return raw.trim() ? (JSON.parse(raw) as RunnerState) : {};
}

async function writeState(p: RunnerPaths, state: RunnerState): Promise<void> {
  await mkdir(path.dirname(p.statePath), { recursive: true });
  await writeFile(p.statePath, JSON.stringify(state, null, 2), 'utf-8');
}

async function appendLog(p: RunnerPaths, line: string): Promise<void> {
  await mkdir(path.dirname(p.logPath), { recursive: true });
  const stamped = `[${new Date().toISOString()}] ${line}\n`;
  const existing = existsSync(p.logPath) ? await readFile(p.logPath, 'utf-8') : '';
  await writeFile(p.logPath, existing + stamped, 'utf-8');
}

interface LockInfo {
  pid: number;
  startedAt: string;
}

/**
 * タスクスケジューラの「既に実行中なら開始しない」設定を主たる防止策とし、
 * このロックファイルは保険（同時に手動実行された場合等に備える）。
 */
async function acquireLock(p: RunnerPaths): Promise<boolean> {
  await mkdir(path.dirname(p.lockPath), { recursive: true });
  if (existsSync(p.lockPath)) {
    const raw = await readFile(p.lockPath, 'utf-8');
    const lock = JSON.parse(raw) as LockInfo;
    const age = Date.now() - new Date(lock.startedAt).getTime();
    if (age < STALE_LOCK_MS) {
      return false;
    }
    await appendLog(p, `stale lock (pid ${lock.pid}, age ${Math.round(age / 1000)}s) ignored`);
  }
  const info: LockInfo = { pid: process.pid, startedAt: new Date().toISOString() };
  await writeFile(p.lockPath, JSON.stringify(info, null, 2), 'utf-8');
  return true;
}

async function releaseLock(p: RunnerPaths): Promise<void> {
  if (existsSync(p.lockPath)) await rm(p.lockPath);
}

interface DetectedItem {
  kind: 'AgentMessage' | 'ManagementFeedback';
  id: string;
  createdAt: string;
  summary: string;
}

function truncate(text: string, max = 120): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}

async function writeNotification(p: RunnerPaths, items: DetectedItem[]): Promise<string> {
  await mkdir(p.notificationsDir, { recursive: true });
  const filename = `${new Date().toISOString().replace(/[:.]/g, '-')}.md`;
  const filePath = path.join(p.notificationsDir, filename);
  const lines = [
    `# Collaboration Runner 新着検知（${new Date().toISOString()}）`,
    '',
    '機械的な検知結果のみ。内容の解釈・実装方針の提案は含まない（ADR 0046）。',
    '',
    ...items.map(
      (item) => `- [${item.kind}] \`${item.id}\`（${item.createdAt}）: ${item.summary}`,
    ),
    '',
  ];
  await writeFile(filePath, lines.join('\n'), 'utf-8');
  return filePath;
}

export async function runOnce(
  connector: Connector,
  dataDir = 'data',
): Promise<{ detected: DetectedItem[]; notificationPath?: string }> {
  const p = paths(dataDir);
  const state = await readState(p);
  const detected: DetectedItem[] = [];

  const { messages } = await connector.listAgentMessages('ToClaudeCode');
  const lastMessageAt = state.lastSeenAgentMessageAt ? new Date(state.lastSeenAgentMessageAt) : undefined;
  let newestMessageAt = lastMessageAt;
  for (const message of messages) {
    const createdAt = new Date(message.createdAt);
    if (!lastMessageAt || createdAt > lastMessageAt) {
      const content = typeof message.record.content === 'string' ? message.record.content : '';
      detected.push({
        kind: 'AgentMessage',
        id: message.id,
        createdAt: message.createdAt,
        summary: truncate(content),
      });
      if (!newestMessageAt || createdAt > newestMessageAt) newestMessageAt = createdAt;
    }
  }

  const { feedback } = await connector.listFeedback('Open');
  const lastFeedbackAt = state.lastSeenFeedbackAt ? new Date(state.lastSeenFeedbackAt) : undefined;
  let newestFeedbackAt = lastFeedbackAt;
  for (const item of feedback) {
    const createdAt = new Date(item.createdAt);
    if (!lastFeedbackAt || createdAt > lastFeedbackAt) {
      const content = typeof item.record.content === 'string' ? item.record.content : '';
      detected.push({
        kind: 'ManagementFeedback',
        id: item.id,
        createdAt: item.createdAt,
        summary: truncate(content),
      });
      if (!newestFeedbackAt || createdAt > newestFeedbackAt) newestFeedbackAt = createdAt;
    }
  }

  await writeState(p, {
    lastSeenAgentMessageAt: (newestMessageAt ?? lastMessageAt)?.toISOString() ?? state.lastSeenAgentMessageAt,
    lastSeenFeedbackAt: (newestFeedbackAt ?? lastFeedbackAt)?.toISOString() ?? state.lastSeenFeedbackAt,
  });

  if (detected.length === 0) {
    await appendLog(p, 'no new AgentMessage/ManagementFeedback detected');
    return { detected };
  }

  const notificationPath = await writeNotification(p, detected);
  await appendLog(p, `detected ${detected.length} new item(s), wrote ${notificationPath}`);
  return { detected, notificationPath };
}

export async function runOnceWithLock(
  connector: Connector,
  dataDir = 'data',
): Promise<{ skipped: true } | { skipped: false; detected: DetectedItem[]; notificationPath?: string }> {
  const p = paths(dataDir);
  const runId = randomUUID();
  const got = await acquireLock(p);
  if (!got) {
    await appendLog(p, `run ${runId} skipped: another run appears to be in progress`);
    return { skipped: true };
  }
  try {
    const result = await runOnce(connector, dataDir);
    return { skipped: false, ...result };
  } catch (error) {
    await appendLog(p, `run ${runId} failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  } finally {
    await releaseLock(p);
  }
}

function isMainModule(): boolean {
  return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]!).href;
}

if (isMainModule()) {
  const connector = new Connector(loadConnectorConfig());
  runOnceWithLock(connector).catch((error: unknown) => {
    console.error('Fatal error:', error);
    process.exitCode = 1;
  });
}
