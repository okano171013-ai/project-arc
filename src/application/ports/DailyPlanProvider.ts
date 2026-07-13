import type { DailyPlan } from '../../domain/value-objects/DailyPlan.js';

/**
 * DailyPlanProvider（ポート）
 *
 * Version2では StaticDailyPlanProvider（ダミーデータ）のみ実装する。
 * Version3でGoogle Calendar/Tasks連携の実装に差し替える想定
 * （docs/roadmap.md参照）。ReflectionRepositoryと同様、
 * Application層はこのインターフェースにのみ依存する。
 */
export interface DailyPlanProvider {
  getTodayPlan(date: string): Promise<DailyPlan>;
}
