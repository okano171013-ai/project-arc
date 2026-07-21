/**
 * InProgressStudySession（Version40、Owner指示`ba6548bc-...`項目2）
 *
 * ChatGPT/Claude Codeとの対話から「今から勉強する」「終わった」を
 * 直接記録できるようにするための、開始済みだが未終了のセッション。
 * 完了時（`finish`）は既存の`StudySession`（Version27、外部タイマー
 * アプリからの一括投入と同じEntity）へ変換して確定保存する——
 * 「StudySessionを正本として集計する」という指示を、2つの別Entityを
 * 混在させず単一の正本へ収斂させることで満たす。
 */

export interface InProgressStudySessionRecord {
  readonly subject: string;
  readonly task?: string;
  readonly startedAt: string; // ISO8601
  readonly source: string;
}

export class InProgressStudySession {
  private constructor(
    private readonly _id: string,
    private _record: InProgressStudySessionRecord,
  ) {}

  static create(params: { id: string; record: InProgressStudySessionRecord }): InProgressStudySession {
    if (!params.record.subject?.trim()) throw new Error('subject is required');
    if (!params.record.source?.trim()) throw new Error('source is required');
    if (Number.isNaN(Date.parse(params.record.startedAt))) {
      throw new Error('startedAt must be a valid ISO8601 date');
    }
    return new InProgressStudySession(params.id, params.record);
  }

  static restore(params: { id: string; record: InProgressStudySessionRecord }): InProgressStudySession {
    return new InProgressStudySession(params.id, params.record);
  }

  get id(): string {
    return this._id;
  }

  get record(): InProgressStudySessionRecord {
    return this._record;
  }

  update(patch: { subject?: string; task?: string }): void {
    this._record = {
      ...this._record,
      ...(patch.subject !== undefined ? { subject: patch.subject } : {}),
      ...(patch.task !== undefined ? { task: patch.task } : {}),
    };
    if (!this._record.subject?.trim()) throw new Error('subject is required');
  }
}
