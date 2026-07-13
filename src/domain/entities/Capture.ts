/**
 * Capture（Smart Captureの入力・下書き提案・書き込み結果の記録）
 *
 * Version6で新設。Ownerのブリーフ通り「写真や文章からどのLogを
 * 更新すべきか」を扱うが、`docs/ai-roles.md` / Principle 1/2/10に
 * 従い、Project ARC（System）は分類・解釈を行わない。Systemの役割は
 * 2つだけ：(1) 機械的なキーワード一致による下書き提案の提示
 * （CaptureClassifierポート経由）、(2) Owner/ARCが確定した振り分け先
 * への忠実な書き込み実行。最終的にどのLogへ何を書くかの判断は
 * 常にOwner/ARC側に残る（ADR 0007）。
 */

export type CaptureLogType =
  | 'SkinLog'
  | 'PurchaseLog'
  | 'ChallengeLog'
  | 'AppearanceLog'
  | 'ThirdPersonEvaluation';

/**
 * 機械的な下書き提案。断定ではなく、根拠（reason）を必ず伴う
 * 「判断材料」として扱う（Principle 2/5）。
 */
export interface CaptureSuggestion {
  readonly logType: CaptureLogType;
  readonly reason: string;
  readonly fields: Record<string, unknown>;
}

export interface AppliedDestination {
  readonly logType: CaptureLogType;
  readonly recordId: string;
}

export interface CaptureRecord {
  readonly text?: string;
  readonly photoPath?: string;
  readonly capturedAt: string; // YYYY-MM-DD
  readonly suggestions: CaptureSuggestion[];
  readonly appliedDestinations: AppliedDestination[];
}

export class Capture {
  private constructor(
    private readonly _id: string,
    private readonly _record: CaptureRecord,
    private readonly _createdAt: Date,
  ) {}

  static create(params: { id: string; record: CaptureRecord; createdAt?: Date }): Capture {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(params.record.capturedAt)) {
      throw new Error(`Invalid date format: ${params.record.capturedAt}. Expected YYYY-MM-DD.`);
    }
    if (!params.record.text?.trim() && !params.record.photoPath?.trim()) {
      throw new Error('either text or photoPath must be provided');
    }
    return new Capture(params.id, params.record, params.createdAt ?? new Date());
  }

  get id(): string {
    return this._id;
  }

  get record(): CaptureRecord {
    return this._record;
  }

  get capturedAt(): string {
    return this._record.capturedAt;
  }

  get createdAt(): Date {
    return this._createdAt;
  }
}
