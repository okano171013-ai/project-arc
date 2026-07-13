import type { CaptureSuggestion } from '../../domain/entities/Capture.js';

/**
 * CaptureClassifier（ポート）
 *
 * テキスト・写真パスから「下書き提案」を返すだけの機械的な分類器。
 * 断定・重要度判定は行わない（ADR 0007、`docs/ai-roles.md`）。
 * Version6のMVP実装はキーワード一致のみ（RuleBasedCaptureClassifier）
 * だが、将来LLMベースの実装に差し替え可能なようにポートとして
 * 分離してある（ADR 0002の再検討ポイント）。
 */
export interface CaptureClassifier {
  suggest(input: { text?: string; photoPath?: string }): Promise<CaptureSuggestion[]>;
}
