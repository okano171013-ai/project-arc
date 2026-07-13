import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import type { TaskProvider } from '../../application/ports/TaskProvider.js';
import type { TaskItem } from '../../domain/value-objects/TaskItem.js';

/**
 * GoogleTaskProvider
 *
 * デフォルトのタスクリスト（`@default`）のみを対象とする
 * （Version3のCTO判断。複数リスト対応はVersion4以降で検討）。
 */
export class GoogleTaskProvider implements TaskProvider {
  constructor(private readonly authClient: OAuth2Client) {}

  async getTodayTasks(): Promise<TaskItem[]> {
    const tasks = google.tasks({ version: 'v1', auth: this.authClient });

    const res = await tasks.tasks.list({
      tasklist: '@default',
      showCompleted: false,
      maxResults: 20,
    });

    const items = res.data.items ?? [];
    return items.map((task) => ({
      title: task.title ?? '（タイトルなし）',
      completed: task.status === 'completed',
    }));
  }
}
