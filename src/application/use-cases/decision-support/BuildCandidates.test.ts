import { describe, it, expect } from 'vitest';
import { CandidateBuilder } from './BuildCandidates.js';

describe('CandidateBuilder', () => {
  const builder = new CandidateBuilder();

  it('uses explicit candidates when provided, ignoring topics/patterns', () => {
    const result = builder.build({
      question: '筋トレを休む？',
      allTopics: ['行政法'],
      explicitCandidates: ['休む', '休まない', '休む'],
    });
    expect(result).toEqual(['休む', '休まない']);
  });

  it('extracts two candidates when two topics literally appear in the question (A vs B)', () => {
    const result = builder.build({
      question: '行政法と民訴法どちらを優先？',
      allTopics: ['行政法', '民訴法', '会社法'],
    });
    expect(result.sort()).toEqual(['民訴法', '行政法']);
  });

  it('offers all topics when the question contains an open-selection marker (何を)', () => {
    const result = builder.build({
      question: '今日は何を勉強するべき？',
      allTopics: ['行政法', '民訴法', '会社法'],
    });
    expect(result.sort()).toEqual(['会社法', '民訴法', '行政法'].sort());
  });

  it('falls back to a single-topic-plus-other when exactly one topic matches', () => {
    const result = builder.build({
      question: 'この参考書を買うべき？',
      allTopics: ['参考書', '行政法'],
    });
    expect(result).toEqual(['参考書', 'その他']);
  });

  it('falls back to yes/no when nothing matches (筋トレを休む？型の質問)', () => {
    const result = builder.build({
      question: '今日は早く寝るべき？',
      allTopics: ['行政法', '民訴法'],
    });
    expect(result).toEqual(['実行する', '実行しない']);
  });
});
