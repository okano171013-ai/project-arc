#!/usr/bin/env node
/**
 * pnpm evaluation -- add|list — Third Person Evaluation（Version9）
 *
 * 他者からの評価・コメント（「いとこにガタイ良くなったと言われた」等）
 * を構造化して記録する。Appearance Log（Owner自身の月次総合評価）
 * とは主体が異なるため別Entity（ADR 0011）。
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout, argv } from 'node:process';
import { AddThirdPersonEvaluationUseCase } from '../../application/use-cases/evaluation/AddThirdPersonEvaluation.js';
import { ListThirdPersonEvaluationsUseCase } from '../../application/use-cases/evaluation/ListThirdPersonEvaluations.js';
import { JsonFileThirdPersonEvaluationRepository } from '../../adapters/repositories/JsonFileThirdPersonEvaluationRepository.js';

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
    console.log('\n=== Third Person Evaluationを追加 ===');
    const dateRaw = await rl.question(`日付 (YYYY-MM-DD, Enterで今日=${today()}): `);
    const date = dateRaw || today();
    const person = await rl.question('誰から (例: いとこ): ');
    if (!person.trim()) {
      console.log('「誰から」は必須です。中止しました。');
      return;
    }
    const evaluation = await rl.question('何を言われたか (例: ガタイ良くなった): ');
    if (!evaluation.trim()) {
      console.log('内容は必須です。中止しました。');
      return;
    }
    const category = await rl.question('カテゴリ (例: 体格 / 肌 / 服装 / 雰囲気, 任意): ');

    const repository = new JsonFileThirdPersonEvaluationRepository();
    const useCase = new AddThirdPersonEvaluationUseCase(repository);
    await useCase.execute({
      record: { date, person, evaluation, category: category || undefined },
    });

    console.log(`\n記録しました（${date}）: ${person} 「${evaluation}」`);
  } finally {
    rl.close();
  }
}

async function runList(): Promise<void> {
  const repository = new JsonFileThirdPersonEvaluationRepository();
  const useCase = new ListThirdPersonEvaluationsUseCase(repository);
  const { evaluations } = await useCase.execute();

  console.log('');
  console.log(line('='));
  console.log('  Third Person Evaluation');
  console.log(line('='));

  if (evaluations.length === 0) {
    console.log('\n記録がありません。`pnpm evaluation -- add` で追加できます。');
    return;
  }

  for (const e of evaluations) {
    const categorySuffix = e.record.category ? `  [${e.record.category}]` : '';
    console.log(`\n■ ${e.date}${categorySuffix} ${e.record.person}: 「${e.record.evaluation}」`);
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
      console.log('使い方: pnpm run evaluation -- <add|list>');
      process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error('エラーが発生しました:', error);
  process.exitCode = 1;
});
