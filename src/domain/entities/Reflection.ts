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
  readonly didMartialArts?: boolean;
  readonly didEnglishLesson?: boolean;
  readonly didAttendClass?: boolean;
  readonly planAchieved?: boolean;
  readonly mood?: Mood;
  readonly expenseYen?: number;
  readonly notes?: string;
  /** 今日頑張ったこと。事実の記述であり、評価はここでは行わない。 */
  readonly proudOf?: string;
  /** 事実と推測を分離する（Principle 5）。ここは事実の記述のみ。 */
  readonly todaysEvents?: string;
  readonly tomorrowsGoal?: string;
}

export type Mood = 'great' | 'good' | 'neutral' | 'low' | 'bad';

const MOOD_SCORE_DELTA: Record<Mood, number> = {
  great: 10,
  good: 5,
  neutral: 0,
  low: -5,
  bad: -10,
};

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
    return Boolean(this._record.didMartialArts) || this._record.studyMinutes !== undefined;
  }

  /**
   * 今日の点数（100点満点）。
   *
   * 注意：これは記録された事実から機械的に算出される「参考指標」で
   * あり、その日の価値を断定する評価ではない（Principle 5: 推測は
   * 推測として扱う／Principle 1: 最終判断は人間が行う）。
   * 点数が低い日を悪い日と決めつけないこと。
   *
   * 内訳（50点を基準に加減点）：
   *   + 勉強時間: 最大20点（180分で満点換算）
   *   + 予定達成: 10点
   *   + 授業出席: 10点
   *   + 睡眠6時間以上: 10点
   *   + 気分: -10 〜 +10点
   */
  score(): number {
    const r = this._record;
    let total = 50;

    if (r.studyMinutes !== undefined) {
      total += Math.min(20, Math.round((r.studyMinutes / 180) * 20));
    }
    if (r.planAchieved) total += 10;
    if (r.didAttendClass) total += 10;
    if (r.sleepHours !== undefined && r.sleepHours >= 6) total += 10;
    if (r.mood) total += MOOD_SCORE_DELTA[r.mood];

    return Math.max(0, Math.min(100, total));
  }
}
