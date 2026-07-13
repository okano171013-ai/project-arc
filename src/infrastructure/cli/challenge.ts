#!/usr/bin/env node
/**
 * pnpm challenge -- add|list — Challenge Log（Version5）
 *
 * 人生で初めて挑戦したこと（初めて食べたもの・体験）を記録する。
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout, argv } from 'node:process';
import { AddChallengeLogUseCase } from '../../application/use-cases/challenge/AddChallengeLog.js';
import { ListChallengeLogsUseCase } from '../../application/use-cases/challenge/ListChallengeLogs.js';
import { JsonFileChallengeLogRepository } from '../../adapters/repositories/JsonFileChallengeLogRepository.js';

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
    console.log('\n=== Challenge Logを追加 ===');
    const dateRaw = await rl.question(`日付 (YYYY-MM-DD, Enterで今日=${today()}): `);
    const date = dateRaw || today();
    const title = await rl.question('初めて挑戦したこと (例: 赤福): ');
    if (!title.trim()) {
      console.log('内容は必須です。中止しました。');
      return;
    }
    const category = await rl.question('カテゴリ (例: 食べ物 / 体験, 任意): ');
    const note = await rl.question('メモ (任意): ');

    const repository = new JsonFileChallengeLogRepository();
    const useCase = new AddChallengeLogUseCase(repository);
    await useCase.execute({
      record: {
        date,
        title,
        category: category || undefined,
        note: note || undefined,
      },
    });

    console.log(`\n記録しました（${date}）: ${title}`);
  } finally {
    rl.close();
  }
}

async function runList(): Promise<void> {
  const repository = new JsonFileChallengeLogRepository();
  const useCase = new ListChallengeLogsUseCase(repository);
  const { logs } = await useCase.execute();

  console.log('');
  console.log(line('='));
  console.log('  Challenge Log');
  console.log(line('='));

  if (logs.length === 0) {
    console.log('\n記録がありません。`pnpm challenge -- add` で追加できます。');
    return;
  }

  for (const log of logs) {
    const categorySuffix = log.record.category ? `  [${log.record.category}]` : '';
    console.log(`\n■ ${log.date}${categorySuffix} ${log.title}`);
    if (log.record.note) console.log(`  メモ: ${log.record.note}`);
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
      console.log('使い方: pnpm run challenge -- <add|list>');
      process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error('エラーが発生しました:', error);
  process.exitCode = 1;
});
