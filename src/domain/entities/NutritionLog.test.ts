import { describe, it, expect } from 'vitest';
import { NutritionLog } from './NutritionLog.js';

describe('NutritionLog', () => {
  it('creates with estimated + basis + confidence (confidenceで作成)', () => {
    const log = NutritionLog.create({
      id: 'n-1',
      record: { mealLogId: 'm-1', calories: 650, estimated: true, basis: '食品成分表からの概算', confidence: 'medium' },
    });
    expect(log.record.calories).toBe(650);
  });

  it('creates with estimated + basis + uncertaintyNote (uncertaintyNoteで作成)', () => {
    const log = NutritionLog.create({
      id: 'n-2',
      record: { mealLogId: 'm-1', estimated: false, basis: 'パッケージ表示値', uncertaintyNote: '正確な分量は未計測' },
    });
    expect(log.record.uncertaintyNote).toBe('正確な分量は未計測');
  });

  it('rejects empty mealLogId (空mealLogIdの拒否)', () => {
    expect(() =>
      NutritionLog.create({
        id: 'n-3',
        record: { mealLogId: '  ', estimated: true, basis: '概算', confidence: 'low' },
      }),
    ).toThrow('mealLogId must not be empty');
  });

  it('rejects empty basis (空basisの拒否)', () => {
    expect(() =>
      NutritionLog.create({
        id: 'n-4',
        record: { mealLogId: 'm-1', estimated: true, basis: '  ', confidence: 'low' },
      }),
    ).toThrow('basis must not be empty');
  });

  it('rejects when neither confidence nor uncertaintyNote is provided (両方欠落の拒否)', () => {
    expect(() =>
      NutritionLog.create({
        id: 'n-5',
        record: { mealLogId: 'm-1', estimated: true, basis: '概算' },
      }),
    ).toThrow('either confidence or uncertaintyNote must be provided');
  });
});
