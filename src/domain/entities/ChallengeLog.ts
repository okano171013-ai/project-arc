/**
 * ChallengeLog（人生で初めて挑戦したことの記録）
 *
 * Version5で新設。「トマトを初めて食べた」「赤福を初めて食べた」
 * といった、人生経験としての「初めて」を記録する。
 */

export interface ChallengeLogRecord {
  readonly date: string; // YYYY-MM-DD
  readonly title: string; // 例: 「赤福」
  readonly category?: string; // 例: 食べ物 / 体験 / その他
  readonly note?: string;
}

export class ChallengeLog {
  private constructor(
    private readonly _id: string,
    private readonly _record: ChallengeLogRecord,
    private readonly _createdAt: Date,
  ) {}

  static create(params: {
    id: string;
    record: ChallengeLogRecord;
    createdAt?: Date;
  }): ChallengeLog {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(params.record.date)) {
      throw new Error(`Invalid date format: ${params.record.date}. Expected YYYY-MM-DD.`);
    }
    if (params.record.title.trim().length === 0) {
      throw new Error('title must not be empty');
    }
    return new ChallengeLog(params.id, params.record, params.createdAt ?? new Date());
  }

  get id(): string {
    return this._id;
  }

  get record(): ChallengeLogRecord {
    return this._record;
  }

  get date(): string {
    return this._record.date;
  }

  get title(): string {
    return this._record.title;
  }

  get createdAt(): Date {
    return this._createdAt;
  }
}
