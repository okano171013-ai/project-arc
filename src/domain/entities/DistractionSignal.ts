/**
 * DistractionSignal（Version26、行動介入レイヤー）
 *
 * 逃避・注意散漫の「候補シグナル」を保持する。この内容を主張する
 * 主体は必ず`source`で明示される——Owner本人・客観的指標・ARCの
 * 推論のいずれかであり、Project ARC自身のコードが内容を発明する
 * ことはない（Constitution第2条）。`confidence`/`basis`は常に必須
 * ——指示書「推測を確定事実として扱わない」の構造的な強制。
 */

export type DistractionSignalKind =
  | 'YouTube'
  | 'SNS'
  | 'AimlessSearch'
  | 'LongBreak'
  | 'EasyTaskEscape'
  | 'NoTimerAtLibrary'
  | 'ScheduledTaskNotStarted'
  | 'Other';

export type DistractionSignalSource = 'OwnerReported' | 'ExternalMetric' | 'ARCInference';

export interface DistractionSignalRecord {
  readonly occurredAt: string; // ISO8601
  readonly kind: DistractionSignalKind;
  readonly source: DistractionSignalSource;
  readonly basis: string;
  readonly confidence: 'low' | 'medium' | 'high';
  /** source==='ExternalMetric'のとき必須。 */
  readonly metricValue?: number;
  readonly metricUnit?: string;
  readonly notes?: string;
  readonly idempotencyKey?: string;
}

export class DistractionSignal {
  private constructor(
    private readonly _id: string,
    private readonly _record: DistractionSignalRecord,
    private readonly _createdAt: Date,
  ) {}

  static create(params: { id: string; record: DistractionSignalRecord; createdAt?: Date }): DistractionSignal {
    if (Number.isNaN(Date.parse(params.record.occurredAt))) {
      throw new Error('occurredAt must be a valid ISO8601 date');
    }
    if (params.record.basis.trim().length === 0) {
      throw new Error('basis must not be empty');
    }
    if (params.record.source === 'ExternalMetric' && !Number.isFinite(params.record.metricValue)) {
      throw new Error('metricValue must be a finite number when source is ExternalMetric');
    }
    return new DistractionSignal(params.id, params.record, params.createdAt ?? new Date());
  }

  static restore(params: { id: string; record: DistractionSignalRecord; createdAt: Date }): DistractionSignal {
    return new DistractionSignal(params.id, params.record, params.createdAt);
  }

  get id(): string {
    return this._id;
  }

  get record(): DistractionSignalRecord {
    return this._record;
  }

  get createdAt(): Date {
    return this._createdAt;
  }
}
