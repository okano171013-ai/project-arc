import { describe, it, expect, beforeEach } from 'vitest';
import { rm, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { runOnce, runOnceWithLock } from './checkInPrompter.js';
import { JsonFileCheckInRepository } from '../../adapters/repositories/JsonFileCheckInRepository.js';
import { CheckIn } from '../../domain/entities/CheckIn.js';

/**
 * Check-In Prompter（Version26）のend-to-endテスト。実データファイルを
 * 直接操作して`GenerateInterventionsUseCase`を駆動する
 * （`collaborationRunner.test.ts`と同じ「実物を起動して確認する」流儀
 * ——ただしこちらはHTTP APIを経由しない設計のため、Repositoryを直接
 * 操作する）。
 */
describe('Check-In Prompter', () => {
  const DATA_DIR = 'data/_test-checkin-runner';

  beforeEach(async () => {
    await rm(DATA_DIR, { recursive: true, force: true });
  });

  it('generates an intervention and writes a notification when a check-in is overdue', async () => {
    // quiet hours（既定23:00-07:00、InterventionPolicySettings）の
    // 影響を受けないよう、実行時刻に関わらず日中固定の`now`を注入する
    // （実wall-clockに依存すると、quiet hours帯に実行した場合だけ
    // 失敗するflaky testになる——実際に2026-07-20 05:xx UTC実行時に
    // 発覚したバグ、Version38 Report参照）。
    const fixedNow = new Date('2026-07-20T14:00:00.000Z');
    const checkInRepository = new JsonFileCheckInRepository(path.join(DATA_DIR, 'check-ins.json'));
    await checkInRepository.save(
      CheckIn.create({
        id: 'c-1',
        record: {
          occurredAt: new Date(fixedNow.getTime() - 300 * 60 * 1000).toISOString(),
          currentActivity: 'x',
          nextTwoHourGoal: 'y',
        },
      }),
    );

    const result = await runOnce(DATA_DIR, fixedNow);

    expect(result.generated.length).toBeGreaterThan(0);
    expect(result.notificationPath).toBeDefined();
    expect(existsSync(result.notificationPath!)).toBe(true);
    const notification = await readFile(result.notificationPath!, 'utf-8');
    expect(notification).toContain('overdue-checkin');
    expect(notification).toContain('内容の解釈は含まない');
  });

  it('writes nothing when no rule fires', async () => {
    // 同じ理由でquiet hoursの影響を受けない日中固定の`now`を使う
    // ——「overdueでないため発火しない」ことを検証する意図であり、
    // 「quiet hoursだから発火しない」との混同を避ける。
    const fixedNow = new Date('2026-07-20T14:00:00.000Z');
    const checkInRepository = new JsonFileCheckInRepository(path.join(DATA_DIR, 'check-ins.json'));
    await checkInRepository.save(
      CheckIn.create({
        id: 'c-2',
        record: { occurredAt: fixedNow.toISOString(), currentActivity: 'x', nextTwoHourGoal: 'y' },
      }),
    );

    const result = await runOnce(DATA_DIR, fixedNow);

    expect(result.generated).toHaveLength(0);
    expect(result.notificationPath).toBeUndefined();
  });

  it('skips a second run while a lock is held', async () => {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(
      path.join(DATA_DIR, 'checkin-runner.lock'),
      JSON.stringify({ pid: 999999, startedAt: new Date().toISOString() }),
      'utf-8',
    );

    const result = await runOnceWithLock(DATA_DIR);

    expect(result.skipped).toBe(true);
  });

  it('ignores a stale (30+ minute old) lock and proceeds', async () => {
    await mkdir(DATA_DIR, { recursive: true });
    const staleTime = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    await writeFile(
      path.join(DATA_DIR, 'checkin-runner.lock'),
      JSON.stringify({ pid: 999999, startedAt: staleTime }),
      'utf-8',
    );

    const result = await runOnceWithLock(DATA_DIR);

    expect(result.skipped).toBe(false);
  });
});
