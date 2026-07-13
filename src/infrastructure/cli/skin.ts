#!/usr/bin/env node
/**
 * pnpm skin -- add|list|compare — Skin Log（Version5）
 *
 * 肌の状態を構造化項目（赤み・毛穴・ニキビ・ニキビ跡・皮脂）で記録し、
 * 頻繁に比較できるようにする。Appearance Log（月次の総合的な外見記録）
 * とは別物（ADR 0006）。画像解析は行わず、写真ファイルの管理のみ
 * （Owner要件）。写真は `data/skin-photos/` にコピーして保存する。
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout, argv } from 'node:process';
import { AddSkinLogUseCase } from '../../application/use-cases/skin/AddSkinLog.js';
import { ListSkinLogsUseCase } from '../../application/use-cases/skin/ListSkinLogs.js';
import { JsonFileSkinLogRepository } from '../../adapters/repositories/JsonFileSkinLogRepository.js';
import { savePhoto } from '../storage/photoStore.js';

const PHOTO_DIR = 'data/skin-photos';

function line(char = '─', length = 44): string {
  return char.repeat(length);
}

function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

async function askSeverity(
  rl: ReturnType<typeof createInterface>,
  label: string,
): Promise<number | undefined> {
  const raw = await rl.question(`${label} (1〜5, 任意): `);
  if (!raw.trim()) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 1 || value > 5) {
    console.log(`  ${label}は1〜5の数字で入力してください。この項目はスキップします。`);
    return undefined;
  }
  return value;
}

async function runAdd(): Promise<void> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    console.log('\n=== Skin Logを追加 ===');
    const dateRaw = await rl.question(`記録日 (YYYY-MM-DD, Enterで今日=${today()}): `);
    const date = dateRaw || today();

    const redness = await askSeverity(rl, '赤み');
    const pores = await askSeverity(rl, '毛穴');
    const acne = await askSeverity(rl, 'ニキビ');
    const acneScars = await askSeverity(rl, 'ニキビ跡');
    const sebum = await askSeverity(rl, '皮脂');
    const currentSkincare = await rl.question('使用中スキンケア (任意): ');
    const note = await rl.question('改善履歴・気づき (任意): ');
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

    const repository = new JsonFileSkinLogRepository();
    const useCase = new AddSkinLogUseCase(repository);
    await useCase.execute({
      record: {
        date,
        redness,
        pores,
        acne,
        acneScars,
        sebum,
        currentSkincare: currentSkincare || undefined,
        note: note || undefined,
        photoPath,
      },
    });

    console.log(`\n記録しました（${date}）。`);
  } finally {
    rl.close();
  }
}

async function runList(): Promise<void> {
  const repository = new JsonFileSkinLogRepository();
  const useCase = new ListSkinLogsUseCase(repository);
  const { logs } = await useCase.execute();

  console.log('');
  console.log(line('='));
  console.log('  Skin Log');
  console.log(line('='));

  if (logs.length === 0) {
    console.log('\n記録がありません。`pnpm skin -- add` で追加できます。');
    return;
  }

  for (const log of logs) {
    console.log(`\n■ ${log.date}`);
    if (log.record.redness !== undefined) console.log(`  赤み    : ${log.record.redness}/5`);
    if (log.record.pores !== undefined) console.log(`  毛穴    : ${log.record.pores}/5`);
    if (log.record.acne !== undefined) console.log(`  ニキビ  : ${log.record.acne}/5`);
    if (log.record.acneScars !== undefined) {
      console.log(`  ニキビ跡: ${log.record.acneScars}/5`);
    }
    if (log.record.sebum !== undefined) console.log(`  皮脂    : ${log.record.sebum}/5`);
    if (log.record.currentSkincare) {
      console.log(`  スキンケア: ${log.record.currentSkincare}`);
    }
    if (log.record.note) console.log(`  メモ    : ${log.record.note}`);
    if (log.record.photoPath) console.log(`  写真    : ${log.record.photoPath}`);
  }
  console.log('');
}

async function runCompare(): Promise<void> {
  const repository = new JsonFileSkinLogRepository();
  const useCase = new ListSkinLogsUseCase(repository);
  const { logs } = await useCase.execute();

  const withPhoto = logs.filter((log) => log.record.photoPath);

  console.log('');
  console.log(line('='));
  console.log('  Skin Log 写真比較（直近2件）');
  console.log(line('='));

  if (withPhoto.length === 0) {
    console.log('\n写真付きの記録がありません。');
    return;
  }

  console.log(
    '\n画像解析は行いません。以下の2つのファイルを開いて見比べてください。\n',
  );
  for (const log of withPhoto.slice(0, 2)) {
    console.log(`  ${log.date}: ${log.record.photoPath}`);
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
    case 'compare':
      await runCompare();
      break;
    default:
      console.log('使い方: pnpm run skin -- <add|list|compare>');
      process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error('エラーが発生しました:', error);
  process.exitCode = 1;
});
