import type { ConversationContext } from '../../../domain/value-objects/ConversationContext.js';
import type { DecisionEvidence } from '../../../domain/value-objects/DecisionContext.js';

function formatEvidence(evidence: DecisionEvidence): string {
  const sourceLabel = evidence.source
    ? `${evidence.source.title}${evidence.source.url ? ` (${evidence.source.url})` : ''}`
    : '（出典不明）';
  return `・[${evidence.knowledge.title}] ${sourceLabel} / ${evidence.knowledge.capturedAt}\n  「${evidence.knowledge.record.content}」`;
}

/**
 * buildConversationContextText（Version13、Context Injection）
 *
 * ConversationContextを、指示書9章が定める3セクション構造
 * （【Retrieved Knowledge】【Decision Context】【Sources】）の
 * テキストへ整形する純粋関数。Version11のbuildRetrievalContext
 * （ADR 0021）・Context Builderと同じ責務境界を踏襲する——
 * 「【ARC】」に相当する解釈・結論は一切生成しない。Project ARCは
 * この3セクションまでしか書かない（指示書9章）。
 */
export function buildConversationContextText(context: ConversationContext): string {
  const sections: string[] = [];

  sections.push('【Retrieved Knowledge】');
  sections.push(
    context.retrievedKnowledge.length > 0
      ? context.retrievedKnowledge.map(formatEvidence).join('\n')
      : '（該当なし）',
  );

  sections.push('\n【Decision Context】');
  if (context.decisionContext) {
    const dc = context.decisionContext;
    const candidateLines = dc.comparisons.map((c) => {
      const parts = [`・${c.candidate}`];
      if (c.merits.length > 0) parts.push(`  メリット: ${c.merits.join(' / ')}`);
      if (c.demerits.length > 0) parts.push(`  デメリット: ${c.demerits.join(' / ')}`);
      if (c.missingInfo.length > 0) parts.push(`  不足情報: ${c.missingInfo.join(' / ')}`);
      return parts.join('\n');
    });
    sections.push(candidateLines.join('\n'));
    if (dc.pointsForOwnerToDecide.length > 0) {
      sections.push(`\nOwnerが判断すべき点:\n${dc.pointsForOwnerToDecide.map((p) => `・${p}`).join('\n')}`);
    }
  } else {
    sections.push('（このIntentでは生成されません）');
  }

  sections.push('\n【Sources】');
  sections.push(
    context.sources.length > 0
      ? context.sources.map((s) => `・${s.title}${s.url ? ` (${s.url})` : ''}`).join('\n')
      : '（該当なし）',
  );

  if (context.warnings.length > 0) {
    sections.push('\n【Warnings】');
    sections.push(context.warnings.map((w) => `・${w}`).join('\n'));
  }

  return sections.join('\n');
}
