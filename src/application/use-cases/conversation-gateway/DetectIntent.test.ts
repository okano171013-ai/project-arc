import { describe, it, expect } from 'vitest';
import { IntentDetector } from './DetectIntent.js';

describe('IntentDetector', () => {
  const detector = new IntentDetector();

  it('classifies a past-record recall question as Retrieval (前に読んだ論文)', () => {
    expect(detector.detect('前に読んだ論文')).toBe('Retrieval');
  });

  it('classifies "前に保存した行政法の記事は？" as Retrieval even though it ends with a question mark', () => {
    expect(detector.detect('前に保存した行政法の記事は？')).toBe('Retrieval');
  });

  it('classifies an A-vs-B choice question as Decision (今日は行政法と民訴法どっち？)', () => {
    expect(detector.detect('今日は行政法と民訴法どっち？')).toBe('Decision');
  });

  it('classifies an open "何を" question as Decision (今日は何を勉強する？)', () => {
    expect(detector.detect('今日は何を勉強する？')).toBe('Decision');
  });

  it('classifies a yes/no question with no explicit markers as Decision via trailing question mark (この参考書買う？)', () => {
    expect(detector.detect('この参考書買う？')).toBe('Decision');
  });

  it('classifies a greeting as None (こんにちは)', () => {
    expect(detector.detect('こんにちは')).toBe('None');
  });

  it('classifies a statement with no question mark and no markers as None', () => {
    expect(detector.detect('今日はいい天気ですね')).toBe('None');
  });
});
