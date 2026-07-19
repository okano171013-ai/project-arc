/**
 * DevelopmentGrant（Version33、ADR 0060）
 *
 * Ownerが最初に1回発行する、開発task専用の委譲書。生活記録の自動
 * 保存に使う`AgentDelegationGrant`（ADR 0051）とは意図的に別モデル
 * （「性質の異なる記録を無理に統合しない」という既存の境界の型、
 * ADR 0005・0006・0009・0011と同じ判断）。
 *
 * `costCeiling`は型・実行時検証の両方で`0`のみを許容する——有料利用は
 * DevelopmentGrantの対象外（ADR 0062確定後、別途改訂しない限り解禁
 * しない）。`FORBIDDEN_OPERATIONS`はGrantごとに選べる項目ではなく、
 * 常に全項目が禁止される固定リストとして、Recordではなくモジュール
 * 定数として持つ。
 */

export type DevelopmentGrantStatus = 'Active' | 'Paused' | 'Revoked';

const LEGAL_TRANSITIONS: Record<DevelopmentGrantStatus, DevelopmentGrantStatus[]> = {
  Active: ['Paused', 'Revoked'],
  Paused: ['Active', 'Revoked'],
  Revoked: [],
};

export const FORBIDDEN_OPERATIONS = [
  'production-deploy',
  'secret-write',
  'external-exposure-change',
  'destructive-delete',
  'constitution-change',
  'principle-change',
] as const;

export type ForbiddenOperation = (typeof FORBIDDEN_OPERATIONS)[number];

export interface DevelopmentGrantScope {
  readonly repositories: string[];
  /** このprefix配下のbranchのみが対象（例: "auto/"）。 */
  readonly branchPrefix: string;
}

export interface DevelopmentGrantRecord {
  readonly scope: DevelopmentGrantScope;
  readonly maxVersionCount: number;
  readonly costCeiling: 0;
  /** なぜこの委譲を発行するのか（Owner記述）。 */
  readonly reason: string;
}

export class DevelopmentGrant {
  private constructor(
    private readonly _id: string,
    private readonly _record: DevelopmentGrantRecord,
    private readonly _createdAt: Date,
    private _status: DevelopmentGrantStatus,
    private _versionsConsumed: number,
  ) {}

  static create(params: { id: string; record: DevelopmentGrantRecord; createdAt?: Date }): DevelopmentGrant {
    if (params.record.scope.repositories.length === 0) {
      throw new Error('scope.repositories must not be empty');
    }
    if (params.record.scope.branchPrefix.trim().length === 0) {
      throw new Error('scope.branchPrefix must not be empty');
    }
    if (params.record.maxVersionCount <= 0) {
      throw new Error('maxVersionCount must be positive');
    }
    if ((params.record.costCeiling as number) !== 0) {
      throw new Error('costCeiling must be 0 (ADR 0060: paid usage is out of DevelopmentGrant scope)');
    }
    if (params.record.reason.trim().length === 0) {
      throw new Error('reason must not be empty');
    }
    return new DevelopmentGrant(params.id, params.record, params.createdAt ?? new Date(), 'Active', 0);
  }

  static restore(params: {
    id: string;
    record: DevelopmentGrantRecord;
    createdAt: Date;
    status: DevelopmentGrantStatus;
    versionsConsumed: number;
  }): DevelopmentGrant {
    return new DevelopmentGrant(params.id, params.record, params.createdAt, params.status, params.versionsConsumed);
  }

  get id(): string {
    return this._id;
  }

  get record(): DevelopmentGrantRecord {
    return this._record;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get status(): DevelopmentGrantStatus {
    return this._status;
  }

  get versionsConsumed(): number {
    return this._versionsConsumed;
  }

  /** このGrantのbranchPrefix配下のbranchかどうか（ADR 0061のlease機構が使う）。 */
  allowsBranch(branch: string): boolean {
    return branch.startsWith(this._record.scope.branchPrefix);
  }

  allowsRepository(repository: string): boolean {
    return this._record.scope.repositories.includes(repository);
  }

  isValidForNewVersion(): boolean {
    if (this._status !== 'Active') return false;
    return this._versionsConsumed < this._record.maxVersionCount;
  }

  recordVersionConsumed(): void {
    this._versionsConsumed += 1;
  }

  private transitionTo(next: DevelopmentGrantStatus): void {
    const allowed = LEGAL_TRANSITIONS[this._status];
    if (!allowed.includes(next)) {
      throw new Error(`Illegal DevelopmentGrant status transition: ${this._status} -> ${next}`);
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
