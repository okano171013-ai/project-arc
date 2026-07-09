/**
 * Task（タスク）
 *
 * Version2でGoogle Tasks連携が入る想定のEntity。Version1では
 * ローカルでのタスク管理のみに使う最小構造とする（Principle 9）。
 */

export type TaskStatus = 'todo' | 'in-progress' | 'done';

export class Task {
  private constructor(
    private readonly _id: string,
    private _title: string,
    private _status: TaskStatus,
    private readonly _dueDate?: string,
  ) {}

  static create(params: {
    id: string;
    title: string;
    status?: TaskStatus;
    dueDate?: string;
  }): Task {
    if (params.title.trim().length === 0) {
      throw new Error('title must not be empty');
    }
    return new Task(params.id, params.title, params.status ?? 'todo', params.dueDate);
  }

  get id(): string {
    return this._id;
  }

  get title(): string {
    return this._title;
  }

  get status(): TaskStatus {
    return this._status;
  }

  get dueDate(): string | undefined {
    return this._dueDate;
  }

  complete(): void {
    this._status = 'done';
  }
}
