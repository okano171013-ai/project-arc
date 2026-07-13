/**
 * ConversationContext（Version13、Conversational Integration）
 *
 * ConversationGatewayの出力。Owner/ARCの会話の中で交わされた質問
 * 1件について、「どのツールを使うべきか（Intent）」の判定結果と、
 * そのツールから得られた結果（RetrievedKnowledge/DecisionContext/
 * Sources）を束ねた射影（projection）。DecisionContext（Version12、
 * ADR 0024）と同じ理由でEntityではなくValue Objectとし、永続化しない
 * （指示書5章・11章、ADR 0027）。
 *
 * `retrievedKnowledge`はDecisionContextと同じ`DecisionEvidence`型を
 * 再利用する——Retrieval/Decisionいずれの経路でも「知識＋出典＋
 * スコア」という同じ形でARCに渡せるようにするため。
 */

import type { ExternalSource } from '../entities/ExternalSource.js';
import type { DecisionContext, DecisionEvidence } from './DecisionContext.js';

export type ConversationIntent = 'Retrieval' | 'Decision' | 'None';

export interface ConversationContext {
  readonly question: string;
  readonly intent: ConversationIntent;
  /** IntentがNoneの場合は空配列。Decisionの場合はdecisionContext.evidenceListと同じ内容。 */
  readonly retrievedKnowledge: DecisionEvidence[];
  /** Intentが'Decision'の場合のみ値を持つ。 */
  readonly decisionContext: DecisionContext | null;
  readonly sources: ExternalSource[];
  /** 「該当なし」「Noneと判定された」等、Systemが機械的に検知した注記。ARCの解釈は含まない。 */
  readonly warnings: string[];
}
