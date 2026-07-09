/**
 * Reflection（日々の振り返り）
 *
 * Version1のドメインコア。docs/vision.md の Core Mission に基づき、
 * 「記録すること」自体が目的ではなく、後から意思決定の材料として
 * 参照できることを前提に設計する（docs/principles.md Principle 4）。
 *
 * このEntityは外部ライブラリ・DBに関する知識を一切持たない。
 */

export interface ReflectionRecord {
  readonly sleepHours?: number;
  readonly studyMinutes?: number;
  readonly didMartialArts: boolean;
  readonly didEnglishLesson: boolean;
  readonly mood?: Mood;
  readonly expenseYen?: number;
  readonly notes?: string;
  /** 事実と推測を分離する（Principle 5）。ここは事実の記述のみ。 */
  readonly todaysEvents?: string;
  readonly tomorrowsGoal?: string;
}

export type Mood = 'great' | 'good' | 'neutral' | 'low' | 'bad';

export class Reflection {
  private constructor(
    private readonly _id: string,
    private readonly _date: string, // YYYY-MM-DD (ローカルタイムの日付)
    private readonly _record: ReflectionRecord,
    private readonly _createdAt: Date,
  ) {}

  static create(params: {
    id: string;
    date: string;
    record: ReflectionRecord;
    createdAt?: Date;
  }): Reflection {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(params.date)) {
      throw new Error(`Invalid date format: ${params.date}. Expected YYYY-MM-DD.`);
    }
    return new Reflection(
      params.id,
      params.date,
      params.record,
      params.createdAt ?? new Date(),
    );
  }

  get id(): string {
    return this._id;
  }

  get date(): string {
    return this._date;
  }

  get record(): ReflectionRecord {
    return this._record;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  /**
   * 継続性チェック（Principle 3）に使える簡易指標。
   * 意思決定はここで行わない —— あくまで事実の算出のみ。
   * 「今日は何をすべきか」の判断はARC（アプリケーション外）に委ねる。
   */
  hasMinimumRoutine(): boolean {
    return this._record.didMartialArts || this._record.studyMinutes !== undefined;
  }
}
