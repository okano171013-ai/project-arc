/**
 * CheckIn（Version26、行動介入レイヤー）
 *
 * 「原則2時間ごと」の行動確認を1件ずつ記録する。前回の目標が未達
 * だった場合、`missedReason`/`correctiveAction`/`resumeAt`の3点を
 * 型レベルで必須化する——指示書「予定未達時は、言い訳を慰めず、
 * 原因・修正行動・再開時刻を短く明示」を、ARCの対話品質ではなく
 * データ構造として強制する。
 */

export type CheckInGoalStatus = 'achieved' | 'partial' | 'missed';

export interface CheckInRecord {
  readonly occurredAt: string; // ISO8601
  readonly currentActivity: string;
  /** 今日の最優先課題と一致しているか（Owner本人またはARCの申告、Systemは判定しない）。 */
  readonly alignedWithTopPriority?: boolean;
  readonly nextTwoHourGoal: string;
  /** 前回チェックインで立てた目標の結果。 */
  readonly previousGoalStatus?: CheckInGoalStatus;
  /** previousGoalStatusが'partial'|'missed'のとき必須。 */
  readonly missedReason?: string;
  readonly correctiveAction?: string;
  readonly resumeAt?: string; // ISO8601
  readonly notes?: string;
  readonly idempotencyKey?: string;
  readonly estimated?: boolean;
  readonly estimationBasis?: string;
  readonly confidence?: 'low' | 'medium' | 'high';
}

export class CheckIn {
  private constructor(
    private readonly _id: string,
    private readonly _record: CheckInRecord,
    private readonly _createdAt: Date,
  ) {}

  static create(params: { id: string; record: CheckInRecord; createdAt?: Date }): CheckIn {
    if (Number.isNaN(Date.parse(params.record.occurredAt))) {
      throw new Error('occurredAt must be a valid ISO8601 date');
    }
    if (params.record.currentActivity.trim().length === 0) {
      throw new Error('currentActivity must not be empty');
    }
    if (params.record.nextTwoHourGoal.trim().length === 0) {
      throw new Error('nextTwoHourGoal must not be empty');
    }
    if (params.record.previousGoalStatus === 'partial' || params.record.previousGoalStatus === 'missed') {
      if (!params.record.missedReason?.trim() || !params.record.correctiveAction?.trim()) {
        throw new Error('missedReason and correctiveAction are required when previousGoalStatus is partial or missed');
      }
      if (!params.record.resumeAt || Number.isNaN(Date.parse(params.record.resumeAt))) {
        throw new Error('resumeAt must be a valid ISO8601 date when previousGoalStatus is partial or missed');
      }
    }
    return new CheckIn(params.id, params.record, params.createdAt ?? new Date());
  }

  static restore(params: { id: string; record: CheckInRecord; createdAt: Date }): CheckIn {
    return new CheckIn(params.id, params.record, params.createdAt);
  }

  get id(): string {
    return this._id;
  }

  get record(): CheckInRecord {
    return this._record;
  }

  get createdAt(): Date {
    return this._createdAt;
  }
}
