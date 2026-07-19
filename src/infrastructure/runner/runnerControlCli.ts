#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { isMainModule } from './runnerLock.js';
import { killSwitchPath, readRunnerStatus, setRunnersDisabled } from './runnerControlPlane.js';

export async function runRunnerControlCommand(
  command: string | undefined,
  reason: string | undefined,
  dataDir = 'data',
): Promise<unknown> {
  switch (command) {
    case 'status':
    case undefined:
      return {
        disabled: existsSync(killSwitchPath(dataDir)),
        runners: {
          collaboration: await readRunnerStatus(dataDir, 'collaboration'),
          checkIn: await readRunnerStatus(dataDir, 'check-in'),
        },
      };
    case 'disable':
      await setRunnersDisabled(dataDir, true, reason);
      return { disabled: true, reason: reason?.trim() || 'manual kill switch' };
    case 'enable':
      await setRunnersDisabled(dataDir, false);
      return { disabled: false };
    default:
      throw new Error('usage: pnpm runner-control [status|disable|enable] [reason]');
  }
}

if (isMainModule(import.meta.url)) {
  runRunnerControlCommand(process.argv[2], process.argv.slice(3).join(' ') || undefined)
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
