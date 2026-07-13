#!/usr/bin/env node
/**
 * pnpm appearance -- add|list — Appearance Log（Version4）
 *
 * 毎月の外見記録。画像解析は行わず、写真ファイルの管理のみ
 * （Owner要件）。写真は `data/appearance-photos/` にコピーして保存する。
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout, argv } from 'node:process';
import { AddAppearanceLogUseCase } from '../../application/use-cases/appearance/AddAppearanceLog.js';
import { ListAppearanceLogsUseCase } from '../../application/use-cases/appearance/ListAppearanceLogs.js';
import { JsonFileAppearanceLogRepository } from '../../adapters/repositories/JsonFileAppearanceLogRepository.js';
import { savePhoto } from '../storage/photoStore.js';

const PHOTO_DIR = 'data/appearance-photos';

function line(char = '─', length = 44): string {
  return char.repeat(length);
}

function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

async function runAdd(): Promise<void> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    console.log('\n=== Appearance Logを追加 ===');
    const dateRaw = await rl.question(`撮影日 (YYYY-MM-DD, Enterで今日=${today()}): `);
    const date = dateRaw || today();

    const overallRatingRaw = await rl.question('総合評価 (1-5): ');
    const overallRating = Number(overallRatingRaw);
    if (!Number.isFinite(overallRating) || overallRating < 1 || overallRating > 5) {
      console.log('総合評価は1〜5の数字で入力してください。中止しました。');
      return;
    }

    const skin = await rl.question('肌 (任意): ');
    const hair = await rl.question('髪 (任意): ');
    const beard = await rl.question('髭 (任意): ');
    const outfit = await rl.question('服装 (任意): ');
    const physique = await rl.question('体型 (任意): ');
    const comment = await rl.question('コメント (任意): ');
    const improvementSuggestions = await rl.question('改善提案 (任意): ');
    const photoSourcePath = await rl.question(
      '写真ファイルのパス (任意、PCに保存済みのファイルを指定): ',
    );

    let photoPath: string | undefined;
    if (photoSourcePath.trim()) {
      try {
        photoPath = await savePhoto({
          sourcePath: photoSourcePath.trim(),
          destDir: PHOTO_DIR,
          filenamePrefix: date,
        });
        console.log(`  写真を保存しました: ${photoPath}`);
      } catch (error) {
        console.log(
          `  写真の保存に失敗しました（記録自体は続行します）: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    const repository = new JsonFileAppearanceLogRepository();
    const useCase = new AddAppearanceLogUseCase(repository);
    await useCase.execute({
      record: {
        date,
        overallRating,
        skin: skin || undefined,
        hair: hair || undefined,
        beard: beard || undefined,
        outfit: outfit || undefined,
        physique: physique || undefined,
        comment: comment || undefined,
        improvementSuggestions: improvementSuggestions || undefined,
        photoPath,
      },
    });

    console.log(`\n記録しました（${date}, 総合評価 ${overallRating}/5）。`);
  } finally {
    rl.close();
  }
}

async function runList(): Promise<void> {
  const repository = new JsonFileAppearanceLogRepository();
  const useCase = new ListAppearanceLogsUseCase(repository);
  const { logs } = await useCase.execute();

  console.log('');
  console.log(line('='));
  console.log('  Appearance Log');
  console.log(line('='));

  if (logs.length === 0) {
    console.log('\n記録がありません。`pnpm appearance -- add` で追加できます。');
    return;
  }

  for (const log of logs) {
    console.log(`\n■ ${log.date}（総合評価: ${log.record.overallRating}/5）`);
    if (log.record.skin) console.log(`  肌      : ${log.record.skin}`);
    if (log.record.hair) console.log(`  髪      : ${log.record.hair}`);
    if (log.record.beard) console.log(`  髭      : ${log.record.beard}`);
    if (log.record.outfit) console.log(`  服装    : ${log.record.outfit}`);
    if (log.record.physique) console.log(`  体型    : ${log.record.physique}`);
    if (log.record.comment) console.log(`  コメント: ${log.record.comment}`);
    if (log.record.improvementSuggestions) {
      console.log(`  改善提案: ${log.record.improvementSuggestions}`);
    }
    if (log.record.photoPath) console.log(`  写真    : ${log.record.photoPath}`);
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
      console.log('使い方: pnpm run appearance -- <add|list>');
      process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error('エラーが発生しました:', error);
  process.exitCode = 1;
});
