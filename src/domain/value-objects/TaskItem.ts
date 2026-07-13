/**
 * TaskItem（Google Tasksのタスク）
 *
 * CalendarEventと同様、外部APIのレスポンス形式に依存しない
 * Project ARC内部の表現。
 */
export interface TaskItem {
  readonly title: string;
  readonly completed: boolean;
}
