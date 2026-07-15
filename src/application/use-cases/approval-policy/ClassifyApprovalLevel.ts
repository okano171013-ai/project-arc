import {
  APPROVAL_SIGNAL_KEYS,
  type ApprovalLevel,
  type ApprovalSignals,
} from '../../../domain/value-objects/ApprovalLevel.js';

/**
 * ClassifyApprovalLevelUseCase（Version21、Approval Policy Engine）
 *
 * `ApprovalSignals`（呼び出し側が申告した構造化フラグ）だけを見て
 * Level0/1/2を機械的に導出する。ADR 0022（CandidateBuilder）・
 * ADR 0029（IntentDetector）が確立した「決定的なパターンマッチングは
 * Constitution第2条の『判断』にあたらない」という前例をそのまま踏襲する
 * ——`target`/`reason`等の自由記述テキストの意味を読むことは一切しない。
 *
 * ルール（優先順）：
 * 1. `signals`が省略された場合（=申告なし）は境界事例として扱い、
 *    安全側のLevel1へエスカレーションする（指示書要件2）。
 * 2. 申告されたsignalsのうち1つでもtrueなら、無条件でLevel2
 *    （指示書のOwner列挙6項目、`ApprovalLevel.ts`参照）。複数該当時も
 *    Level2のまま変わらない（これより上のLevelはないため）。
 * 3. `signals`が明示的に渡され、かつ全てfalse/未設定なら、Level0
 *    （可逆的・局所的な通常の書き込みという既存の既定挙動）。
 */
export interface ClassifyApprovalLevelOutput {
  readonly level: ApprovalLevel;
  readonly reason: string;
  readonly triggeredSignals: string[];
}

export class ClassifyApprovalLevelUseCase {
  execute(signals: ApprovalSignals | undefined): ClassifyApprovalLevelOutput {
    if (signals === undefined) {
      return {
        level: 'Level1',
        reason: 'signals未申告のため境界事例としてLevel1へエスカレーション',
        triggeredSignals: [],
      };
    }

    const triggeredSignals = APPROVAL_SIGNAL_KEYS.filter((key) => signals[key] === true);

    if (triggeredSignals.length > 0) {
      return {
        level: 'Level2',
        reason: `Level2該当signal: ${triggeredSignals.join(', ')}`,
        triggeredSignals,
      };
    }

    return {
      level: 'Level0',
      reason: 'Level2該当signalなし（可逆的・局所的な通常の書き込み）',
      triggeredSignals: [],
    };
  }
}
