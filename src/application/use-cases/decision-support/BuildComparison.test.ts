import { describe, it, expect } from 'vitest';
import { ComparisonBuilder } from './BuildComparison.js';
import { ExternalKnowledge } from '../../../domain/entities/ExternalKnowledge.js';
import type { DecisionEvidence } from '../../../domain/value-objects/DecisionContext.js';

function evidence(overrides: { content?: string; ownerComment?: string; title?: string } = {}): DecisionEvidence {
  const knowledge = ExternalKnowledge.create({
    id: 'k1',
    record: {
      title: overrides.title ?? 'テスト知識',
      content: overrides.content ?? '本文',
      ownerComment: overrides.ownerComment,
      capturedAt: '2026-07-13',
    },
  });
  return { knowledge, source: null, score: 5, matchedIn: ['title'] };
}

describe('ComparisonBuilder', () => {
  const builder = new ComparisonBuilder();

  it('reports missingInfo when there is zero evidence (根拠ゼロ)', () => {
    const result = builder.build('行政法', []);
    expect(result.merits).toEqual([]);
    expect(result.demerits).toEqual([]);
    expect(result.missingInfo).toHaveLength(1);
    expect(result.missingInfo[0]).toContain('根拠となる記録が見つかりませんでした');
  });

  it('extracts merit-keyword sentences into merits, not into demerits', () => {
    const result = builder.build('行政法', [
      evidence({ content: 'この分野は司法試験でよく使えるのでおすすめです' }),
    ]);
    expect(result.merits).toHaveLength(1);
    expect(result.merits[0]).toContain('おすすめ');
    expect(result.demerits).toEqual([]);
    expect(result.missingInfo).toEqual([]);
  });

  it('extracts demerit-keyword sentences into demerits', () => {
    const result = builder.build('民訴法', [
      evidence({ ownerComment: '手続が複雑で難しいので注意が必要' }),
    ]);
    expect(result.demerits).toHaveLength(1);
    expect(result.demerits[0]).toContain('難しい');
    expect(result.merits).toEqual([]);
  });

  it('reports missingInfo when evidence exists but no merit/demerit keyword matches (捏造しない)', () => {
    const result = builder.build('会社法', [evidence({ content: '条文の構成についてのメモ' })]);
    expect(result.merits).toEqual([]);
    expect(result.demerits).toEqual([]);
    expect(result.missingInfo).toHaveLength(1);
    expect(result.missingInfo[0]).toContain('メリット・デメリットとして分類できる記述はありませんでした');
  });
});
