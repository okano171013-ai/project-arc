/**
 * DailyPlan（今日の予定・やること・フォーカス）
 *
 * Version2ではGoogle Calendar連携がまだないため、この内容は
 * ダミーデータの提供元（StaticDailyPlanProvider）から供給される。
 * Version3でGoogle Calendar/Tasks連携に差し替わる想定
 * （application/ports/DailyPlanProvider.ts参照）。
 *
 * 単なるデータ構造であり、ふるまいを持たないためvalue objectとして
 * interfaceで定義する（Entityほどの同一性管理は不要）。
 */
export interface DailyPlan {
  readonly schedule: string[];
  readonly todos: string[];
  /** 今日のフォーカス（3件）。Morning Briefで強調表示する。 */
  readonly focus: string[];
  readonly message: string;
}
