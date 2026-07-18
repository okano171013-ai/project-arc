/**
 * WeightLog（Version25、Life Log Phase 2）
 *
 * 1計測1記録。同日複数計測を許容する——`Reflection`のような日付一意性
 * 制約は持たない（指示書要件）。日次代表値の生成は今回実装しない
 * （指示書は「作る場合は原計測を上書きしない」という条件付き要件で
 * あり、作らないことでこの制約を自明に満たす、Principle 9 YAGNI）。
 */

export interface WeightLogRecord {
  readonly measuredAt: string; // ISO8601 datetime
  readonly weightKg: number;
  readonly measurementContext?: string; // 例：「起床後」
  readonly source?: string;
  readonly notes?: string;
  readonly idempotencyKey?: string;
  readonly correctionOfId?: string;
  readonly correctionReason?: string;
}

export class WeightLog {
  private constructor(
    private readonly _id: string,
    private readonly _record: WeightLogRecord,
    private readonly _createdAt: Date,
  ) {}

  static create(params: { id: string; record: WeightLogRecord; createdAt?: Date }): WeightLog {
    if (Number.isNaN(Date.parse(params.record.measuredAt))) {
      throw new Error('measuredAt must be a valid ISO8601 date');
    }
    if (!(params.record.weightKg > 0)) {
      throw new Error('weightKg must be positive');
    }
    validateCorrectionMetadata(params.record);
    return new WeightLog(params.id, params.record, params.createdAt ?? new Date());
  }

  static restore(params: { id: string; record: WeightLogRecord; createdAt: Date }): WeightLog {
    return new WeightLog(params.id, params.record, params.createdAt);
  }

  get id(): string {
    return this._id;
  }

  get record(): WeightLogRecord {
    return this._record;
  }

  get createdAt(): Date {
    return this._createdAt;
  }
}

function validateCorrectionMetadata(record: WeightLogRecord): void {
  if ((record.correctionOfId === undefined) !== (record.correctionReason === undefined)) {
    throw new Error('correctionOfId and correctionReason must be provided together');
  }
  if (
    record.correctionOfId !== undefined &&
    (!record.correctionOfId.trim() || !record.correctionReason?.trim())
  ) {
    throw new Error('correction metadata must not be empty');
  }
}
