/**
 * FinanceLog（Version25、Life Log Phase 2）
 *
 * 収入・支出を取引単位で記録する原台帳。既存の`Reflection.expenseYen`
 * （日次要約）とは役割が異なる——`Reflection`側は変更・移行・削除
 * しない（ADR 0052参照）。
 *
 * 秘密情報（カード番号・口座番号・認証情報）の保存禁止は、コードでの
 * 自動検出は行わない（誤検知リスクの方が高く、範囲外）——MCP Tool
 * descriptionと運用文書で明記する運用上の制約とする。
 */

export type FinanceLogType = 'Income' | 'Expense';

export interface FinanceLogRecord {
  readonly occurredAt: string; // ISO8601
  readonly type: FinanceLogType;
  readonly amount: number;
  readonly currency?: string; // 省略時create()で'JPY'を補完
  readonly category?: string;
  readonly paymentMethod?: string;
  readonly merchantOrSource?: string;
  readonly notes?: string;
  readonly idempotencyKey?: string;
  readonly correctionOfId?: string;
  readonly correctionReason?: string;
}

export class FinanceLog {
  private constructor(
    private readonly _id: string,
    private readonly _record: FinanceLogRecord,
    private readonly _createdAt: Date,
  ) {}

  static create(params: { id: string; record: FinanceLogRecord; createdAt?: Date }): FinanceLog {
    if (Number.isNaN(Date.parse(params.record.occurredAt))) {
      throw new Error('occurredAt must be a valid ISO8601 date');
    }
    if (!(params.record.amount > 0)) {
      throw new Error('amount must be positive');
    }
    validateCorrectionMetadata(params.record);
    const record: FinanceLogRecord = {
      ...params.record,
      currency: params.record.currency ?? 'JPY',
    };
    return new FinanceLog(params.id, record, params.createdAt ?? new Date());
  }

  static restore(params: { id: string; record: FinanceLogRecord; createdAt: Date }): FinanceLog {
    return new FinanceLog(params.id, params.record, params.createdAt);
  }

  get id(): string {
    return this._id;
  }

  get record(): FinanceLogRecord {
    return this._record;
  }

  get createdAt(): Date {
    return this._createdAt;
  }
}

function validateCorrectionMetadata(record: FinanceLogRecord): void {
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
