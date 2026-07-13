import type { RetrieveKnowledgeResultItem } from './RetrieveKnowledge.js';

/**
 * buildRetrievalContext（Version11、Knowledge RetrievalのContext Builder）
 *
 * RetrieveKnowledgeUseCaseの結果を、ARCがそのまま会話に引用できる
 * テキストブロック（指示書の「【External Brain】」部分）に整形する
 * 純粋関数。I/Oを持たず、AIも一切呼び出さない。
 *
 * 「【ARC】この知識を踏まえると...」という推論部分は生成しない——
 * それはARC（ChatGPT）自身が会話の中で行う責務であり、Systemが
 * 代わりに生成することはSystemが判断する領域に踏み込むことになる
 * （Constitution第2条、ADR 0021）。本関数が返すのは「原文＋出典」
 * の引用ブロックのみで、そこから先の解釈・結論はARCに委ねる。
 */
export function buildRetrievalContext(results: RetrieveKnowledgeResultItem[]): string {
  if (results.length === 0) {
    return '（該当するKnowledgeが見つかりませんでした）';
  }

  return results
    .map(({ knowledge, source }) => {
      const r = knowledge.record;
      const sourceLabel = source
        ? `${source.title}${source.url ? ` (${source.url})` : ''}`
        : '（出典不明）';
      const lines = [
        '【External Brain】',
        sourceLabel,
        knowledge.capturedAt,
        `「${r.content}」`,
      ];
      if (r.ownerSummary) lines.push(`Ownerの要約: ${r.ownerSummary}`);
      if (r.ownerComment) lines.push(`Ownerのコメント: ${r.ownerComment}`);
      if (r.purpose) lines.push(`保存理由: ${r.purpose}`);
      return lines.join('\n');
    })
    .join('\n\n---\n\n');
}
