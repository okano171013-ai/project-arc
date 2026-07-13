import type { TaskItem } from '../../domain/value-objects/TaskItem.js';

/**
 * TaskProvider（ポート）
 */
export interface TaskProvider {
  getTodayTasks(): Promise<TaskItem[]>;
}
