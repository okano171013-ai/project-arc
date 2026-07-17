import { describe, it, expect } from 'vitest';
import { MealLog } from './MealLog.js';

describe('MealLog', () => {
  it('creates with valid occurredAt and non-empty items (作成)', () => {
    const log = MealLog.create({
      id: 'm-1',
      record: { occurredAt: '2026-07-17T12:00:00.000Z', items: ['白米', '味噌汁'] },
    });
    expect(log.record.items).toEqual(['白米', '味噌汁']);
  });

  it('rejects an invalid occurredAt (不正なoccurredAtの拒否)', () => {
    expect(() =>
      MealLog.create({ id: 'm-2', record: { occurredAt: 'not-a-date', items: ['白米'] } }),
    ).toThrow('occurredAt must be a valid ISO8601 date');
  });

  it('rejects empty items (空itemsの拒否)', () => {
    expect(() =>
      MealLog.create({ id: 'm-3', record: { occurredAt: '2026-07-17T12:00:00.000Z', items: [] } }),
    ).toThrow('items must not be empty');
  });

  it('keeps photoPath as a reference only, no file handling in the entity (photoPathは参照のみ)', () => {
    const log = MealLog.create({
      id: 'm-4',
      record: { occurredAt: '2026-07-17T12:00:00.000Z', items: ['ラーメン'], photoPath: 'data/photos/m-4.jpg' },
    });
    expect(log.record.photoPath).toBe('data/photos/m-4.jpg');
  });
});
