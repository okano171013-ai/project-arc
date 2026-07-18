import { describe, it, expect } from 'vitest';
import { DistractionSignal } from './DistractionSignal.js';

describe('DistractionSignal', () => {
  it('creates with a valid OwnerReported record (作成)', () => {
    const signal = DistractionSignal.create({
      id: 's-1',
      record: {
        occurredAt: '2026-07-18T10:00:00+09:00',
        kind: 'YouTube',
        source: 'OwnerReported',
        basis: 'Owner本人が「YouTubeを見ていた」と申告',
        confidence: 'high',
      },
    });
    expect(signal.record.kind).toBe('YouTube');
  });

  it('rejects an invalid occurredAt (不正なoccurredAtの拒否)', () => {
    expect(() =>
      DistractionSignal.create({
        id: 's-2',
        record: {
          occurredAt: 'nope',
          kind: 'SNS',
          source: 'OwnerReported',
          basis: 'x',
          confidence: 'low',
        },
      }),
    ).toThrow('occurredAt must be a valid ISO8601 date');
  });

  it('rejects empty basis (basis空の拒否)', () => {
    expect(() =>
      DistractionSignal.create({
        id: 's-3',
        record: {
          occurredAt: '2026-07-18T10:00:00+09:00',
          kind: 'SNS',
          source: 'OwnerReported',
          basis: '  ',
          confidence: 'low',
        },
      }),
    ).toThrow('basis must not be empty');
  });

  it('rejects source ExternalMetric without metricValue (metricValue欠如の拒否)', () => {
    expect(() =>
      DistractionSignal.create({
        id: 's-4',
        record: {
          occurredAt: '2026-07-18T10:00:00+09:00',
          kind: 'LongBreak',
          source: 'ExternalMetric',
          basis: 'スクリーンタイム計測',
          confidence: 'medium',
        },
      }),
    ).toThrow('metricValue must be a finite number when source is ExternalMetric');
  });

  it('accepts source ExternalMetric with a finite metricValue (metricValue有りで受理)', () => {
    const signal = DistractionSignal.create({
      id: 's-5',
      record: {
        occurredAt: '2026-07-18T10:00:00+09:00',
        kind: 'LongBreak',
        source: 'ExternalMetric',
        basis: 'スクリーンタイム計測',
        confidence: 'medium',
        metricValue: 42,
        metricUnit: 'minutes',
      },
    });
    expect(signal.record.metricValue).toBe(42);
  });

  it.each(['OwnerReported', 'ExternalMetric', 'ARCInference'] as const)(
    'accepts source %s when required fields are present (各sourceで受理)',
    (source) => {
      const signal = DistractionSignal.create({
        id: `s-${source}`,
        record: {
          occurredAt: '2026-07-18T10:00:00+09:00',
          kind: 'Other',
          source,
          basis: '根拠',
          confidence: 'low',
          metricValue: source === 'ExternalMetric' ? 1 : undefined,
        },
      });
      expect(signal.record.source).toBe(source);
    },
  );
});
