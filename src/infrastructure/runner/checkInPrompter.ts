#!/usr/bin/env node
/**
 * Check-In Prompter（Version26、行動介入レイヤー）
 *
 * `collaborationRunner.ts`（Version20、ADR 0046）と同型の一回実行
 * スクリプト——独自のインプロセススケジューラは持たず、繰り返し実行は
 * Windowsタスクスケジューラに委ねる（`scripts/register-scheduled-
 * tasks.ps1`、ADR 0047のCollaborationRunnerタスクと同じ2時間間隔の
 * パターン）。
 *
 * `GenerateInterventionsUseCase`（決定的ルールエンジン）を**Connector/
 * HTTP経由ではなく直接import**して呼ぶ——このスクリプト自身がOwner本人
 * のマシン上でローカル実行される前提であり、Remote MCP（現状無認証）
 * に新しい書き込み可能エンドポイントを追加しないため（ADR 0053）。
 * ルールエンジン自体がdedup/cooldown/quiet hours/除外ウィンドウ/1日
 * 上限を内部で判定するため、このスクリプトは「独自のlast-seen状態」を
 * 持たない——`collaborationRunner.ts`とはこの点で異なる。
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { GenerateInterventionsUseCase } from '../../application/use-cases/intervention/GenerateInterventions.js';
import { JsonFileCheckInRepository } from '../../adapters/repositories/JsonFileCheckInRepository.js';
import { JsonFileDistractionSignalRepository } from '../../adapters/repositories/JsonFileDistractionSignalRepository.js';
import { JsonFileInterventionRepository } from '../../adapters/repositories/JsonFileInterventionRepository.js';
import { JsonFileInterventionPolicySettingsRepository } from '../../adapters/repositories/JsonFileInterventionPolicySettingsRepository.js';
import type { Intervention } from '../../domain/entities/Intervention.js';
import { appendLog, isMainModule } from './runnerLock.js';
import { executeControlledRun } from './runnerControlPlane.js';

interface RunnerPaths {
  lockPath: string;
  logPath: string;
  notificationsDir: string;
}

function paths(dataDir: string): RunnerPaths {
  return {
    lockPath: path.join(dataDir, 'checkin-runner.lock'),
    logPath: path.join(dataDir, 'checkin-runner.log'),
    // collaborationRunner.tsと同じ通知ディレクトリを共有する（機械的な
    // 検知結果の集約先という役割が同じため）。
    notificationsDir: path.join(dataDir, 'runner-notifications'),
  };
}

async function writeNotification(p: RunnerPaths, generated: Intervention[]): Promise<string> {
  await mkdir(p.notificationsDir, { recursive: true });
  const filename = `${new Date().toISOString().replace(/[:.]/g, '-')}-checkin.md`;
  const filePath = path.join(p.notificationsDir, filename);
  const lines = [
    `# Check-In Prompter 介入生成（${new Date().toISOString()}）`,
    '',
    '決定的ルールエンジンによる機械的な生成結果のみ。内容の解釈は含まない（ADR 0053）。',
    '',
    ...generated.map(
      (i) => `- [${i.record.intensity}] ${i.record.triggerRuleId}: ${i.record.message}`,
    ),
    '',
  ];
  await writeFile(filePath, lines.join('\n'), 'utf-8');
  return filePath;
}

function buildUseCase(dataDir: string): GenerateInterventionsUseCase {
  return new GenerateInterventionsUseCase(
    new JsonFileCheckInRepository(path.join(dataDir, 'check-ins.json')),
    new JsonFileDistractionSignalRepository(path.join(dataDir, 'distraction-signals.json')),
    new JsonFileInterventionRepository(path.join(dataDir, 'interventions.json')),
    new JsonFileInterventionPolicySettingsRepository(path.join(dataDir, 'intervention-policy-settings.json')),
  );
}

export async function runOnce(
  dataDir = 'data',
): Promise<{ generated: Intervention[]; notificationPath?: string }> {
  const p = paths(dataDir);
  const useCase = buildUseCase(dataDir);
  const { generated } = await useCase.execute({ now: new Date() });

  if (generated.length === 0) {
    await appendLog(p.logPath, 'no new interventions generated');
    return { generated };
  }

  const notificationPath = await writeNotification(p, generated);
  await appendLog(p.logPath, `generated ${generated.length} intervention(s), wrote ${notificationPath}`);
  return { generated, notificationPath };
}

export async function runOnceWithLock(
  dataDir = 'data',
): Promise<{ skipped: true } | { skipped: false; generated: Intervention[]; notificationPath?: string }> {
  const p = paths(dataDir);
  const controlled = await executeControlledRun({
    runner: 'check-in',
    dataDir,
    lockPath: p.lockPath,
    logPath: p.logPath,
    execute: () => runOnce(dataDir),
  });
  return controlled.skipped ? { skipped: true } : { skipped: false, ...controlled.value };
}

if (isMainModule(import.meta.url)) {
  runOnceWithLock().catch((error: unknown) => {
    console.error('Fatal error:', error);
    process.exitCode = 1;
  });
}
