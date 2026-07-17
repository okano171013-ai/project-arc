/**
 * MealLog（Version25、Life Log Phase 2）
 *
 * 食事単位の記録。`ChallengeLog`と同じ「シンプルなrecord +
 * create()バリデーション」パターンを踏襲する。写真は実体（ファイル）
 * と参照（`photoPath`）を分離して設計する——実体の保存は
 * `src/infrastructure/storage/photoStore.ts`の`savePhoto()`が担い、
 * このEntityは保存済みパスの文字列だけを持つ（Version14の
 * `AppearanceLog.photoPath`と同じ設計）。
 */

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other';

export interface MealLogRecord {
  readonly occurredAt: string; // ISO8601（食事は1日複数回あるためdate単位ではなくdatetime）
  readonly mealType?: MealType;
  readonly items: string[];
  readonly portion?: string; // 「amountまたはportion」
  readonly source?: string; // 入力経路の自由記述（例：'chatgpt-text'）
  readonly notes?: string;
  readonly photoPath?: string;
  readonly idempotencyKey?: string;
  /** Owner本人の発言と推定を区別する（Reflection/ChallengeLogと同じ設計、Version24）。 */
  readonly estimated?: boolean;
  readonly estimationBasis?: string;
  readonly confidence?: 'low' | 'medium' | 'high';
}

export class MealLog {
  private constructor(
    private readonly _id: string,
    private readonly _record: MealLogRecord,
    private readonly _createdAt: Date,
  ) {}

  static create(params: { id: string; record: MealLogRecord; createdAt?: Date }): MealLog {
    if (Number.isNaN(Date.parse(params.record.occurredAt))) {
      throw new Error('occurredAt must be a valid ISO8601 date');
    }
    if (params.record.items.length === 0) {
      throw new Error('items must not be empty');
    }
    return new MealLog(params.id, params.record, params.createdAt ?? new Date());
  }

  static restore(params: { id: string; record: MealLogRecord; createdAt: Date }): MealLog {
    return new MealLog(params.id, params.record, params.createdAt);
  }

  get id(): string {
    return this._id;
  }

  get record(): MealLogRecord {
    return this._record;
  }

  get createdAt(): Date {
    return this._createdAt;
  }
}
