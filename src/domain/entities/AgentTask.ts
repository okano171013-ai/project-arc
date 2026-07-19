/**
 * AgentTask（Version33、ADR 0061）
 *
 * Program Aの開発taskを表す状態機械。`Proposed → Ready → Claimed →
 * InProgress → Review → ChangesRequested → Accepted → Closed`。
 * lease（`claim`/`heartbeat`/失効時の自動解放）により、1
 * branchに対して同時に1つのtaskだけがActiveであることを保証する
 * （1 branch 1 writer、`docs/project-management/
 * CODEX_RECOVERY_PLAN.md`の手動運用をコードで強制する）。
 *
 * `requestChanges()`が既定の上限（`MAX_RETRY`）に達すると、自動的に
 * `Closed`へ遷移する（circuit breaker、無限retryの防止）。
 */

export type AgentTaskStatus =
  | 'Proposed'
  | 'Ready'
  | 'Claimed'
  | 'InProgress'
  | 'Review'
  | 'ChangesRequested'
  | 'Accepted'
  | 'Closed';

const LEGAL_TRANSITIONS: Record<AgentTaskStatus, AgentTaskStatus[]> = {
  Proposed: ['Ready'],
  Ready: ['Claimed'],
  Claimed: ['InProgress', 'Ready'], // lease失効時はReadyへ差し戻す
  InProgress: ['Review', 'Ready'], // lease失効時はReadyへ差し戻す
  Review: ['ChangesRequested', 'Accepted', 'Closed'], // Closedはcircuit breaker経由のみ
  ChangesRequested: ['InProgress', 'Closed'], // Closedはcircuit breaker経由のみ
  Accepted: ['Closed'],
  Closed: [],
};

export const MAX_RETRY = 3;
export const DEFAULT_LEASE_MS = 30 * 60 * 1000; // 30分

export interface AgentTaskScope {
  readonly repository: string;
  /** 1 task 1 branch。 */
  readonly branch: string;
}

export interface AgentTaskRecord {
  readonly relatedVersion: string;
  readonly title: string;
  readonly acceptanceCriteria: string[];
  readonly relatedAdrIds: string[];
  readonly allowedScope: AgentTaskScope;
  /** ADR 0060参照。このtaskを許可するDevelopmentGrant。 */
  readonly developmentGrantId: string;
}

export interface AgentTaskTestResult {
  readonly passed: boolean;
  readonly summary: string;
}

export class AgentTask {
  private constructor(
    private readonly _id: string,
    private readonly _record: AgentTaskRecord,
    private readonly _createdAt: Date,
    private _status: AgentTaskStatus,
    private _claimedBy: string | undefined,
    private _leaseExpiresAt: Date | undefined,
    private _retryCount: number,
    private readonly _commits: string[],
    private _testResult: AgentTaskTestResult | undefined,
  ) {}

  static create(params: { id: string; record: AgentTaskRecord; createdAt?: Date }): AgentTask {
    if (params.record.title.trim().length === 0) {
      throw new Error('title must not be empty');
    }
    if (params.record.acceptanceCriteria.length === 0) {
      throw new Error('acceptanceCriteria must not be empty');
    }
    if (params.record.allowedScope.repository.trim().length === 0) {
      throw new Error('allowedScope.repository must not be empty');
    }
    if (params.record.allowedScope.branch.trim().length === 0) {
      throw new Error('allowedScope.branch must not be empty');
    }
    if (params.record.developmentGrantId.trim().length === 0) {
      throw new Error('developmentGrantId must not be empty');
    }
    return new AgentTask(
      params.id,
      params.record,
      params.createdAt ?? new Date(),
      'Proposed',
      undefined,
      undefined,
      0,
      [],
      undefined,
    );
  }

  static restore(params: {
    id: string;
    record: AgentTaskRecord;
    createdAt: Date;
    status: AgentTaskStatus;
    claimedBy?: string;
    leaseExpiresAt?: Date;
    retryCount: number;
    commits: string[];
    testResult?: AgentTaskTestResult;
  }): AgentTask {
    return new AgentTask(
      params.id,
      params.record,
      params.createdAt,
      params.status,
      params.claimedBy,
      params.leaseExpiresAt,
      params.retryCount,
      params.commits,
      params.testResult,
    );
  }

  get id(): string {
    return this._id;
  }

  get record(): AgentTaskRecord {
    return this._record;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get status(): AgentTaskStatus {
    return this._status;
  }

  get claimedBy(): string | undefined {
    return this._claimedBy;
  }

  get leaseExpiresAt(): Date | undefined {
    return this._leaseExpiresAt;
  }

  get retryCount(): number {
    return this._retryCount;
  }

  get commits(): readonly string[] {
    return this._commits;
  }

  get testResult(): AgentTaskTestResult | undefined {
    return this._testResult;
  }

  isLeaseExpired(now: Date = new Date()): boolean {
    return this._leaseExpiresAt !== undefined && now.getTime() >= this._leaseExpiresAt.getTime();
  }

  markReady(): void {
    this.transitionTo('Ready');
  }

  claim(agentId: string, now: Date = new Date(), leaseDurationMs = DEFAULT_LEASE_MS): void {
    if (agentId.trim().length === 0) {
      throw new Error('agentId must not be empty');
    }
    this.transitionTo('Claimed');
    this._claimedBy = agentId;
    this._leaseExpiresAt = new Date(now.getTime() + leaseDurationMs);
  }

  /** claimしたAgent本人のみがheartbeatでleaseを延長できる。 */
  heartbeat(agentId: string, now: Date = new Date(), leaseDurationMs = DEFAULT_LEASE_MS): void {
    if (this._status !== 'Claimed' && this._status !== 'InProgress') {
      throw new Error(`Cannot heartbeat an AgentTask in status ${this._status}`);
    }
    if (this._claimedBy !== agentId) {
      throw new Error('Only the agent that claimed this task may send a heartbeat');
    }
    if (this.isLeaseExpired(now)) {
      throw new Error('Lease already expired — task must be re-claimed after release');
    }
    this._leaseExpiresAt = new Date(now.getTime() + leaseDurationMs);
  }

  /**
   * leaseが失効している場合、taskをReadyへ差し戻し誰でも再claimできる
   * 状態にする。失効していなければ何もしない（冪等）。
   */
  releaseIfLeaseExpired(now: Date = new Date()): boolean {
    if (!this.isLeaseExpired(now)) return false;
    if (this._status !== 'Claimed' && this._status !== 'InProgress') return false;
    this.transitionTo('Ready');
    this._claimedBy = undefined;
    this._leaseExpiresAt = undefined;
    return true;
  }

  start(): void {
    this.transitionTo('InProgress');
  }

  recordCommit(hash: string): void {
    if (this._status !== 'InProgress') {
      throw new Error(`Cannot record a commit while AgentTask is in status ${this._status}`);
    }
    this._commits.push(hash);
  }

  submitForReview(testResult: AgentTaskTestResult): void {
    this.transitionTo('Review');
    this._testResult = testResult;
  }

  /**
   * Review差し戻し。`MAX_RETRY`に達した場合は自動的に`Closed`へ遷移
   * する（circuit breaker）——無限retryを防ぐ（Owner Priority
   * Programs「AUT-004」、ADR 0061）。
   */
  requestChanges(): void {
    this._retryCount += 1;
    if (this._retryCount >= MAX_RETRY) {
      this.transitionTo('Closed');
      return;
    }
    this.transitionTo('ChangesRequested');
  }

  resumeAfterChanges(): void {
    this.transitionTo('InProgress');
  }

  accept(): void {
    this.transitionTo('Accepted');
  }

  close(): void {
    this.transitionTo('Closed');
  }

  private transitionTo(next: AgentTaskStatus): void {
    const allowed = LEGAL_TRANSITIONS[this._status];
    if (!allowed.includes(next)) {
      throw new Error(`Illegal AgentTask status transition: ${this._status} -> ${next}`);
    }
    this._status = next;
  }
}
