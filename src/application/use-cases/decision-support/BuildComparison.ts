import type {
  DecisionCandidateComparison,
  DecisionEvidence,
} from '../../../domain/value-objects/DecisionContext.js';

const MERIT_KEYWORDS = ['おすすめ', '役立つ', '有効', '効果的', 'メリット', '向いている', '使える', '良い', 'よい'];
const DEMERIT_KEYWORDS = ['デメリット', '難しい', '注意', 'リスク', '苦手', '大変', '向いていない', '悪い'];

/**
 * ComparisonBuilder（Version12、Decision Engineの比較整理）
 *
 * 各候補の根拠（Knowledge）から、メリット・デメリットを「整理」
 * する（指示書1章「メリット整理・デメリット整理」）。新しい評価文を
 * 生成するのではなく、根拠のcontent/ownerSummary/ownerComment/
 * purposeのうち固定キーワードに部分一致する文をそのまま抜き出す
 * だけ——Version6のRuleBasedCaptureClassifierと同種の機械的分類
 * であり、Systemが「これは良い/悪い」と評価しているわけではない
 * （ADR 0023）。
 *
 * キーワードに一致しない根拠、根拠自体が0件の候補は、
 * missingInfoとして明示する。存在しない情報を捏造しない
 * （Principle 5）。
 */
export class ComparisonBuilder {
  build(candidate: string, evidence: DecisionEvidence[]): DecisionCandidateComparison {
    if (evidence.length === 0) {
      return {
        candidate,
        merits: [],
        demerits: [],
        missingInfo: [`「${candidate}」については根拠となる記録が見つかりませんでした。`],
        evidence,
      };
    }

    const merits: string[] = [];
    const demerits: string[] = [];
    let classifiedAny = false;

    for (const item of evidence) {
      const r = item.knowledge.record;
      const texts = [r.content, r.ownerSummary, r.ownerComment, r.purpose].filter(
        (v): v is string => Boolean(v),
      );
      for (const text of texts) {
        if (MERIT_KEYWORDS.some((k) => text.includes(k))) {
          merits.push(`[${item.knowledge.title}] ${text}`);
          classifiedAny = true;
        }
        if (DEMERIT_KEYWORDS.some((k) => text.includes(k))) {
          demerits.push(`[${item.knowledge.title}] ${text}`);
          classifiedAny = true;
        }
      }
    }

    const missingInfo = classifiedAny
      ? []
      : [
          `「${candidate}」の根拠は${evidence.length}件見つかりましたが、メリット・デメリットとして分類できる記述はありませんでした。`,
        ];

    return {
      candidate,
      merits: [...new Set(merits)],
      demerits: [...new Set(demerits)],
      missingInfo,
      evidence,
    };
  }
}
