import { describe, it, expect } from 'vitest';
import { RuleBasedCaptureClassifier } from './RuleBasedCaptureClassifier.js';

describe('RuleBasedCaptureClassifier', () => {
  const classifier = new RuleBasedCaptureClassifier();

  it('キーワード一致でChallengeLogを提案する', async () => {
    const suggestions = await classifier.suggest({ text: '赤福を初めて食べた' });
    expect(suggestions.some((s) => s.logType === 'ChallengeLog')).toBe(true);
    const challenge = suggestions.find((s) => s.logType === 'ChallengeLog');
    expect(challenge?.fields.title).toBe('赤福を初めて食べた');
    expect(challenge?.reason).toMatch(/初めて/);
  });

  it('複数のLogにまたがるキーワードは複数提案する', async () => {
    const suggestions = await classifier.suggest({ text: 'メラノCC買った' });
    expect(suggestions.map((s) => s.logType)).toContain('PurchaseLog');
  });

  it('キーワードに一致しない場合は空配列を返す', async () => {
    const suggestions = await classifier.suggest({ text: '今日は天気が良い' });
    expect(suggestions).toEqual([]);
  });

  it('写真のみ（テキストなし）の場合は画像解析をしないため空配列を返す', async () => {
    const suggestions = await classifier.suggest({ photoPath: 'data/x.jpg' });
    expect(suggestions).toEqual([]);
  });
});
