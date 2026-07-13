#!/usr/bin/env node
/**
 * pnpm morning — Morning Brief（Version2で新規実装、Version3でデータソース差し替え）
 *
 * 「ARCと一日を始める」ためのCLI。Version3でGoogle Calendar/Tasksに
 * 対応したが、UseCase・表示ロジックはVersion2から変更していない
 * （データソースの差し替えのみ、Version3要件通り）。
 */
import { GenerateMorningBriefUseCase } from '../../application/use-cases/morning-brief/GenerateMorningBrief.js';
import { JsonFileReflectionRepository } from '../../adapters/repositories/JsonFileReflectionRepository.js';
import { StaticDailyPlanProvider } from '../../adapters/providers/StaticDailyPlanProvider.js';
import type { DailyPlanProvider } from '../../application/ports/DailyPlanProvider.js';
import { loadEnv } from '../config/env.js';

function todayAndYesterday(): { today: string; yesterday: string } {
  const now = new Date();
  const fmt = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(now.getDate() - 1);

  return { today: fmt(now), yesterday: fmt(yesterdayDate) };
}

function line(char = '─', length = 44): string {
  return char.repeat(length);
}

/**
 * Google API未設定、またはAPI呼び出しに失敗した場合はダミーデータに
 * フォールバックする（CTO判断：オフライン時にCLIが使えなくなるのは
 * Version2までのUXを後退させるため）。
 */
async function resolveDailyPlanProvider(): Promise<DailyPlanProvider> {
  const env = loadEnv();
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    console.log(
      '（Google API未設定のためダミーデータを表示しています。' +
        'docs/setup/google-api-setup.md を参照してください）',
    );
    return new StaticDailyPlanProvider();
  }

  try {
    const { getAuthorizedClient } = await import('../google/googleAuthClient.js');
    const { GoogleCalendarProvider } = await import(
      '../../adapters/providers/GoogleCalendarProvider.js'
    );
    const { GoogleTaskProvider } = await import('../../adapters/providers/GoogleTaskProvider.js');
    const { GoogleDailyPlanProvider } = await import(
      '../../adapters/providers/GoogleDailyPlanProvider.js'
    );

    const authClient = await getAuthorizedClient();
    return new GoogleDailyPlanProvider(
      new GoogleCalendarProvider(authClient),
      new GoogleTaskProvider(authClient),
    );
  } catch (error) {
    console.log('（Google APIへの接続に失敗したため、ダミーデータを表示しています）');
    console.log(`  詳細: ${error instanceof Error ? error.message : String(error)}`);
    return new StaticDailyPlanProvider();
  }
}

async function main(): Promise<void> {
  const { today, yesterday } = todayAndYesterday();

  const reflectionRepository = new JsonFileReflectionRepository();
  const dailyPlanProvider = await resolveDailyPlanProvider();
  const useCase = new GenerateMorningBriefUseCase(reflectionRepository, dailyPlanProvider);

  const brief = await useCase.execute({ today, yesterday });

  console.log('');
  console.log(line('='));
  console.log(`  Project ARC — Morning Brief`);
  console.log(`  ${brief.date}（${brief.dayOfWeek}）`);
  console.log(line('='));

  console.log('\n■ 今日の予定');
  for (const s of brief.plan.schedule) {
    console.log(`  - ${s}`);
  }

  console.log('\n■ 今日やること');
  for (const t of brief.plan.todos) {
    console.log(`  - ${t}`);
  }

  console.log('\n■ 今日のフォーカス（3件）');
  brief.plan.focus.forEach((f, i) => {
    console.log(`  ${i + 1}. ${f}`);
  });

  console.log('\n' + line('-'));
  console.log('■ 昨日の記録');
  console.log(
    `  勉強時間: ${brief.yesterdayStudyMinutes !== undefined ? `${brief.yesterdayStudyMinutes}分` : '記録なし'}`,
  );
  console.log(
    `  支出    : ${brief.yesterdayExpenseYen !== undefined ? `${brief.yesterdayExpenseYen}円` : '記録なし'}`,
  );
  console.log(line('-'));

  console.log(`\n${brief.plan.message}`);
  console.log('');
}

main().catch((error: unknown) => {
  console.error('エラーが発生しました:', error);
  process.exitCode = 1;
});
