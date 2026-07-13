#!/usr/bin/env node
/**
 * pnpm decision -- "<質問>" / pnpm decision（引数なしなら対話式で質問を聞く）
 * Decision Support（Version12）
 *
 * 質問文から選択肢を機械的に導き、External Brainの根拠と比較材料を
 * 整理して提示する。System自身は判断・優先順位付けを行わない
 * （ADR 0023）。「【ARC】この知識を踏まえると...」に相当する解釈・
 * 提案はこのCLIの出力には含まれない——DecisionContextをOwnerが
 * ARCとの会話に貼り付けて使う想定。
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout, argv } from 'node:process';
import { DecisionEngineUseCase } from '../../application/use-cases/decision-support/DecisionEngine.js';
import { JsonFileExternalSourceRepository } from '../../adapters/repositories/JsonFileExternalSourceRepository.js';
import { JsonFileExternalKnowledgeRepository } from '../../adapters/repositories/JsonFileExternalKnowledgeRepository.js';
import type { DecisionContext } from '../../domain/value-objects/DecisionContext.js';

function line(char = '─', length = 44): string {
  return char.repeat(length);
}

function positionalArgs(): string[] {
  return argv.slice(2).filter((a) => a !== '--' && !a.startsWith('--'));
}

function printDecisionContext(context: DecisionContext): void {
  console.log('');
  console.log(line('='));
  console.log(`  Decision Support: 「${context.question}」`);
  console.log(line('='));

  console.log(`\n選択肢（${context.candidates.length}件、優先順位なし）:`);
  for (const c of context.candidates) console.log(`  - ${c}`);

  for (const comparison of context.comparisons) {
    console.log(`\n${line('-')}`);
    console.log(`■ ${comparison.candidate}`);
    console.log(line('-'));
    console.log(`  根拠: ${comparison.evidence.length}件`);
    if (comparison.merits.length > 0) {
      console.log('  メリット:');
      comparison.merits.forEach((m) => console.log(`    + ${m}`));
    }
    if (comparison.demerits.length > 0) {
      console.log('  デメリット:');
      comparison.demerits.forEach((d) => console.log(`    - ${d}`));
    }
    if (comparison.missingInfo.length > 0) {
      console.log('  不足情報:');
      comparison.missingInfo.forEach((m) => console.log(`    ? ${m}`));
    }
  }

  if (context.missingInformation.length > 0) {
    console.log(`\n${line('-')}`);
    console.log('  不足している情報（全体）');
    console.log(line('-'));
    context.missingInformation.forEach((m) => console.log(`  ・${m}`));
  }

  console.log(`\n${line('-')}`);
  console.log('  Ownerが判断すべき点');
  console.log(line('-'));
  context.pointsForOwnerToDecide.forEach((p) => console.log(`  ・${p}`));
  console.log('');
}

async function main(): Promise<void> {
  let question = positionalArgs().join(' ');

  if (!question) {
    const rl = createInterface({ input: stdin, output: stdout });
    try {
      question = await rl.question('質問: ');
    } finally {
      rl.close();
    }
  }

  if (!question.trim()) {
    console.log('質問が入力されませんでした。');
    process.exitCode = 1;
    return;
  }

  const useCase = new DecisionEngineUseCase(
    new JsonFileExternalKnowledgeRepository(),
    new JsonFileExternalSourceRepository(),
  );
  const { decisionContext } = await useCase.execute({ question });
  printDecisionContext(decisionContext);
}

main().catch((error: unknown) => {
  console.error('エラーが発生しました:', error);
  process.exitCode = 1;
});
