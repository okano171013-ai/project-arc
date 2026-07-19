#!/usr/bin/env node
/**
 * pnpm reflect — 今日の振り返りを記録する最小CLI（Version1）
 *
 * Version1のゴールは「動く仕組み」の実証であり、UXの作り込みは
 * Version6（毎日の振り返り機能拡張）で行う（docs/roadmap.md）。
 * 現時点ではSupabase接続なしでも試せるよう、InMemory実装を既定とする。
 * 実DBに繋ぐ場合は --db=supabase または --db=notion を指定する。
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout, argv } from 'node:process';
import { RecordDailyReflectionUseCase } from '../../application/use-cases/reflection/RecordDailyReflection.js';
import { InMemoryReflectionRepository } from '../../adapters/repositories/InMemoryReflectionRepository.js';
import type { ReflectionRepository } from '../../application/ports/ReflectionRepository.js';

async function resolveRepository(): Promise<ReflectionRepository> {
  if (argv.includes('--db=supabase')) {
    const { createClient } = await import('@supabase/supabase-js');
    const { loadSupabaseEnv } = await import('../config/env.js');
    const { SupabaseReflectionRepository } = await import(
      '../../adapters/repositories/SupabaseReflectionRepository.js'
    );

    const env = loadSupabaseEnv();
    const client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

    // ADR 0003: RLSが owner_id = auth.uid() を要求するため、
    // 匿名キーだけでなく認証済みセッションを確立してから使う。
    const { error: signInError } = await client.auth.signInWithPassword({
      email: env.SUPABASE_OWNER_EMAIL,
      password: env.SUPABASE_OWNER_PASSWORD,
    });
    if (signInError) {
      throw new Error(`Supabaseへのサインインに失敗しました: ${signInError.message}`);
    }

    return new SupabaseReflectionRepository(client);
  }

  if (argv.includes('--db=notion')) {
    const { Client } = await import('@notionhq/client');
    const { loadNotionEnv } = await import('../config/env.js');
    const { NotionReflectionRepository } = await import(
      '../../adapters/repositories/NotionReflectionRepository.js'
    );

    const env = loadNotionEnv();
    const client = new Client({ auth: env.NOTION_API_KEY });
    return new NotionReflectionRepository(client, env.NOTION_DATABASE_ID);
  }

  return new InMemoryReflectionRepository();
}

function today(): string {
  // toISOString()はUTC基準のため、日本時間では日付が1日ズレることがある。
  // ローカルタイムゾーンの年月日をそのまま組み立てる。
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function main(): Promise<void> {
  const rl = createInterface({ input: stdin, output: stdout });

  try {
    const date = today();
    console.log(`\n=== Project ARC: Daily Reflection (${date}) ===\n`);

    const sleepHoursRaw = await rl.question('睡眠時間 (h, 未記入可): ');
    const studyMinutesRaw = await rl.question('勉強時間 (分, 未記入可): ');
    const martialArtsRaw = await rl.question('少林寺拳法に行った? (y/n): ');
    const englishRaw = await rl.question('英会話レッスンを受けた? (y/n): ');
    const notes = await rl.question('今日の出来事 (任意): ');
    const tomorrowsGoal = await rl.question('明日の目標 (任意): ');

    const repository = await resolveRepository();
    const useCase = new RecordDailyReflectionUseCase(repository);

    const result = await useCase.execute({
      date,
      record: {
        sleepHours: sleepHoursRaw ? Number(sleepHoursRaw) : undefined,
        studyMinutes: studyMinutesRaw ? Number(studyMinutesRaw) : undefined,
        didMartialArts: martialArtsRaw.trim().toLowerCase() === 'y',
        didEnglishLesson: englishRaw.trim().toLowerCase() === 'y',
        notes: notes || undefined,
        tomorrowsGoal: tomorrowsGoal || undefined,
      },
    });

    console.log('\n記録しました。');
    console.log(
      result.hasMinimumRoutine
        ? '✓ 今日は最低限のルーティン（学習 or 武道）を実施済みです。'
        : '△ 今日は学習・武道の記録がありません（判断は自分で行ってください）。',
    );
  } finally {
    rl.close();
  }
}

main().catch((error: unknown) => {
  console.error('エラーが発生しました:', error);
  process.exitCode = 1;
});
