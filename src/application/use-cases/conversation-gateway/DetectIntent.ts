import type { ConversationIntent } from '../../../domain/value-objects/ConversationContext.js';

/** 「過去の記録を探している」ことを示す語。一致すればRetrieval。 */
const RETRIEVAL_MARKERS = [
  '前に',
  '以前',
  '過去に',
  '読んだ',
  '保存した',
  '記録した',
  'メモした',
  'って何',
  'とは',
  '教えて',
];

/**
 * 「選択・決定を求めている」ことを示す語。Version12の
 * CandidateBuilder（ADR 0022）が候補生成のトリガーとして使う語
 * （「何を」「どちら」「どっち」等）とあえて揃えている——Intent
 * Detectionが'Decision'と判定した質問は、その後DecisionEngineへ
 * そのまま渡されるため、両者の語彙が一致していないと「Decisionと
 * 判定したのにCandidateBuilderが候補を作れない」という不整合が
 * 起きうる。
 */
const DECISION_MARKERS = ['べき', 'どちら', 'どっち', '優先', '何を', '何が', 'どれ', 'ほうがいい'];

const TRAILING_QUESTION_MARK = /[?？]\s*$/;

/**
 * IntentDetector（Version13、Conversational GatewayのIntent Detection）
 *
 * 質問文をRetrieval/Decision/Noneへ分類する。AIによる自然言語理解は
 * 使わない（指示書3章）。Version12のCandidateBuilder（ADR 0022）と
 * 同種の、固定パターンによる機械的分岐のみで構成する。
 *
 * 判定順：
 * 1. RETRIEVAL_MARKERSのいずれかを含む → Retrieval
 *    （「過去に記録した情報を探している」ことが語彙から明確な場合を
 *    優先する。例：「前に保存した行政法の記事は？」は末尾が「？」
 *    だが、Decisionではなくこちらを優先する）
 * 2. DECISION_MARKERSのいずれかを含む、または文末が疑問符で終わる
 *    → Decision（「〜？」で終わる問いの多くは、日本語では
 *    Yes/No型または選択を求める意思決定質問であるため）
 * 3. 上記のいずれでもない → None（例：「こんにちは」等の挨拶・
 *    雑談）
 */
export class IntentDetector {
  detect(question: string): ConversationIntent {
    if (RETRIEVAL_MARKERS.some((marker) => question.includes(marker))) {
      return 'Retrieval';
    }
    if (
      DECISION_MARKERS.some((marker) => question.includes(marker)) ||
      TRAILING_QUESTION_MARK.test(question)
    ) {
      return 'Decision';
    }
    return 'None';
  }
}
