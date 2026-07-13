#!/usr/bin/env node
/**
 * pnpm timeline — 各Logを横断した時系列一覧（Version8）
 *
 * 対象：Reflection/AppearanceLog/SkinLog/PurchaseLog/ChallengeLog/
 * Capture（「ある瞬間の出来事」を持つLog）。Memory/Life Inventoryは
 * 対象外（ADR 0009）。
 */
import { argv } from 'node:process';
import { GetTimelineUseCase } from '../../application/use-cases/timeline/GetTimeline.js';
import { JsonFileReflectionRepository } from '../../adapters/repositories/JsonFileReflectionRepository.js';
import { JsonFileAppearanceLogRepository } from '../../adapters/repositories/JsonFileAppearanceLogRepository.js';
import { JsonFileSkinLogRepository } from '../../adapters/repositories/JsonFileSkinLogRepository.js';
import { JsonFilePurchaseLogRepository } from '../../adapters/repositories/JsonFilePurchaseLogRepository.js';
import { JsonFileChallengeLogRepository } from '../../adapters/repositories/JsonFileChallengeLogRepository.js';
import { JsonFileCaptureRepository } from '../../adapters/repositories/JsonFileCaptureRepository.js';
import { JsonFileThirdPersonEvaluationRepository } from '../../adapters/repositories/JsonFileThirdPersonEvaluationRepository.js';
import { JsonFileExternalKnowledgeRepository } from '../../adapters/repositories/JsonFileExternalKnowledgeRepository.js';
import { JsonFileExternalSourceRepository } from '../../adapters/repositories/JsonFileExternalSourceRepository.js';
import type { TimelineSource } from '../../domain/value-objects/TimelineEntry.js';

function line(char = '─', length = 44): string {
  return char.repeat(length);
}

function parseArg(name: string): string | undefined {
  return argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
}

async function main(): Promise<void> {
  const since = parseArg('since');
  const source = parseArg('source') as TimelineSource | undefined;
  const limitRaw = parseArg('limit');
  const limit = limitRaw ? Number(limitRaw) : undefined;

  const useCase = new GetTimelineUseCase(
    new JsonFileReflectionRepository(),
    new JsonFileAppearanceLogRepository(),
    new JsonFileSkinLogRepository(),
    new JsonFilePurchaseLogRepository(),
    new JsonFileChallengeLogRepository(),
    new JsonFileCaptureRepository(),
    new JsonFileThirdPersonEvaluationRepository(),
    new JsonFileExternalKnowledgeRepository(),
    new JsonFileExternalSourceRepository(),
  );

  const { entries } = await useCase.execute({ since, source, limit });

  console.log('');
  console.log(line('='));
  console.log('  Timeline' + (source ? `（${source}）` : ''));
  console.log(line('='));

  if (entries.length === 0) {
    console.log('\n記録がありません。');
    return;
  }

  for (const entry of entries) {
    console.log(`\n■ ${entry.date} [${entry.source}] ${entry.title}`);
    if (entry.summary) console.log(`  ${entry.summary}`);
  }
  console.log('');
}

main().catch((error: unknown) => {
  console.error('エラーが発生しました:', error);
  process.exitCode = 1;
});
