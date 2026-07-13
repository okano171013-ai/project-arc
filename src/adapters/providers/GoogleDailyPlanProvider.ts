import type { DailyPlanProvider } from '../../application/ports/DailyPlanProvider.js';
import type { CalendarProvider } from '../../application/ports/CalendarProvider.js';
import type { TaskProvider } from '../../application/ports/TaskProvider.js';
import type { DailyPlan } from '../../domain/value-objects/DailyPlan.js';
import type { CalendarEvent } from '../../domain/value-objects/CalendarEvent.js';

/**
 * GoogleDailyPlanProvider
 *
 * Version2の StaticDailyPlanProvider と同じ DailyPlanProvider ポートを
 * 実装する。「UIは変更せず、データソースだけ差し替える」という
 * Version3の要件を満たすため、GenerateMorningBriefUseCase・
 * Morning Brief CLIの表示ロジックは一切変更していない
 * （Application層への影響ゼロ）。
 *
 * schedule / todos は実データ（Calendar / Tasks）、focus / message は
 * Version2同様の簡易ロジック（Decision Engineではない）で生成する。
 */
export class GoogleDailyPlanProvider implements DailyPlanProvider {
  constructor(
    private readonly calendarProvider: CalendarProvider,
    private readonly taskProvider: TaskProvider,
  ) {}

  async getTodayPlan(date: string): Promise<DailyPlan> {
    const [events, tasks] = await Promise.all([
      this.calendarProvider.getEventsForDate(date),
      this.taskProvider.getTodayTasks(),
    ]);

    const schedule = events.length > 0 ? events.map(formatEvent) : ['今日の予定はありません'];
    const todos =
      tasks.length > 0
        ? tasks.map((t) => t.title)
        : ['Google Tasksに未完了のタスクはありません'];

    const dayIndex = new Date(`${date}T00:00:00`).getDay();
    const isMartialArtsDay = [0, 2, 5].includes(dayIndex); // 日・火・金

    const focus: string[] = [];
    if (isMartialArtsDay) {
      focus.push('少林寺拳法の稽古に集中する');
    }
    if (tasks.length > 0 && tasks[0]) {
      focus.push(`「${tasks[0].title}」を終わらせる`);
    }
    focus.push('予備試験科目の学習を1コマ進める');
    while (focus.length < 3) {
      focus.push('今日の支出を意識する');
    }

    const message =
      events.length > 0
        ? `今日は${events.length}件の予定があります。無理のない範囲で進めましょう。`
        : '今日は予定に追われない日です。学習に時間を使いましょう。';

    return { schedule, todos, focus: focus.slice(0, 3), message };
  }
}

function formatEvent(event: CalendarEvent): string {
  if (event.allDay) {
    return `終日: ${event.title}`;
  }
  if (!event.startTime) {
    return event.title;
  }
  const time = new Date(event.startTime).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${time} ${event.title}`;
}
