/**
 * ManagementFeedback（Version14、Write Proposal Layer）
 *
 * ReflectionがOwner視点の「今日の振り返り」であるのに対し、
 * ManagementFeedbackはARC視点の「Project ARCの運用・マネジメントに
 * 対する改善提案」を表す別Entity（ADR 0032）。「解決状態
 * （resolution）を持ち、その遷移を追跡する」という点でReflectionとは
 * 性質が異なり、Timelineにも載せない（ADR 0033）。
 *
 * このEntity自身は「どのフィードバックが正しいか」を判断しない。
 * `resolution`の遷移はOwnerの判断を記録するだけであり、Systemが
 * 独自に評価を下すわけではない（Constitution第2条）。
 */

export type ManagementFeedbackResolution = 'Open' | 'Accepted' | 'Implemented' | 'Closed' | 'Rejected';

/** Open→Accepted→Implemented→Closedの直線進行、各段階からRejectedへの離脱を許す。 */
const LEGAL_TRANSITIONS: Record<ManagementFeedbackResolution, ManagementFeedbackResolution[]> = {
  Open: ['Accepted', 'Rejected'],
  Accepted: ['Implemented', 'Rejected'],
  Implemented: ['Closed'],
  Closed: [],
  Rejected: [],
};

export interface ManagementFeedbackRecord {
  /** Version14では実質'ARC'固定だが、将来の発信元拡張に備えstringとする。 */
  readonly author: string;
  readonly category: string;
  readonly content: string;
  /** なぜこのフィードバックをするのか。 */
  readonly reason: string;
  readonly tags?: string[];
}

export class ManagementFeedback {
  private constructor(
    private readonly _id: string,
    private readonly _record: ManagementFeedbackRecord,
    private readonly _createdAt: Date,
    private _resolution: ManagementFeedbackResolution,
    private _resolvedAt: Date | undefined,
  ) {}

  static create(params: { id: string; record: ManagementFeedbackRecord; createdAt?: Date }): ManagementFeedback {
    if (params.record.content.trim().length === 0) {
      throw new Error('content must not be empty');
    }
    return new ManagementFeedback(
      params.id,
      { ...params.record, tags: params.record.tags ?? [] },
      params.createdAt ?? new Date(),
      'Open',
      undefined,
    );
  }

  static restore(params: {
    id: string;
    record: ManagementFeedbackRecord;
    createdAt: Date;
    resolution: ManagementFeedbackResolution;
    resolvedAt?: Date;
  }): ManagementFeedback {
    return new ManagementFeedback(
      params.id,
      { ...params.record, tags: params.record.tags ?? [] },
      params.createdAt,
      params.resolution,
      params.resolvedAt,
    );
  }

  get id(): string {
    return this._id;
  }

  get record(): ManagementFeedbackRecord {
    return this._record;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get resolution(): ManagementFeedbackResolution {
    return this._resolution;
  }

  get resolvedAt(): Date | undefined {
    return this._resolvedAt;
  }

  /** `resolution`から導出。独立した可変フィールドにはしない（矛盾状態を防ぐ）。 */
  get resolved(): boolean {
    return this._resolution !== 'Open';
  }

  /**
   * resolutionを遷移させる。不正な遷移（例: Closedから別状態へ）は
   * 例外にする——「どの遷移が正しいか」の判断はOwnerが行い、Systemは
   * 定義済みの状態機械を機械的に検証するのみ。
   */
  transitionTo(next: ManagementFeedbackResolution, at: Date = new Date()): void {
    const allowed = LEGAL_TRANSITIONS[this._resolution];
    if (!allowed.includes(next)) {
      throw new Error(`Illegal resolution transition: ${this._resolution} -> ${next}`);
    }
    this._resolution = next;
    this._resolvedAt = at;
  }
}
