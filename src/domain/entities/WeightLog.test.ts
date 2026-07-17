import { describe, it, expect } from 'vitest';
import { WeightLog } from './WeightLog.js';

describe('WeightLog', () => {
  it('creates with a valid measuredAt and positive weightKg (作成)', () => {
    const log = WeightLog.create({ id: 'w-1', record: { measuredAt: '2026-07-17T07:00:00.000Z', weightKg: 68.5 } });
    expect(log.record.weightKg).toBe(68.5);
  });

  it('allows multiple measurements on the same day (同日複数計測OK、一意性制約なし)', () => {
    const morning = WeightLog.create({ id: 'w-2', record: { measuredAt: '2026-07-17T07:00:00.000Z', weightKg: 68.5 } });
    const night = WeightLog.create({ id: 'w-3', record: { measuredAt: '2026-07-17T22:00:00.000Z', weightKg: 69.2 } });
    expect(morning.id).not.toBe(night.id);
  });

  it('rejects an invalid measuredAt (不正なmeasuredAtの拒否)', () => {
    expect(() => WeightLog.create({ id: 'w-4', record: { measuredAt: 'nope', weightKg: 68 } })).toThrow(
      'measuredAt must be a valid ISO8601 date',
    );
  });

  it('rejects non-positive weightKg (非正のweightKgの拒否)', () => {
    expect(() =>
      WeightLog.create({ id: 'w-5', record: { measuredAt: '2026-07-17T07:00:00.000Z', weightKg: 0 } }),
    ).toThrow('weightKg must be positive');
  });
});
