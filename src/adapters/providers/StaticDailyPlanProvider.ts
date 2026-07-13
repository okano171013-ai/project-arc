import type { DailyPlanProvider } from '../../application/ports/DailyPlanProvider.js';
import type { DailyPlan } from '../../domain/value-objects/DailyPlan.js';

/**
 * StaticDailyPlanProvider
 *
 * Version2ではGoogle Calendar/Tasks連携がまだないため、ダミーデータを
 * 返す（docs/roadmap.md, ADR未作成 — Version3で本格差し替え予定）。
 *
 * 曜日固定の予定（少林寺拳法：火・金・日）だけは、ダミーとはいえ
 * 実際の固定スケジュールと矛盾しないよう反映している。それ以外の
 * 学習フォーカス等は汎用的なプレースホルダーであり、実データでは
 * ない点に注意。
 */
export class StaticDailyPlanProvider implements DailyPlanProvider {
  async getTodayPlan(date: string): Promise<DailyPlan> {
    const dayIndex = new Date(`${date}T00:00:00`).getDay(); // 0=Sun ... 6=Sat
    const isMartialArtsDay = [0, 2, 5].includes(dayIndex); // 日・火・金

    const schedule: string[] = [];
    if (isMartialArtsDay) {
      schedule.push('少林寺拳法の稽古（夜）');
    }
    schedule.push('（ダミー）Google Calendar連携はVersion3で追加予定');

    const todos: string[] = ['（ダミー）今日のタスクはまだGoogle Tasksと連携していません'];

    const focus: string[] = [
      '予備試験科目の学習を1コマ進める',
      isMartialArtsDay ? '少林寺拳法の稽古に集中する' : '昨日の学習の復習を10分行う',
      '今日の支出を意識する',
    ];

    const message = isMartialArtsDay
      ? '今日は稽古がある日です。無理のない範囲で学習時間を確保しましょう。'
      : '今日も昨日の記録を踏まえて、無理のない一日を。';

    return { schedule, todos, focus, message };
  }
}
