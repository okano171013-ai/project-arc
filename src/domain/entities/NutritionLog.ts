/**
 * NutritionLog（Version25、Life Log Phase 2）
 *
 * `MealLog`に紐づく推定または実測の栄養値。`mealLogId`は軽量な参照
 * であり、存在検証はしない（`AgentMessage.tags`の`mf:<id>`規約と同じ、
 * ADR 0045踏襲——Systemは参照先の存在を判断しない）。
 *
 * 指示書要件「estimated、basis、confidenceまたはuncertaintyを必須化し、
 * 推定値を確定事実として扱わない」を`create()`で構造的に検証する。
 * 日次合計は保存しない——`SummarizeNutritionByDateUseCase`が原記録から
 * 都度再計算する（指示書「日次合計は原記録とは別の派生集計とし、
 * 再計算可能にする」）。
 */

export interface NutritionLogRecord {
  readonly mealLogId: string;
  readonly calories?: number;
  readonly proteinG?: number;
  readonly fatG?: number;
  readonly carbohydrateG?: number;
  readonly fiberG?: number;
  readonly saltG?: number;
  readonly estimated: boolean;
  readonly basis: string;
  readonly confidence?: 'low' | 'medium' | 'high';
  readonly uncertaintyNote?: string;
  readonly idempotencyKey?: string;
}

export class NutritionLog {
  private constructor(
    private readonly _id: string,
    private readonly _record: NutritionLogRecord,
    private readonly _createdAt: Date,
  ) {}

  static create(params: { id: string; record: NutritionLogRecord; createdAt?: Date }): NutritionLog {
    if (params.record.mealLogId.trim().length === 0) {
      throw new Error('mealLogId must not be empty');
    }
    if (params.record.basis.trim().length === 0) {
      throw new Error('basis must not be empty');
    }
    if (!params.record.confidence && !params.record.uncertaintyNote) {
      throw new Error('either confidence or uncertaintyNote must be provided');
    }
    return new NutritionLog(params.id, params.record, params.createdAt ?? new Date());
  }

  static restore(params: { id: string; record: NutritionLogRecord; createdAt: Date }): NutritionLog {
    return new NutritionLog(params.id, params.record, params.createdAt);
  }

  get id(): string {
    return this._id;
  }

  get record(): NutritionLogRecord {
    return this._record;
  }

  get createdAt(): Date {
    return this._createdAt;
  }
}
