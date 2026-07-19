import { describe, it, expect } from 'vitest';
import { IngressRecord, MAX_RETRY } from './IngressRecord.js';

function baseData(overrides: Partial<Parameters<typeof IngressRecord.accept>[0]['data']> = {}) {
  return {
    idempotencyKey: 'idem-1',
    payloadType: 'Reflection' as const,
    payload: { record: { proudOf: 'テスト' } },
    clientCreatedAt: '2026-07-19T09:00:00.000Z',
    ...overrides,
  };
}

describe('IngressRecord', () => {
  it('accepts as Accepted with retryCount 0 (受信、既定Accepted)', () => {
    const record = IngressRecord.accept({ id: 'r-1', data: baseData() });
    expect(record.status).toBe('Accepted');
    expect(record.retryCount).toBe(0);
    expect(record.canonicalizedAs).toBeUndefined();
  });

  it('rejects an empty idempotencyKey (空idempotencyKeyの拒否)', () => {
    expect(() => IngressRecord.accept({ id: 'r-2', data: baseData({ idempotencyKey: '' }) })).toThrow(
      'idempotencyKey must not be empty',
    );
  });

  it('rejects an invalid clientCreatedAt (不正なclientCreatedAtの拒否)', () => {
    expect(() =>
      IngressRecord.accept({ id: 'r-3', data: baseData({ clientCreatedAt: 'not-a-date' }) }),
    ).toThrow('clientCreatedAt must be a valid ISO8601 date');
  });

  describe('happy path: Accepted -> Canonicalized', () => {
    it('records the canonicalized entity id', () => {
      const record = IngressRecord.accept({ id: 'r-4', data: baseData() });
      record.markCanonicalized('reflection-entity-id-1');
      expect(record.status).toBe('Canonicalized');
      expect(record.canonicalizedAs).toBe('reflection-entity-id-1');
    });

    it('forbids any transition out of Canonicalized (最終状態)', () => {
      const record = IngressRecord.accept({ id: 'r-5', data: baseData() });
      record.markCanonicalized('id-1');
      expect(() => record.markFailed('should not happen')).toThrow(/Illegal IngressRecord status transition/);
    });
  });

  describe('conflict path: Accepted -> Pending -> Canonicalized/Discarded', () => {
    it('accepting a pending record canonicalizes it', () => {
      const record = IngressRecord.accept({ id: 'r-6', data: baseData() });
      record.markPending('同じ日付のReflectionが既に存在します');
      expect(record.status).toBe('Pending');
      expect(record.failureReason).toContain('同じ日付');

      record.acceptPending('reflection-entity-id-2');
      expect(record.status).toBe('Canonicalized');
      expect(record.canonicalizedAs).toBe('reflection-entity-id-2');
    });

    it('discarding a pending record keeps existing local data (Owner確認により破棄)', () => {
      const record = IngressRecord.accept({ id: 'r-7', data: baseData() });
      record.markPending('競合');
      record.discard();
      expect(record.status).toBe('Discarded');
    });
  });

  describe('failure path and circuit breaker (ADR 0061と同じMAX_RETRY)', () => {
    it('retries Failed -> Accepted while under MAX_RETRY', () => {
      const record = IngressRecord.accept({ id: 'r-8', data: baseData() });
      record.markFailed('一時的なエラー');
      expect(record.status).toBe('Failed');
      expect(record.retryCount).toBe(1);

      record.retry();
      expect(record.status).toBe('Accepted');
    });

    it(`refuses to retry once retryCount reaches MAX_RETRY (${MAX_RETRY})`, () => {
      const record = IngressRecord.accept({ id: 'r-9', data: baseData() });
      for (let i = 0; i < MAX_RETRY; i += 1) {
        record.markFailed(`失敗${i}`);
        if (i < MAX_RETRY - 1) record.retry();
      }
      expect(record.retryCount).toBe(MAX_RETRY);
      expect(record.hasExceededRetries()).toBe(true);
      expect(() => record.retry()).toThrow(/exceeded MAX_RETRY/);
    });

    it('can discard a Failed record directly (打ち切り)', () => {
      const record = IngressRecord.accept({ id: 'r-10', data: baseData() });
      record.markFailed('恒久的なエラー');
      record.discard();
      expect(record.status).toBe('Discarded');
    });
  });

  it('restores from persisted fields as-is (restore)', () => {
    const receivedAt = new Date('2026-07-19T09:00:00.000Z');
    const record = IngressRecord.restore({
      id: 'r-11',
      data: baseData(),
      receivedAt,
      status: 'Pending',
      retryCount: 1,
      failureReason: '競合',
    });
    expect(record.receivedAt).toEqual(receivedAt);
    expect(record.status).toBe('Pending');
    expect(record.retryCount).toBe(1);
    expect(record.failureReason).toBe('競合');
  });
});
