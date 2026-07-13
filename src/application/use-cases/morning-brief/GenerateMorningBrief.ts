import type { ReflectionRepository } from '../../ports/ReflectionRepository.js';
import type { DailyPlanProvider } from '../../ports/DailyPlanProvider.js';
import type { DailyPlan } from '../../../domain/value-objects/DailyPlan.js';

export interface GenerateMorningBriefInput {
  /** 今日の日付 (YYYY-MM-DD) */
  today: string;
  /** 昨日の日付 (YYYY-MM-DD) */
  yesterday: string;
}

export interface GenerateMorningBriefOutput {
  date: string;
  dayOfWeek: string;
  plan: DailyPlan;
  /** 前日の記録がなければ undefined（Principle 5: ない情報を推測で埋めない） */
  yesterdayStudyMinutes: number | undefined;
  yesterdayExpenseYen: number | undefined;
}

const DAY_OF_WEEK_JA = ['日', '月', '火', '水', '木', '金', '土'];

/**
 * GenerateMorningBriefUseCase
 *
 * 「今日の予定・やること・フォーカス」はDailyPlanProvider（Version2では
 * ダミーデータ）から取得し、「昨日の勉強時間・支出」はReflection
 * Repositoryの実データから取得する。両者は情報の性質が異なるため
 * 明確に分離する（ダミー vs 実データ）。
 */
export class GenerateMorningBriefUseCase {
  constructor(
    private readonly reflectionRepository: ReflectionRepository,
    private readonly dailyPlanProvider: DailyPlanProvider,
  ) {}

  async execute(input: GenerateMorningBriefInput): Promise<GenerateMorningBriefOutput> {
    const [plan, yesterdayReflection] = await Promise.all([
      this.dailyPlanProvider.getTodayPlan(input.today),
      this.reflectionRepository.findByDate(input.yesterday),
    ]);

    const dayIndex = new Date(`${input.today}T00:00:00`).getDay();

    return {
      date: input.today,
      dayOfWeek: DAY_OF_WEEK_JA[dayIndex] ?? '?',
      plan,
      yesterdayStudyMinutes: yesterdayReflection?.record.studyMinutes,
      yesterdayExpenseYen: yesterdayReflection?.record.expenseYen,
    };
  }
}
