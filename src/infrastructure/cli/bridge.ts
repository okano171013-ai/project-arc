#!/usr/bin/env node
/**
 * pnpm bridge -- import|export — Bridge Layer（Version9）
 *
 * Import: `{ "logs": [{ "type": "...", "data": {...} }, ...] }`形式の
 * JSONファイルを一括登録する。Export: 各Logを全種別またはtype指定で
 * JSON出力する。将来CLI/REST API/MCP/SDKのどこからでも同じUseCase
 * （ImportLogsUseCase/ExportLogsUseCase）を利用できるようにする狙い
 * （ARCブリーフ、ADR 0010）。このCLI自身はどのLogへ書くべきかを
 * 判断しない——`type`は呼び出し側が確定済みの値として渡す必要がある。
 */
import { readFile } from 'node:fs/promises';
import { argv } from 'node:process';
import { ImportLogsUseCase } from '../../application/use-cases/bridge/ImportLogs.js';
import { ExportLogsUseCase } from '../../application/use-cases/bridge/ExportLogs.js';
import type { BridgeLogType } from '../../domain/value-objects/BridgeLogType.js';
import { JsonFileReflectionRepository } from '../../adapters/repositories/JsonFileReflectionRepository.js';
import { JsonFileMemoryRepository } from '../../adapters/repositories/JsonFileMemoryRepository.js';
import { JsonFileInventoryRepository } from '../../adapters/repositories/JsonFileInventoryRepository.js';
import { JsonFileAppearanceLogRepository } from '../../adapters/repositories/JsonFileAppearanceLogRepository.js';
import { JsonFileSkinLogRepository } from '../../adapters/repositories/JsonFileSkinLogRepository.js';
import { JsonFilePurchaseLogRepository } from '../../adapters/repositories/JsonFilePurchaseLogRepository.js';
import { JsonFileChallengeLogRepository } from '../../adapters/repositories/JsonFileChallengeLogRepository.js';
import { JsonFileThirdPersonEvaluationRepository } from '../../adapters/repositories/JsonFileThirdPersonEvaluationRepository.js';
import { JsonFileExternalSourceRepository } from '../../adapters/repositories/JsonFileExternalSourceRepository.js';
import { JsonFileExternalKnowledgeRepository } from '../../adapters/repositories/JsonFileExternalKnowledgeRepository.js';
import { JsonFileMealLogRepository } from '../../adapters/repositories/JsonFileMealLogRepository.js';
import { JsonFileNutritionLogRepository } from '../../adapters/repositories/JsonFileNutritionLogRepository.js';
import { JsonFileWeightLogRepository } from '../../adapters/repositories/JsonFileWeightLogRepository.js';
import { JsonFileFinanceLogRepository } from '../../adapters/repositories/JsonFileFinanceLogRepository.js';
import { JsonFileStudySessionRepository } from '../../adapters/repositories/JsonFileStudySessionRepository.js';

function line(char = '─', length = 44): string {
  return char.repeat(length);
}

function buildUseCases() {
  const reflectionRepository = new JsonFileReflectionRepository();
  const memoryRepository = new JsonFileMemoryRepository();
  const inventoryRepository = new JsonFileInventoryRepository();
  const appearanceLogRepository = new JsonFileAppearanceLogRepository();
  const skinLogRepository = new JsonFileSkinLogRepository();
  const purchaseLogRepository = new JsonFilePurchaseLogRepository();
  const challengeLogRepository = new JsonFileChallengeLogRepository();
  const thirdPersonEvaluationRepository = new JsonFileThirdPersonEvaluationRepository();
  const externalSourceRepository = new JsonFileExternalSourceRepository();
  const externalKnowledgeRepository = new JsonFileExternalKnowledgeRepository();
  const mealLogRepository = new JsonFileMealLogRepository();
  const nutritionLogRepository = new JsonFileNutritionLogRepository();
  const weightLogRepository = new JsonFileWeightLogRepository();
  const financeLogRepository = new JsonFileFinanceLogRepository();
  const studySessionRepository = new JsonFileStudySessionRepository();

  return {
    importLogs: new ImportLogsUseCase(
      reflectionRepository,
      memoryRepository,
      inventoryRepository,
      appearanceLogRepository,
      skinLogRepository,
      purchaseLogRepository,
      challengeLogRepository,
      thirdPersonEvaluationRepository,
      externalSourceRepository,
      externalKnowledgeRepository,
      mealLogRepository,
      nutritionLogRepository,
      weightLogRepository,
      financeLogRepository,
      studySessionRepository,
    ),
    exportLogs: new ExportLogsUseCase(
      reflectionRepository,
      memoryRepository,
      inventoryRepository,
      appearanceLogRepository,
      skinLogRepository,
      purchaseLogRepository,
      challengeLogRepository,
      thirdPersonEvaluationRepository,
      externalSourceRepository,
      externalKnowledgeRepository,
      mealLogRepository,
      nutritionLogRepository,
      weightLogRepository,
      financeLogRepository,
      studySessionRepository,
    ),
  };
}

async function runImport(): Promise<void> {
  // argv.slice(2)からサブコマンド自体("--"含む)を除いた最初の非フラグ
  // 引数がファイルパス。単純に固定インデックスを仮定しない（pnpmが
  // "--"を挟むため、位置がコマンド起動経路によってずれる）。
  const args = argv.slice(2).filter((a) => a !== '--');
  const filePath = args.slice(1).find((a) => !a.startsWith('--'));
  if (!filePath) {
    console.log('使い方: pnpm run bridge -- import <JSONファイルのパス>');
    console.log('形式:   { "logs": [{ "type": "SkinLog", "data": { "record": {...} } }, ...] }');
    process.exitCode = 1;
    return;
  }

  let parsed: unknown;
  try {
    const raw = await readFile(filePath, 'utf-8');
    parsed = JSON.parse(raw);
  } catch (error) {
    console.log(`ファイルの読み込みに失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
    return;
  }

  const logs = (parsed as { logs?: unknown }).logs;
  if (!Array.isArray(logs)) {
    console.log('JSONの形式が不正です。"logs"配列が必要です。');
    process.exitCode = 1;
    return;
  }

  const { importLogs } = buildUseCases();
  const result = await importLogs.execute({ logs: logs as Parameters<typeof importLogs.execute>[0]['logs'] });

  console.log('');
  console.log(line('='));
  console.log('  Bridge Import');
  console.log(line('='));
  console.log(`\n成功: ${result.successCount}件 / 失敗: ${result.failureCount}件\n`);
  for (const r of result.results) {
    if (r.ok) {
      console.log(`✓ ${r.type} → ${r.id?.slice(0, 8)}`);
    } else {
      console.log(`✗ ${r.type} → ${r.error}`);
    }
  }
  console.log('');
}

async function runExport(): Promise<void> {
  const typeArg = argv.find((a) => a.startsWith('--type='))?.split('=')[1] as
    | BridgeLogType
    | undefined;

  const { exportLogs } = buildUseCases();
  const result = await exportLogs.execute({ type: typeArg });

  console.log(JSON.stringify(result, null, 2));
}

async function main(): Promise<void> {
  const args = argv.slice(2).filter((a) => a !== '--');
  const subcommand = args[0];

  switch (subcommand) {
    case 'import':
      await runImport();
      break;
    case 'export':
      await runExport();
      break;
    default:
      console.log('使い方: pnpm run bridge -- <import|export>');
      process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error('エラーが発生しました:', error);
  process.exitCode = 1;
});
