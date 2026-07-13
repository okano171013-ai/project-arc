/**
 * DecisionContext（Version12、Decision Support）
 *
 * DecisionEngineの出力。「比較材料の整理」までを表す射影
 * （projection）であり、独自の永続化を持たない（指示書12章）。
 * 判断・優先順位付けの結果ではなく、Owner/ARCが判断するための
 * 材料そのもの——`candidates`に優先順位はなく（指示書3章）、
 * `pointsForOwnerToDecide`もSystemの結論ではなく「何を確認すべきか」
 * のテンプレート的な指摘に留まる（ADR 0023）。
 *
 * Entityではなく素朴なvalue objectとして扱う理由はADR 0024を参照。
 */

import type { ExternalKnowledge } from '../entities/ExternalKnowledge.js';
import type { ExternalSource } from '../entities/ExternalSource.js';

export interface DecisionEvidence {
  readonly knowledge: ExternalKnowledge;
  readonly source: ExternalSource | null;
  readonly score: number;
  readonly matchedIn: string[];
}

export interface DecisionCandidateComparison {
  readonly candidate: string;
  /** 根拠テキストからキーワード一致で抜き出した記述。新規の評価文は生成しない（ADR 0023）。 */
  readonly merits: string[];
  readonly demerits: string[];
  /** 根拠が0件、またはメリット/デメリットに分類できる記述がない場合の指摘。 */
  readonly missingInfo: string[];
  readonly evidence: DecisionEvidence[];
}

export interface DecisionContext {
  readonly question: string;
  /** 優先順位なし（指示書3章）。 */
  readonly candidates: string[];
  readonly comparisons: DecisionCandidateComparison[];
  /** 全候補の根拠を重複排除した一覧（Citation表示用）。 */
  readonly evidenceList: DecisionEvidence[];
  readonly missingInformation: string[];
  /** Ownerが確認・判断すべき点のテンプレート的な指摘。Systemの結論ではない。 */
  readonly pointsForOwnerToDecide: string[];
}
