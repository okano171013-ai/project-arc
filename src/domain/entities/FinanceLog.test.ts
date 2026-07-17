import { describe, it, expect } from 'vitest';
import { FinanceLog } from './FinanceLog.js';

describe('FinanceLog', () => {
  it('creates with a valid occurredAt and positive amount (作成)', () => {
    const log = FinanceLog.create({
      id: 'f-1',
      record: { occurredAt: '2026-07-17T12:00:00.000Z', type: 'Expense', amount: 1200 },
    });
    expect(log.record.amount).toBe(1200);
  });

  it('defaults currency to JPY when omitted (currency省略時JPY補完)', () => {
    const log = FinanceLog.create({
      id: 'f-2',
      record: { occurredAt: '2026-07-17T12:00:00.000Z', type: 'Income', amount: 5000 },
    });
    expect(log.record.currency).toBe('JPY');
  });

  it('keeps an explicitly provided currency (明示的なcurrencyは維持)', () => {
    const log = FinanceLog.create({
      id: 'f-3',
      record: { occurredAt: '2026-07-17T12:00:00.000Z', type: 'Expense', amount: 10, currency: 'USD' },
    });
    expect(log.record.currency).toBe('USD');
  });

  it('rejects an invalid occurredAt (不正なoccurredAtの拒否)', () => {
    expect(() =>
      FinanceLog.create({ id: 'f-4', record: { occurredAt: 'nope', type: 'Expense', amount: 100 } }),
    ).toThrow('occurredAt must be a valid ISO8601 date');
  });

  it('rejects non-positive amount (非正のamountの拒否)', () => {
    expect(() =>
      FinanceLog.create({ id: 'f-5', record: { occurredAt: '2026-07-17T12:00:00.000Z', type: 'Expense', amount: 0 } }),
    ).toThrow('amount must be positive');
  });
});
