#!/usr/bin/env node
/**
 * pnpm capture -- add|list — Smart Capture（Version6）
 *
 * 写真・文章から「どのLogを更新すべきか」の機械的な下書き提案を
 * 表示するが、最終的な記録先の確定はOwner（またはARCとの会話を経た
 * Owner）が行う。Project ARC（System）は分類・解釈を行わず、確定した
 * 振り分け先への書き込みのみを忠実に実行する（ADR 0007、
 * `docs/ai-roles.md`）。
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout, argv } from 'node:process';
import { SuggestCaptureDestinationsUseCase } from '../../application/use-cases/capture/SuggestCaptureDestinations.js';
import {
  RecordCaptureUseCase,
  type RecordCaptureDestination,
} from '../../application/use-cases/capture/RecordCapture.js';
import { RuleBasedCaptureClassifier } from '../../adapters/providers/RuleBasedCaptureClassifier.js';
import { JsonFileCaptureRepository } from '../../adapters/repositories/JsonFileCaptureRepository.js';
import { JsonFileSkinLogRepository } from '../../adapters/repositories/JsonFileSkinLogRepository.js';
import { JsonFilePurchaseLogRepository } from '../../adapters/repositories/JsonFilePurchaseLogRepository.js';
import { JsonFileChallengeLogRepository } from '../../adapters/repositories/JsonFileChallengeLogRepository.js';
import { JsonFileAppearanceLogRepository } from '../../adapters/repositories/JsonFileAppearanceLogRepository.js';
import { savePhoto } from '../storage/photoStore.js';
import type { CaptureLogType, CaptureSuggestion } from '../../domain/entities/Capture.js';

const PHOTO_DIR = 'data/capture-photos';
const ALL_LOG_TYPES: CaptureLogType[] = ['SkinLog', 'PurchaseLog', 'ChallengeLog', 'AppearanceLog'];

function line(char = '─', length = 44): string {
  return char.repeat(length);
}

function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function buildRepositories() {
  return {
    captureRepository: new JsonFileCaptureRepository(),
    skinLogRepository: new JsonFileSkinLogRepository(),
    purchaseLogRepository: new JsonFilePurchaseLogRepository(),
    challengeLogRepository: new JsonFileChallengeLogRepository(),
    appearanceLogRepository: new JsonFileAppearanceLogRepository(),
  };
}

/** 提案に含まれない必須項目を、捏造せずOwnerに確認して埋める。 */
async function ensureRequiredFields(
  rl: ReturnType<typeof createInterface>,
  logType: CaptureLogType,
  fields: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const filled = { ...fields };
  if (logType === 'ChallengeLog' && typeof filled.title !== 'string') {
    filled.title = await rl.question('  ChallengeLogのtitle（必須）: ');
  }
  if (logType === 'PurchaseLog' && typeof filled.productName !== 'string') {
    filled.productName = await rl.question('  PurchaseLogのproductName（必須）: ');
  }
  if (logType === 'AppearanceLog' && typeof filled.overallRating !== 'number') {
    const raw = await rl.question('  AppearanceLogのoverallRating（必須、1〜5）: ');
    filled.overallRating = Number(raw);
  }
  return filled;
}

async function runAdd(): Promise<void> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    console.log('\n=== Smart Capture ===');
    const text = await rl.question('文章で説明してください（任意）: ');
    const photoSourcePath = await rl.question(
      '写真ファイルのパス（任意、PCに保存済みのファイルを指定）: ',
    );
    const capturedAt = today();

    if (!text.trim() && !photoSourcePath.trim()) {
      console.log('文章か写真のどちらかは必須です。中止しました。');
      return;
    }

    let photoPath: string | undefined;
    if (photoSourcePath.trim()) {
      try {
        photoPath = await savePhoto({
          sourcePath: photoSourcePath.trim(),
          destDir: PHOTO_DIR,
          filenamePrefix: capturedAt,
        });
        console.log(`  写真を保存しました: ${photoPath}`);
      } catch (error) {
        console.log(
          `  写真の保存に失敗しました（記録自体は続行します）: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    const classifier = new RuleBasedCaptureClassifier();
    const suggestUseCase = new SuggestCaptureDestinationsUseCase(classifier);
    const { suggestions } = await suggestUseCase.execute({ text: text || undefined, photoPath });

    console.log('');
    console.log(line('='));
    console.log('  📌 Auto Log 提案（下書き・要確認）');
    console.log(line('='));

    if (suggestions.length === 0) {
      console.log('\n機械的な提案はありませんでした（キーワード一致なし、または写真のみ）。');
    } else {
      for (const s of suggestions) {
        console.log(`\n✓ ${s.logType}（${s.reason}）`);
      }
    }

    const confirmed = await chooseDestinations(rl, suggestions);
    if (confirmed.length === 0) {
      console.log('\n記録する項目がないため中止しました。');
      return;
    }

    const destinations: RecordCaptureDestination[] = [];
    for (const { logType, fields } of confirmed) {
      const filled = await ensureRequiredFields(rl, logType, fields);
      destinations.push({ logType, fields: filled });
    }

    const repos = buildRepositories();
    const recordUseCase = new RecordCaptureUseCase(
      repos.captureRepository,
      repos.skinLogRepository,
      repos.purchaseLogRepository,
      repos.challengeLogRepository,
      repos.appearanceLogRepository,
    );
    const result = await recordUseCase.execute({
      text: text || undefined,
      photoPath,
      capturedAt,
      suggestions,
      destinations,
    });

    console.log('');
    console.log(line('='));
    console.log('  📌 ARC Auto Log');
    console.log(line('='));
    console.log(`\n更新件数：${result.applied.length}件\n`);
    for (const applied of result.applied) {
      console.log(`✓ ${applied.logType}`);
    }
    console.log('');
  } finally {
    rl.close();
  }
}

async function chooseDestinations(
  rl: ReturnType<typeof createInterface>,
  suggestions: CaptureSuggestion[],
): Promise<{ logType: CaptureLogType; fields: Record<string, unknown> }[]> {
  if (suggestions.length > 0) {
    const answer = await rl.question(
      '\nこのまま記録しますか？ (a)すべて確定 / (s)個別に選ぶ / (c)中止: ',
    );
    const choice = answer.trim().toLowerCase();
    if (choice === 'c') return [];
    if (choice === 'a') {
      return suggestions.map((s) => ({ logType: s.logType, fields: s.fields }));
    }
    if (choice === 's') {
      const picked: { logType: CaptureLogType; fields: Record<string, unknown> }[] = [];
      for (const s of suggestions) {
        const yn = await rl.question(`  ${s.logType}を記録しますか？ (y/n): `);
        if (yn.trim().toLowerCase() === 'y') {
          picked.push({ logType: s.logType, fields: s.fields });
        }
      }
      return picked;
    }
    console.log('不正な選択のため中止しました。');
    return [];
  }

  const manualRaw = await rl.question(
    '\n手動で記録先を選びますか？ (1=SkinLog 2=PurchaseLog 3=ChallengeLog 4=AppearanceLog, カンマ区切り, Enterで中止): ',
  );
  if (!manualRaw.trim()) return [];
  const indices = manualRaw
    .split(',')
    .map((s) => Number(s.trim()) - 1)
    .filter((i) => Number.isInteger(i) && i >= 0 && i < ALL_LOG_TYPES.length);
  return indices.map((i) => ({ logType: ALL_LOG_TYPES[i]!, fields: {} }));
}

async function runList(): Promise<void> {
  const repository = new JsonFileCaptureRepository();
  const captures = await repository.findAll();
  const sorted = [...captures].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  console.log('');
  console.log(line('='));
  console.log('  Capture Log（Smart Captureの実行履歴）');
  console.log(line('='));

  if (sorted.length === 0) {
    console.log('\n記録がありません。`pnpm capture -- add` で追加できます。');
    return;
  }

  for (const capture of sorted) {
    console.log(`\n■ ${capture.record.capturedAt}`);
    if (capture.record.text) console.log(`  入力: ${capture.record.text}`);
    if (capture.record.photoPath) console.log(`  写真: ${capture.record.photoPath}`);
    if (capture.record.appliedDestinations.length > 0) {
      const logs = capture.record.appliedDestinations.map((d) => d.logType).join(', ');
      console.log(`  記録先: ${logs}`);
    }
  }
  console.log('');
}

async function main(): Promise<void> {
  const args = argv.slice(2).filter((a) => a !== '--');
  const subcommand = args[0];

  switch (subcommand) {
    case 'add':
      await runAdd();
      break;
    case 'list':
      await runList();
      break;
    default:
      console.log('使い方: pnpm run capture -- <add|list>');
      process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error('エラーが発生しました:', error);
  process.exitCode = 1;
});
