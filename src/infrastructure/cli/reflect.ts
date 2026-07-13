#!/usr/bin/env node
/**
 * pnpm reflect — 今日の振り返りを記録するCLI（Version2）
 *
 * 「ARCと一日を終える」ためのCLI。Version2でデフォルトの永続化先を
 * InMemoryからJSONファイルに変更した（ADR 0003）。
 * 実DBに繋ぐ場合は --db=supabase を指定する（要Supabase CLIセットアップ）。
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout, argv } from 'node:process';
import { RecordDailyReflectionUseCase } from '../../application/use-cases/reflection/RecordDailyReflection.js';
import { UpdateDailyReflectionUseCase } from '../../application/use-cases/reflection/UpdateDailyReflection.js';
import { JsonFileReflectionRepository } from '../../adapters/repositories/JsonFileReflectionRepository.js';
import type { ReflectionRepository } from '../../application/ports/ReflectionRepository.js';
import type { Mood, ReflectionRecord } from '../../domain/entities/Reflection.js';

async function resolveRepository(): Promise<ReflectionRepository> {
  const useSupabase = argv.includes('--db=supabase');
  if (!useSupabase) {
    return new JsonFileReflectionRepository();
  }

  const { createClient } = await import('@supabase/supabase-js');
  const { loadEnv } = await import('../config/env.js');
  const { SupabaseReflectionRepository } = await import(
    '../../adapters/repositories/SupabaseReflectionRepository.js'
  );

  const env = loadEnv();
  if (!env.SUPABASE_ANON_KEY) {
    throw new Error(
      'SUPABASE_ANON_KEY が設定されていません。--db=supabase を使う場合は .env に設定してください。',
    );
  }
  const client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  return new SupabaseReflectionRepository(client);
}

function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function parseYesNo(input: string): boolean {
  return input.trim().toLowerCase() === 'y';
}

function parseMood(input: string): Mood | undefined {
  const map: Record<string, Mood> = {
    '1': 'great',
    '2': 'good',
    '3': 'neutral',
    '4': 'low',
    '5': 'bad',
  };
  return map[input.trim()];
}

function line(char = '─', length = 44): string {
  return char.repeat(length);
}

async function main(): Promise<void> {
  const rl = createInterface({ input: stdin, output: stdout });

  try {
    const date = today();
    console.log('');
    console.log(line('='));
    console.log(`  Project ARC — Evening Reflection (${date})`);
    console.log(line('='));

    const proudOf = await rl.question('\n今日頑張ったこと (任意): ');
    const didAttendClassRaw = await rl.question('授業/塾講師に行った? (y/n): ');
    const planAchievedRaw = await rl.question('今日の予定は達成できた? (y/n): ');
    const studyMinutesRaw = await rl.question('勉強時間 (分, 未記入可): ');
    const expenseYenRaw = await rl.question('今日の支出 (円, 未記入可): ');
    const sleepHoursRaw = await rl.question('睡眠時間 (h, 未記入可): ');
    console.log('気分: 1=great 2=good 3=neutral 4=low 5=bad');
    const moodRaw = await rl.question('気分を選んでください (1-5, 未記入可): ');
    const tomorrowsGoal = await rl.question('明日の目標 (任意): ');

    const repository = await resolveRepository();
    const existing = await repository.findByDate(date);
    if (existing) {
      console.log('\n（今日はすでに記録済みです。内容を上書きします）');
    }

    const record: ReflectionRecord = {
      proudOf: proudOf || undefined,
      didAttendClass: parseYesNo(didAttendClassRaw),
      planAchieved: parseYesNo(planAchievedRaw),
      studyMinutes: studyMinutesRaw ? Number(studyMinutesRaw) : undefined,
      expenseYen: expenseYenRaw ? Number(expenseYenRaw) : undefined,
      sleepHours: sleepHoursRaw ? Number(sleepHoursRaw) : undefined,
      mood: parseMood(moodRaw),
      tomorrowsGoal: tomorrowsGoal || undefined,
    };

    const result = existing
      ? await new UpdateDailyReflectionUseCase(repository).execute({ date, record })
      : await new RecordDailyReflectionUseCase(repository).execute({ date, record });

    console.log('\n' + line('-'));
    console.log(existing ? '上書きしました。' : '記録しました。');
    console.log(
      result.hasMinimumRoutine
        ? '✓ 今日は最低限のルーティン（学習 or 武道）を実施済みです。'
        : '△ 今日は学習・武道の記録がありません（判断は自分で行ってください）。',
    );
    console.log(`\n今日の点数: ${result.score} / 100`);
    if (result.previousScore !== undefined && result.scoreDelta !== undefined) {
      const sign = result.scoreDelta > 0 ? '+' : '';
      console.log(`  昨日: ${result.previousScore}点 → 今日: ${result.score}点 (${sign}${result.scoreDelta})`);
    } else {
      console.log('  （前日の記録がないため、比較はできません）');
    }
    console.log('（この点数は記録から機械的に算出した参考指標です。低い日が悪い日とは限りません）');
    console.log(line('-') + '\n');
  } finally {
    rl.close();
  }
}

main().catch((error: unknown) => {
  console.error('エラーが発生しました:', error);
  process.exitCode = 1;
});
