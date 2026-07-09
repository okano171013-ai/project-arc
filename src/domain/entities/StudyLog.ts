/**
 * StudyLog（学習記録）
 *
 * 予備試験・司法試験に向けた科目別の学習時間・復習状況を記録する。
 * Version5（司法試験管理）で本格活用するが、EntityはVersion1で
 * 先に定義しておく（docs/roadmap.md参照）。
 */

export type StudySubject =
  | 'constitutional-law'
  | 'civil-law'
  | 'criminal-law'
  | 'civil-procedure'
  | 'criminal-procedure'
  | 'commercial-law'
  | 'administrative-law'
  | 'other';

export interface StudyLogRecord {
  readonly subject: StudySubject;
  readonly minutes: number;
  readonly topic?: string;
  /** 苦手分野かどうかは事実ではなく評価なので、明示的にフラグとして扱う */
  readonly isWeakArea?: boolean;
  readonly needsReview?: boolean;
}

export class StudyLog {
  private constructor(
    private readonly _id: string,
    private readonly _date: string,
    private readonly _record: StudyLogRecord,
  ) {}

  static create(params: { id: string; date: string; record: StudyLogRecord }): StudyLog {
    if (params.record.minutes < 0) {
      throw new Error('minutes must be non-negative');
    }
    return new StudyLog(params.id, params.date, params.record);
  }

  get id(): string {
    return this._id;
  }

  get date(): string {
    return this._date;
  }

  get record(): StudyLogRecord {
    return this._record;
  }
}
