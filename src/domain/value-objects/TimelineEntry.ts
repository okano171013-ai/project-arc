/**
 * TimelineEntry（Version8向けのEntity設計のみ、Version7時点）
 *
 * 各Log（Reflection/Memory/AppearanceLog/SkinLog/PurchaseLog/
 * ChallengeLog/InventoryItem/Capture）を横断して時系列表示するための
 * 共通射影型。Version7では型定義のみを行い、実際の集約UseCase・
 * `GET /timeline`エンドポイント・永続化はVersion8で実装する
 * （ARCブリーフ「Version7ではEntityだけ設計してよい」）。
 *
 * 独自の永続化を持たない射影（projection）のため、Repositoryを
 * 持たないvalue objectとして`domain/value-objects/`に置く
 * （CalendarEvent/DailyPlan/TaskItemと同じ扱い）。
 */

export type TimelineSource =
  | 'Reflection'
  | 'Memory'
  | 'AppearanceLog'
  | 'SkinLog'
  | 'PurchaseLog'
  | 'ChallengeLog'
  | 'InventoryItem'
  | 'Capture'
  | 'ThirdPersonEvaluation'
  | 'ExternalKnowledge';

export interface TimelineEntry {
  readonly date: string; // YYYY-MM-DD
  readonly source: TimelineSource;
  readonly title: string;
  readonly summary?: string;
  /** 元レコードへの参照情報等（id、詳細フィールドの一部）。射影元によって形が異なる。 */
  readonly metadata?: Record<string, unknown>;
}
