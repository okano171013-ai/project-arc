const OPEN_SELECTION_MARKERS = ['何を', '何が', 'なにを', 'なにが', 'どれ'];
const DEFAULT_TOPIC_CANDIDATE_LIMIT = 5;
const YES_NO_FALLBACK = ['実行する', '実行しない'];

export interface BuildCandidatesInput {
  question: string;
  /** 既存ExternalKnowledgeの重複なしtopics一覧。 */
  allTopics: string[];
  /** 呼び出し側（Owner/ARC）が明示した候補。指定があれば最優先で使う。 */
  explicitCandidates?: string[];
}

/**
 * CandidateBuilder（Version12、Decision EngineのCandidate Builder）
 *
 * 質問文から「考えられる選択肢」を導く。AIによる自然言語理解は
 * 行わない（指示書16章）。優先順位は付けない（指示書3章）。
 *
 * 以下の優先順の、固定パターンによる機械的な分岐のみで構成する
 * （Version6のRuleBasedCaptureClassifierと同種の設計、ADR 0022）：
 *
 * 1. 呼び出し側が明示的にcandidatesを渡した場合は、それをそのまま
 *    使う。複雑な質問・機械的分岐では拾えない質問は、Owner/ARC側で
 *    候補を明示することを推奨する（ADR 0022）。
 * 2. 質問文に既存のExternalKnowledgeのtopicが2つ以上、部分文字列
 *    として含まれる場合、それらをそのまま候補にする
 *    （例：「行政法と民訴法どちらを優先？」）。
 * 3. 質問文に「何を」「どれ」等の選択を促す語が含まれる場合、
 *    既存の全topicを候補として提示する（例：「今日は何を勉強する
 *    べき？」）。質問とtopicの意味的な関連は判定しない——Ownerが
 *    選べる材料をそのまま並べるだけ。
 * 4. 質問文にtopicが1つだけ含まれる場合は、それと「その他」を候補
 *    にする。
 * 5. 上記のいずれにも当てはまらない場合はYes/No型の質問とみなし、
 *    ["実行する", "実行しない"]を返す（例：「今日は早く寝るべき？」）。
 */
export class CandidateBuilder {
  build(input: BuildCandidatesInput): string[] {
    const { question, allTopics, explicitCandidates } = input;

    if (explicitCandidates && explicitCandidates.length > 0) {
      return this.dedupe(explicitCandidates);
    }

    const matchedTopics = allTopics.filter((topic) => topic.length > 0 && question.includes(topic));
    if (matchedTopics.length >= 2) {
      return this.dedupe(matchedTopics);
    }

    if (OPEN_SELECTION_MARKERS.some((marker) => question.includes(marker))) {
      return this.dedupe(allTopics).slice(0, DEFAULT_TOPIC_CANDIDATE_LIMIT);
    }

    if (matchedTopics.length === 1) {
      return [...matchedTopics, 'その他'];
    }

    return [...YES_NO_FALLBACK];
  }

  private dedupe(values: string[]): string[] {
    return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
  }
}
