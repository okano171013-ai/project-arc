/**
 * Intervention（Version26、行動介入レイヤー）
 *
 * `GenerateInterventionsUseCase`（決定的ルールエンジン）だけが生成する、
 * 機械的な監査派生物。`RecordApprovalDecisionUseCase`が`ApprovalDecision`
 * を書くのと同じ位置づけ——既にラベル付けされたCheckIn/DistractionSignal
 * への閾値評価の結果であり、Systemが新しい事実を主張するものではない
 * （Constitution第2条、ADR 0053参照）。`message`は固定テンプレートへの
 * 数値補間のみで生成され、自由記述で組み立てられることはない。
 *
 * 状態機械は`AgentDelegationGrant`と同型：`Acknowledged`/`Dismissed`は
 * 終端状態。`Snoozed`から`Pending`への遷移は`wakeIfDue`のみが行う機械的
 * な日時比較であり、Owner・ARCの「応答」ではない。
 */

export type InterventionIntensity = 'Notice' | 'Warning' | 'Critical';
export type InterventionStatus = 'Pending' | 'Acknowledged' | 'Dismissed' | 'Snoozed';

const LEGAL_TRANSITIONS: Record<InterventionStatus, InterventionStatus[]> = {
  Pending: ['Acknowledged', 'Dismissed', 'Snoozed'],
  Snoozed: ['Acknowledged', 'Dismissed', 'Pending'],
  Acknowledged: [],
  Dismissed: [],
};

export interface InterventionRecord {
  readonly generatedAt: string; // ISO8601
  readonly intensity: InterventionIntensity;
  readonly triggerRuleId: string;
  /** 参照のみ、存在検証はしない（ADR 0045踏襲）。 */
  readonly relatedCheckInIds?: string[];
  readonly relatedDistractionSignalIds?: string[];
  readonly message: string;
}

export class Intervention {
  private constructor(
    private readonly _id: string,
    private readonly _record: InterventionRecord,
    private readonly _createdAt: Date,
    private _status: InterventionStatus,
    private _respondedAt: Date | undefined,
    private _responseNote: string | undefined,
    private _snoozedUntil: string | undefined,
    private _resumedActivityAt: string | undefined,
  ) {}

  static create(params: { id: string; record: InterventionRecord; createdAt?: Date }): Intervention {
    if (Number.isNaN(Date.parse(params.record.generatedAt))) {
      throw new Error('generatedAt must be a valid ISO8601 date');
    }
    if (params.record.triggerRuleId.trim().length === 0) {
      throw new Error('triggerRuleId must not be empty');
    }
    if (params.record.message.trim().length === 0) {
      throw new Error('message must not be empty');
    }
    return new Intervention(
      params.id,
      params.record,
      params.createdAt ?? new Date(),
      'Pending',
      undefined,
      undefined,
      undefined,
      undefined,
    );
  }

  static restore(params: {
    id: string;
    record: InterventionRecord;
    createdAt: Date;
    status: InterventionStatus;
    respondedAt?: Date;
    responseNote?: string;
    snoozedUntil?: string;
    resumedActivityAt?: string;
  }): Intervention {
    return new Intervention(
      params.id,
      params.record,
      params.createdAt,
      params.status,
      params.respondedAt,
      params.responseNote,
      params.snoozedUntil,
      params.resumedActivityAt,
    );
  }

  get id(): string {
    return this._id;
  }

  get record(): InterventionRecord {
    return this._record;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get status(): InterventionStatus {
    return this._status;
  }

  get respondedAt(): Date | undefined {
    return this._respondedAt;
  }

  get responseNote(): string | undefined {
    return this._responseNote;
  }

  get snoozedUntil(): string | undefined {
    return this._snoozedUntil;
  }

  get resumedActivityAt(): string | undefined {
    return this._resumedActivityAt;
  }

  private transitionTo(next: InterventionStatus): void {
    const allowed = LEGAL_TRANSITIONS[this._status];
    if (!allowed.includes(next)) {
      throw new Error(`Illegal Intervention status transition: ${this._status} -> ${next}`);
    }
    this._status = next;
  }

  acknowledge(resumedActivityAt?: string, now: Date = new Date()): void {
    this.transitionTo('Acknowledged');
    this._respondedAt = now;
    this._resumedActivityAt = resumedActivityAt;
  }

  dismiss(note: string, now: Date = new Date()): void {
    if (note.trim().length === 0) {
      throw new Error('note must not be empty when dismissing an intervention');
    }
    this.transitionTo('Dismissed');
    this._respondedAt = now;
    this._responseNote = note;
  }

  snooze(until: string, now: Date = new Date()): void {
    if (Number.isNaN(Date.parse(until)) || Date.parse(until) <= now.getTime()) {
      throw new Error('until must be a valid ISO8601 date in the future');
    }
    this.transitionTo('Snoozed');
    this._respondedAt = now;
    this._snoozedUntil = until;
  }

  /**
   * Snoozed状態で`snoozedUntil`を過ぎていれば機械的にPendingへ戻す。
   * `GenerateInterventionsUseCase`のみが呼ぶ——日時比較のみであり
   * Owner・ARCの「応答」ではない。
   */
  wakeIfDue(now: Date = new Date()): void {
    if (this._status === 'Snoozed' && this._snoozedUntil !== undefined && now.getTime() >= Date.parse(this._snoozedUntil)) {
      this.transitionTo('Pending');
    }
  }
}
