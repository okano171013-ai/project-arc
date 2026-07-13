import type { TimelineEntry, TimelineSource } from '../../../domain/value-objects/TimelineEntry.js';
import type { ReflectionRepository } from '../../ports/ReflectionRepository.js';
import type { AppearanceLogRepository } from '../../ports/AppearanceLogRepository.js';
import type { SkinLogRepository } from '../../ports/SkinLogRepository.js';
import type { PurchaseLogRepository } from '../../ports/PurchaseLogRepository.js';
import type { ChallengeLogRepository } from '../../ports/ChallengeLogRepository.js';
import type { CaptureRepository } from '../../ports/CaptureRepository.js';
import type { ThirdPersonEvaluationRepository } from '../../ports/ThirdPersonEvaluationRepository.js';

/**
 * Reflectionには`findAll()`がなく`findRecent(limit)`のみ持つ
 * （日次記録という性質上、日常的には十分な設計だった）。Timelineで
 * 「実質的に全件」を取得するため、大きめの上限を指定する。厳密な
 * 全件取得が必要になった時点で`ReflectionRepository`に`findAll()`
 * を追加することを検討する（ADR 0009参照、Principle 9: YAGNI）。
 */
const REFLECTION_FETCH_LIMIT = 3650; // 概ね10年分の日次記録

export interface GetTimelineInput {
  /** この日付以降（含む）のみ対象。YYYY-MM-DD。 */
  since?: string;
  /** 特定のsourceのみに絞り込む。 */
  source?: TimelineSource;
  /** 件数上限（日付降順で先頭からlimit件）。 */
  limit?: number;
}

export interface GetTimelineOutput {
  entries: TimelineEntry[];
}

/**
 * GetTimelineUseCase（Version8、Version9でThirdPersonEvaluationを追加）
 *
 * 各Logを横断して時系列に並べる射影UseCase。対象はReflection/
 * AppearanceLog/SkinLog/PurchaseLog/ChallengeLog/Capture/
 * ThirdPersonEvaluationの7つ（「ある瞬間の出来事」を持つLog）。
 * Memory（時間に紐づかない知識、ADR 0005）とLife Inventory
 * （耐久品の状態管理、ADR 0006）は対象外とする（ADR 0009参照）。
 *
 * このUseCase自身は各Logの記録を集めて日付順に並べ替えるだけで、
 * 「何が重要か」の判断・要約は行わない（ai-roles.md、ADR 0007/0008
 * から継続する方針）。
 */
export class GetTimelineUseCase {
  constructor(
    private readonly reflectionRepository: ReflectionRepository,
    private readonly appearanceLogRepository: AppearanceLogRepository,
    private readonly skinLogRepository: SkinLogRepository,
    private readonly purchaseLogRepository: PurchaseLogRepository,
    private readonly challengeLogRepository: ChallengeLogRepository,
    private readonly captureRepository: CaptureRepository,
    private readonly thirdPersonEvaluationRepository: ThirdPersonEvaluationRepository,
  ) {}

  async execute(input: GetTimelineInput = {}): Promise<GetTimelineOutput> {
    const [reflections, appearanceLogs, skinLogs, purchases, challenges, captures, evaluations] =
      await Promise.all([
        this.reflectionRepository.findRecent(REFLECTION_FETCH_LIMIT),
        this.appearanceLogRepository.findAll(),
        this.skinLogRepository.findAll(),
        this.purchaseLogRepository.findAll(),
        this.challengeLogRepository.findAll(),
        this.captureRepository.findAll(),
        this.thirdPersonEvaluationRepository.findAll(),
      ]);

    let entries: TimelineEntry[] = [
      ...reflections.map((r) => ({
        date: r.date,
        source: 'Reflection' as const,
        title: `振り返り（スコア${r.score()}/100）`,
        summary: r.record.todaysEvents ?? r.record.proudOf,
        metadata: { id: r.id, score: r.score() },
      })),
      ...appearanceLogs.map((log) => ({
        date: log.date,
        source: 'AppearanceLog' as const,
        title: `Appearance Log（総合評価${log.record.overallRating}/5）`,
        summary: log.record.comment,
        metadata: { id: log.id, overallRating: log.record.overallRating },
      })),
      ...skinLogs.map((log) => ({
        date: log.date,
        source: 'SkinLog' as const,
        title: 'Skin Log',
        summary: log.record.note ?? log.record.currentSkincare,
        metadata: { id: log.id },
      })),
      ...purchases.map((p) => ({
        date: p.record.purchaseDate,
        source: 'PurchaseLog' as const,
        title: `購入: ${p.productName}`,
        summary: undefined,
        metadata: { id: p.id, status: p.status },
      })),
      ...challenges.map((c) => ({
        date: c.date,
        source: 'ChallengeLog' as const,
        title: c.title,
        summary: c.record.note,
        metadata: { id: c.id, category: c.record.category },
      })),
      ...captures.map((c) => ({
        date: c.record.capturedAt,
        source: 'Capture' as const,
        title: c.record.text ?? '(写真のみ)',
        summary: undefined,
        metadata: { id: c.id, appliedDestinations: c.record.appliedDestinations },
      })),
      ...evaluations.map((e) => ({
        date: e.date,
        source: 'ThirdPersonEvaluation' as const,
        title: `${e.record.person}: 「${e.record.evaluation}」`,
        summary: undefined,
        metadata: { id: e.id, category: e.record.category },
      })),
    ];

    if (input.source) {
      entries = entries.filter((e) => e.source === input.source);
    }
    if (input.since) {
      entries = entries.filter((e) => e.date >= input.since!);
    }

    entries.sort((a, b) => b.date.localeCompare(a.date));

    if (input.limit !== undefined) {
      entries = entries.slice(0, input.limit);
    }

    return { entries };
  }
}
