import { describe, it, expect } from 'vitest';
import { GoogleDailyPlanProvider } from './GoogleDailyPlanProvider.js';
import type { CalendarProvider } from '../../application/ports/CalendarProvider.js';
import type { TaskProvider } from '../../application/ports/TaskProvider.js';
import type { CalendarEvent } from '../../domain/value-objects/CalendarEvent.js';
import type { TaskItem } from '../../domain/value-objects/TaskItem.js';

class FakeCalendarProvider implements CalendarProvider {
  constructor(private readonly events: CalendarEvent[]) {}
  async getEventsForDate(): Promise<CalendarEvent[]> {
    return this.events;
  }
}

class FakeTaskProvider implements TaskProvider {
  constructor(private readonly tasks: TaskItem[]) {}
  async getTodayTasks(): Promise<TaskItem[]> {
    return this.tasks;
  }
}

describe('GoogleDailyPlanProvider', () => {
  it('formats timed and all-day events, and includes tasks', async () => {
    const provider = new GoogleDailyPlanProvider(
      new FakeCalendarProvider([
        { title: '会議', startTime: '2026-07-10T09:00:00+09:00', allDay: false },
        { title: '誕生日', allDay: true },
      ]),
      new FakeTaskProvider([{ title: 'レポート提出', completed: false }]),
    );

    const plan = await provider.getTodayPlan('2026-07-10');

    expect(plan.schedule).toHaveLength(2);
    expect(plan.schedule[1]).toBe('終日: 誕生日');
    expect(plan.todos).toEqual(['レポート提出']);
    expect(plan.focus).toHaveLength(3);
    expect(plan.message).toContain('2件');
  });

  it('falls back to friendly placeholder text when there are no events or tasks', async () => {
    const provider = new GoogleDailyPlanProvider(
      new FakeCalendarProvider([]),
      new FakeTaskProvider([]),
    );

    const plan = await provider.getTodayPlan('2026-07-11'); // 土曜日（武道の日ではない）

    expect(plan.schedule).toEqual(['今日の予定はありません']);
    expect(plan.todos).toEqual(['Google Tasksに未完了のタスクはありません']);
    expect(plan.focus).toHaveLength(3);
  });

  it('includes a martial-arts focus item on fixed weekly days (Tue/Fri/Sun)', async () => {
    const provider = new GoogleDailyPlanProvider(
      new FakeCalendarProvider([]),
      new FakeTaskProvider([]),
    );

    const plan = await provider.getTodayPlan('2026-07-10'); // 金曜日

    expect(plan.focus).toContain('少林寺拳法の稽古に集中する');
  });
});
