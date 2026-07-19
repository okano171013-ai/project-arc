import { beforeEach, describe, expect, it } from 'vitest';
import { rm } from 'node:fs/promises';
import { runRunnerControlCommand } from './runnerControlCli.js';

describe('Runner Control CLI', () => {
  const DATA_DIR = 'data/_test-runner-control-cli';

  beforeEach(async () => {
    await rm(DATA_DIR, { recursive: true, force: true });
  });

  it('shows status and toggles the global kill switch', async () => {
    expect(await runRunnerControlCommand('status', undefined, DATA_DIR)).toMatchObject({ disabled: false });
    expect(await runRunnerControlCommand('disable', 'maintenance', DATA_DIR)).toEqual({
      disabled: true,
      reason: 'maintenance',
    });
    expect(await runRunnerControlCommand(undefined, undefined, DATA_DIR)).toMatchObject({ disabled: true });
    expect(await runRunnerControlCommand('enable', undefined, DATA_DIR)).toEqual({ disabled: false });
  });

  it('rejects unknown commands without changing state', async () => {
    await expect(runRunnerControlCommand('restart', undefined, DATA_DIR)).rejects.toThrow('usage:');
    expect(await runRunnerControlCommand('status', undefined, DATA_DIR)).toMatchObject({ disabled: false });
  });
});
