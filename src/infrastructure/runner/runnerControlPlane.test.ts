import { beforeEach, describe, expect, it } from 'vitest';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { executeControlledRun, readRunnerStatus, setRunnersDisabled } from './runnerControlPlane.js';
import { PROJECT_ARC_VERSION } from '../mcp/capabilityRegistry.js';

describe('Runner Control Plane', () => {
  const DATA_DIR = 'data/_test-runner-control-plane';
  const lockPath = path.join(DATA_DIR, 'runner.lock');
  const logPath = path.join(DATA_DIR, 'runner.log');

  beforeEach(async () => {
    await rm(DATA_DIR, { recursive: true, force: true });
  });

  it('records build-aware success status', async () => {
    const result = await executeControlledRun({
      runner: 'collaboration',
      dataDir: DATA_DIR,
      lockPath,
      logPath,
      execute: async () => 'ok',
    });
    expect(result).toEqual({ skipped: false, value: 'ok' });
    const status = await readRunnerStatus(DATA_DIR, 'collaboration');
    expect(status?.outcome).toBe('succeeded');
    expect(status?.projectVersion).toBe(PROJECT_ARC_VERSION);
    expect(status?.buildCommit).toMatch(/^(unknown|[0-9a-f]{40})$/);
  });

  it('global kill switch prevents execution', async () => {
    await setRunnersDisabled(DATA_DIR, true, 'maintenance');
    let called = false;
    const result = await executeControlledRun({
      runner: 'check-in',
      dataDir: DATA_DIR,
      lockPath,
      logPath,
      execute: async () => {
        called = true;
      },
    });
    expect(result).toEqual({ skipped: true, reason: 'disabled' });
    expect(called).toBe(false);
    expect((await readRunnerStatus(DATA_DIR, 'check-in'))?.outcome).toBe('disabled');
  });

  it('enable removes the kill switch', async () => {
    await setRunnersDisabled(DATA_DIR, true);
    await setRunnersDisabled(DATA_DIR, false);
    const result = await executeControlledRun({
      runner: 'check-in', dataDir: DATA_DIR, lockPath, logPath, execute: async () => 1,
    });
    expect(result).toEqual({ skipped: false, value: 1 });
  });

  it('records locked and failed outcomes', async () => {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(lockPath, JSON.stringify({ pid: 1, startedAt: new Date().toISOString() }), 'utf8');
    const locked = await executeControlledRun({
      runner: 'collaboration', dataDir: DATA_DIR, lockPath, logPath, execute: async () => 1,
    });
    expect(locked).toEqual({ skipped: true, reason: 'locked' });
    expect((await readRunnerStatus(DATA_DIR, 'collaboration'))?.outcome).toBe('skipped-locked');

    await rm(lockPath);
    await expect(executeControlledRun({
      runner: 'collaboration', dataDir: DATA_DIR, lockPath, logPath,
      execute: async () => { throw new Error('boom'); },
    })).rejects.toThrow('boom');
    expect((await readRunnerStatus(DATA_DIR, 'collaboration'))?.outcome).toBe('failed');
  });
});
