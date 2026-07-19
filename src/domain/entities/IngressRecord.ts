/**
 * IngressRecord（Version35、ADR 0065）
 *
 * Mobile Ingress（ADR 0059「Transport、Canonical Storeではない」）が
 * スマートフォンから受信した1件の記録。`AgentTask`（ADR 0061）と
 * 同じ「型で不正遷移を拒否する」状態機械パターンを踏襲する。
 *
 * `payloadType`は新しい型を作らず、既存のBridge Layer
 * （Version9）の`BridgeLogType`をそのまま再利用する——Mobile
 * Ingressは「新しい記録カテゴリ」ではなく「新しい入力経路」である
 * （ADR 0065）。
 */
import type { BridgeLogType } from '../value-objects/BridgeLogType.js';

export type IngressRecordStatus = 'Accepted' | 'Canonicalized' | 'Pending' | 'Failed' | 'Discarded';

const LEGAL_TRANSITIONS: Record<IngressRecordStatus, IngressRecordStatus[]> = {
  Accepted: ['Canonicalized', 'Pending', 'Failed'],
  Canonicalized: [],
  Pending: ['Canonicalized', 'Discarded'],
  Failed: ['Accepted', 'Discarded'],
  Discarded: [],
};

export const MAX_RETRY = 3;

export interface IngressRecordData {
  readonly idempotencyKey: string;
  readonly payloadType: BridgeLogType;
  readonly payload: Record<string, unknown>;
  readonly clientCreatedAt: string; // ISO8601、スマートフォン側の時刻
}

export class IngressRecord {
  private constructor(
    private readonly _id: string,
    private readonly _data: IngressRecordData,
    private readonly _receivedAt: Date,
    private _status: IngressRecordStatus,
    private _retryCount: number,
    private _failureReason: string | undefined,
    private _canonicalizedAs: string | undefined,
  ) {}

  static accept(params: { id: string; data: IngressRecordData; receivedAt?: Date }): IngressRecord {
    if (params.data.idempotencyKey.trim().length === 0) {
      throw new Error('idempotencyKey must not be empty');
    }
    if (Number.isNaN(Date.parse(params.data.clientCreatedAt))) {
      throw new Error('clientCreatedAt must be a valid ISO8601 date');
    }
    return new IngressRecord(
      params.id,
      params.data,
      params.receivedAt ?? new Date(),
      'Accepted',
      0,
      undefined,
      undefined,
    );
  }

  static restore(params: {
    id: string;
    data: IngressRecordData;
    receivedAt: Date;
    status: IngressRecordStatus;
    retryCount: number;
    failureReason?: string;
    canonicalizedAs?: string;
  }): IngressRecord {
    return new IngressRecord(
      params.id,
      params.data,
      params.receivedAt,
      params.status,
      params.retryCount,
      params.failureReason,
      params.canonicalizedAs,
    );
  }

  get id(): string {
    return this._id;
  }

  get data(): IngressRecordData {
    return this._data;
  }

  get receivedAt(): Date {
    return this._receivedAt;
  }

  get status(): IngressRecordStatus {
    return this._status;
  }

  get retryCount(): number {
    return this._retryCount;
  }

  get failureReason(): string | undefined {
    return this._failureReason;
  }

  /** Canonicalize成功時、実際に書き込まれたEntityのidを記録する。 */
  get canonicalizedAs(): string | undefined {
    return this._canonicalizedAs;
  }

  markCanonicalized(entityId: string): void {
    this.transitionTo('Canonicalized');
    this._canonicalizedAs = entityId;
  }

  markPending(reason: string): void {
    this.transitionTo('Pending');
    this._failureReason = reason;
  }

  markFailed(reason: string): void {
    this.transitionTo('Failed');
    this._failureReason = reason;
    this._retryCount += 1;
  }

  hasExceededRetries(): boolean {
    return this._retryCount >= MAX_RETRY;
  }

  /** Failed → Accepted。MAX_RETRYに達した後は呼べない（circuit breaker、ADR 0061と同じ思想）。 */
  retry(): void {
    if (this.hasExceededRetries()) {
      throw new Error(`IngressRecord ${this._id} has exceeded MAX_RETRY (${MAX_RETRY}) — discard instead of retrying`);
    }
    this.transitionTo('Accepted');
  }

  /** Pending → Canonicalized。Owner確認により受信内容を採用する。 */
  acceptPending(entityId: string): void {
    this.transitionTo('Canonicalized');
    this._canonicalizedAs = entityId;
  }

  /** Pending/Failed → Discarded。Owner確認により受信内容を破棄する。 */
  discard(): void {
    this.transitionTo('Discarded');
  }

  private transitionTo(next: IngressRecordStatus): void {
    const allowed = LEGAL_TRANSITIONS[this._status];
    if (!allowed.includes(next)) {
      throw new Error(`Illegal IngressRecord status transition: ${this._status} -> ${next}`);
    }
    this._status = next;
  }
}
