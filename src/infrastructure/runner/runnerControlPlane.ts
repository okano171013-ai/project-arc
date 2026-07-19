import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { getMcpCapabilityRegistry } from '../mcp/capabilityRegistry.js';
import { acquireLock, appendLog, releaseLock } from './runnerLock.js';

export type RunnerName = 'collaboration' | 'check-in';
export type RunnerOutcome = 'running' | 'succeeded' | 'failed' | 'skipped-locked' | 'disabled';

export interface RunnerStatus {
  readonly runner: RunnerName;
  readonly runId: string;
  readonly outcome: RunnerOutcome;
  readonly buildCommit: string;
  readonly projectVersion: number;
  readonly startedAt: string;
  readonly finishedAt?: string;
  readonly detail?: string;
}

export interface ControlledRunOptions<T> {
  readonly runner: RunnerName;
  readonly dataDir: string;
  readonly lockPath: string;
  readonly logPath: string;
  readonly execute: () => Promise<T>;
}

export type ControlledRunResult<T> =
  | { skipped: true; reason: 'disabled' | 'locked' }
  | { skipped: false; value: T };

function controlDir(dataDir: string): string {
  return path.join(dataDir, 'runner-control');
}

export function killSwitchPath(dataDir: string): string {
  return path.join(controlDir(dataDir), 'disabled.json');
}

export function runnerStatusPath(dataDir: string, runner: RunnerName): string {
  return path.join(controlDir(dataDir), 'status', `${runner}.json`);
}

async function writeStatus(dataDir: string, status: RunnerStatus): Promise<void> {
  const statusPath = runnerStatusPath(dataDir, status.runner);
  await mkdir(path.dirname(statusPath), { recursive: true });
  await writeFile(statusPath, JSON.stringify(status, null, 2), 'utf8');
}

export async function readRunnerStatus(dataDir: string, runner: RunnerName): Promise<RunnerStatus | undefined> {
  const statusPath = runnerStatusPath(dataDir, runner);
  if (!existsSync(statusPath)) return undefined;
  return JSON.parse(await readFile(statusPath, 'utf8')) as RunnerStatus;
}

export async function setRunnersDisabled(dataDir: string, disabled: boolean, reason?: string): Promise<void> {
  const switchPath = killSwitchPath(dataDir);
  if (!disabled) {
    if (existsSync(switchPath)) await rm(switchPath);
    return;
  }
  await mkdir(path.dirname(switchPath), { recursive: true });
  await writeFile(
    switchPath,
    JSON.stringify({ disabledAt: new Date().toISOString(), reason: reason?.trim() || 'manual kill switch' }, null, 2),
    'utf8',
  );
}

export async function executeControlledRun<T>(options: ControlledRunOptions<T>): Promise<ControlledRunResult<T>> {
  const runId = randomUUID();
  const startedAt = new Date().toISOString();
  const capability = getMcpCapabilityRegistry();
  const base = {
    runner: options.runner,
    runId,
    buildCommit: capability.buildCommit,
    projectVersion: capability.projectVersion,
    startedAt,
  } as const;

  if (existsSync(killSwitchPath(options.dataDir))) {
    await writeStatus(options.dataDir, {
      ...base,
      outcome: 'disabled',
      finishedAt: new Date().toISOString(),
      detail: 'global runner kill switch is active',
    });
    await appendLog(options.logPath, `run ${runId} skipped: global runner kill switch is active`);
    return { skipped: true, reason: 'disabled' };
  }

  const gotLock = await acquireLock(options.lockPath, options.logPath);
  if (!gotLock) {
    await writeStatus(options.dataDir, {
      ...base,
      outcome: 'skipped-locked',
      finishedAt: new Date().toISOString(),
      detail: 'another run appears to be in progress',
    });
    await appendLog(options.logPath, `run ${runId} skipped: another run appears to be in progress`);
    return { skipped: true, reason: 'locked' };
  }

  await writeStatus(options.dataDir, { ...base, outcome: 'running' });
  try {
    const value = await options.execute();
    await writeStatus(options.dataDir, {
      ...base,
      outcome: 'succeeded',
      finishedAt: new Date().toISOString(),
    });
    return { skipped: false, value };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    await writeStatus(options.dataDir, {
      ...base,
      outcome: 'failed',
      finishedAt: new Date().toISOString(),
      detail,
    });
    await appendLog(options.logPath, `run ${runId} failed: ${detail}`);
    throw error;
  } finally {
    await releaseLock(options.lockPath);
  }
}
