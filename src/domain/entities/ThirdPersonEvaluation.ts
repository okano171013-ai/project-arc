/**
 * ThirdPersonEvaluation（第三者評価）
 *
 * Version9で新設。「いとこにガタイ良くなったと言われた」のような
 * 他者からの評価・コメントを構造化して記録する。Version6の
 * Smart Captureブリーフで例示されて以来、Version6〜8で未解決の
 * まま持ち越されていた項目（ADR 0011参照）。Appearance Logの
 * `comment`欄（Owner自身の月次総合評価）とは主体が異なるため、
 * 意図的に別Entityとした。
 */

export interface ThirdPersonEvaluationRecord {
  readonly date: string; // YYYY-MM-DD
  readonly person: string; // 誰から（例: 「いとこ」）
  readonly evaluation: string; // 何を言われたか（例: 「ガタイ良くなった」）
  readonly category?: string; // 例: 体格 / 肌 / 服装 / 雰囲気 / その他
}

export class ThirdPersonEvaluation {
  private constructor(
    private readonly _id: string,
    private readonly _record: ThirdPersonEvaluationRecord,
    private readonly _createdAt: Date,
  ) {}

  static create(params: {
    id: string;
    record: ThirdPersonEvaluationRecord;
    createdAt?: Date;
  }): ThirdPersonEvaluation {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(params.record.date)) {
      throw new Error(`Invalid date format: ${params.record.date}. Expected YYYY-MM-DD.`);
    }
    if (params.record.person.trim().length === 0) {
      throw new Error('person must not be empty');
    }
    if (params.record.evaluation.trim().length === 0) {
      throw new Error('evaluation must not be empty');
    }
    return new ThirdPersonEvaluation(params.id, params.record, params.createdAt ?? new Date());
  }

  get id(): string {
    return this._id;
  }

  get record(): ThirdPersonEvaluationRecord {
    return this._record;
  }

  get date(): string {
    return this._record.date;
  }

  get createdAt(): Date {
    return this._createdAt;
  }
}
