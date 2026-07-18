/**
 * runnerLock（Version26由来の共通化）
 *
 * `collaborationRunner.ts`（Version20）と`checkInPrompter.ts`
 * （Version26）が同型のstale-lock検知・追記ログ・isMainModule判定を
 * 個別に持っていた（2つ目の類似スクリプトが増えた段階で共通化する、
 * というVersion26 Report記載の方針どおり）。両スクリプトの外部から
 * 見える挙動（ロックファイル・ログファイルの形式）は変更しない。
 */
import { mkdir, readFile, writeFile, appendFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/** このロックより古いものは、前回実行がクラッシュしたとみなし無視する。 */
export const STALE_LOCK_MS = 30 * 60 * 1000;

interface LockInfo {
  pid: number;
  startedAt: string;
}

export async function appendLog(logPath: string, line: string): Promise<void> {
  await mkdir(path.dirname(logPath), { recursive: true });
  const stamped = `[${new Date().toISOString()}] ${line}\n`;
  await appendFile(logPath, stamped, 'utf-8');
}

/**
 * タスクスケジューラの「既に実行中なら開始しない」設定を主たる防止策とし、
 * このロックファイルは保険（同時に手動実行された場合等に備える）。
 */
export async function acquireLock(lockPath: string, logPath: string): Promise<boolean> {
  await mkdir(path.dirname(lockPath), { recursive: true });
  if (existsSync(lockPath)) {
    const raw = await readFile(lockPath, 'utf-8');
    const lock = JSON.parse(raw) as LockInfo;
    const age = Date.now() - new Date(lock.startedAt).getTime();
    if (age < STALE_LOCK_MS) {
      return false;
    }
    await appendLog(logPath, `stale lock (pid ${lock.pid}, age ${Math.round(age / 1000)}s) ignored`);
  }
  const info: LockInfo = { pid: process.pid, startedAt: new Date().toISOString() };
  await writeFile(lockPath, JSON.stringify(info, null, 2), 'utf-8');
  return true;
}

export async function releaseLock(lockPath: string): Promise<void> {
  if (existsSync(lockPath)) await rm(lockPath);
}

export function isMainModule(): boolean {
  return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]!).href;
}
