/**
 * AgentDelegationGrant（Version24、Constitution第4条限定改定）
 *
 * Ownerが明示的に発行する「委譲書」。Constitution第4条改定案
 * （`docs/constitution.md`参照）が定める、ARCが個別のOwner`do`なしに
 * 通常生活記録を保存できる唯一の根拠。
 *
 * default-deny：有効なGrantが存在しない場合の既定は常にOwnerの個別
 * 承認である（`WriteProposalGatewayUseCase`参照）。`resume()`は
 * `Revoked`状態からは呼べない——取消しは最終状態であり、Claude Code・
 * ARC自身がGrantを「復活」させることを状態機械レベルで禁止する
 * （ADR 0051）。
 */

import type { ProposalType } from '../value-objects/Proposal.js';

export type AgentDelegationGrantScope = Extract<ProposalType, 'Reflection' | 'ChallengeLog'>;

export type AgentDelegationGrantStatus = 'Active' | 'Paused' | 'Revoked';

const LEGAL_TRANSITIONS: Record<AgentDelegationGrantStatus, AgentDelegationGrantStatus[]> = {
  Active: ['Paused', 'Revoked'],
  Paused: ['Active', 'Revoked'],
  Revoked: [],
};

export interface AgentDelegationGrantRecord {
  readonly scope: AgentDelegationGrantScope[];
  readonly expiresAt: string; // ISO8601
  readonly usageLimit: number;
  /** なぜこの委譲を発行するのか（Owner記述）。 */
  readonly reason: string;
}

export class AgentDelegationGrant {
  private constructor(
    private readonly _id: string,
    private readonly _record: AgentDelegationGrantRecord,
    private readonly _createdAt: Date,
    private _status: AgentDelegationGrantStatus,
    private _usageCount: number,
  ) {}

  static create(params: { id: string; record: AgentDelegationGrantRecord; createdAt?: Date }): AgentDelegationGrant {
    if (params.record.scope.length === 0) {
      throw new Error('scope must not be empty');
    }
    if (params.record.usageLimit <= 0) {
      throw new Error('usageLimit must be positive');
    }
    if (Number.isNaN(Date.parse(params.record.expiresAt))) {
      throw new Error('expiresAt must be a valid ISO8601 date');
    }
    if (params.record.reason.trim().length === 0) {
      throw new Error('reason must not be empty');
    }
    return new AgentDelegationGrant(params.id, params.record, params.createdAt ?? new Date(), 'Active', 0);
  }

  static restore(params: {
    id: string;
    record: AgentDelegationGrantRecord;
    createdAt: Date;
    status: AgentDelegationGrantStatus;
    usageCount: number;
  }): AgentDelegationGrant {
    return new AgentDelegationGrant(params.id, params.record, params.createdAt, params.status, params.usageCount);
  }

  get id(): string {
    return this._id;
  }

  get record(): AgentDelegationGrantRecord {
    return this._record;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get status(): AgentDelegationGrantStatus {
    return this._status;
  }

  get usageCount(): number {
    return this._usageCount;
  }

  /**
   * `proposalType`について、この時点でこのGrantが自動承認を許すか。
   * 状態機械・期限・上限・scopeの全条件を毎回再評価する——Entityの
   * 状態を勝手に変えない（`expiresAt`超過は「Expired」という別状態に
   * 遷移させず、都度の判定に留める）。
   */
  isValidFor(proposalType: ProposalType, now: Date = new Date()): boolean {
    if (this._status !== 'Active') return false;
    if (now.getTime() >= Date.parse(this._record.expiresAt)) return false;
    if (this._usageCount >= this._record.usageLimit) return false;
    return (this._record.scope as ProposalType[]).includes(proposalType);
  }

  recordUsage(): void {
    this._usageCount += 1;
  }

  private transitionTo(next: AgentDelegationGrantStatus): void {
    const allowed = LEGAL_TRANSITIONS[this._status];
    if (!allowed.includes(next)) {
      throw new Error(`Illegal AgentDelegationGrant status transition: ${this._status} -> ${next}`);
    }
    this._status = next;
  }

  pause(): void {
    this.transitionTo('Paused');
  }

  resume(): void {
    this.transitionTo('Active');
  }

  revoke(): void {
    this.transitionTo('Revoked');
  }
}
