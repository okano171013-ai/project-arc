import { describe, it, expect } from 'vitest';
import { Intervention } from './Intervention.js';

function buildIntervention() {
  return Intervention.create({
    id: 'i-1',
    record: {
      generatedAt: '2026-07-18T10:00:00+09:00',
      intensity: 'Warning',
      triggerRuleId: 'overdue-checkin',
      message: 'チェックイン未実施のまま130分経過しています。',
    },
  });
}

describe('Intervention', () => {
  it('creates as Pending (作成、既定Pending)', () => {
    const intervention = buildIntervention();
    expect(intervention.status).toBe('Pending');
  });

  it('rejects an invalid generatedAt (不正なgeneratedAtの拒否)', () => {
    expect(() =>
      Intervention.create({
        id: 'i-2',
        record: { generatedAt: 'nope', intensity: 'Notice', triggerRuleId: 'x', message: 'y' },
      }),
    ).toThrow('generatedAt must be a valid ISO8601 date');
  });

  it('rejects empty triggerRuleId (triggerRuleId空の拒否)', () => {
    expect(() =>
      Intervention.create({
        id: 'i-3',
        record: { generatedAt: '2026-07-18T10:00:00+09:00', intensity: 'Notice', triggerRuleId: '  ', message: 'y' },
      }),
    ).toThrow('triggerRuleId must not be empty');
  });

  it('rejects empty message (message空の拒否)', () => {
    expect(() =>
      Intervention.create({
        id: 'i-4',
        record: { generatedAt: '2026-07-18T10:00:00+09:00', intensity: 'Notice', triggerRuleId: 'x', message: '  ' },
      }),
    ).toThrow('message must not be empty');
  });

  describe('status transitions', () => {
    it('allows Pending -> Acknowledged (承認)', () => {
      const intervention = buildIntervention();
      intervention.acknowledge('2026-07-18T10:15:00+09:00');
      expect(intervention.status).toBe('Acknowledged');
      expect(intervention.resumedActivityAt).toBe('2026-07-18T10:15:00+09:00');
    });

    it('allows Pending -> Dismissed with a note (却下、理由必須)', () => {
      const intervention = buildIntervention();
      intervention.dismiss('誤検知でした');
      expect(intervention.status).toBe('Dismissed');
      expect(intervention.responseNote).toBe('誤検知でした');
    });

    it('rejects dismiss() without a note (note空の拒否)', () => {
      const intervention = buildIntervention();
      expect(() => intervention.dismiss('  ')).toThrow('note must not be empty when dismissing an intervention');
      expect(intervention.status).toBe('Pending');
    });

    it('allows Pending -> Snoozed with a future date (スヌーズ)', () => {
      const intervention = buildIntervention();
      const until = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      intervention.snooze(until);
      expect(intervention.status).toBe('Snoozed');
      expect(intervention.snoozedUntil).toBe(until);
    });

    it('rejects snooze() with a past date (過去日時の拒否)', () => {
      const intervention = buildIntervention();
      const past = new Date(Date.now() - 1000).toISOString();
      expect(() => intervention.snooze(past)).toThrow('until must be a valid ISO8601 date in the future');
    });

    it('rejects snooze() with an invalid date (不正な日時の拒否)', () => {
      const intervention = buildIntervention();
      expect(() => intervention.snooze('not-a-date')).toThrow('until must be a valid ISO8601 date in the future');
    });

    it('forbids any transition out of Acknowledged (Acknowledgedは終端)', () => {
      const intervention = buildIntervention();
      intervention.acknowledge();
      expect(() => intervention.dismiss('x')).toThrow(/Illegal Intervention status transition/);
      expect(() => intervention.snooze(new Date(Date.now() + 1000).toISOString())).toThrow(
        /Illegal Intervention status transition/,
      );
    });

    it('forbids any transition out of Dismissed (Dismissedは終端)', () => {
      const intervention = buildIntervention();
      intervention.dismiss('x');
      expect(() => intervention.acknowledge()).toThrow(/Illegal Intervention status transition/);
    });

    it('allows Snoozed -> Acknowledged/Dismissed directly (Snoozed中でも応答可能)', () => {
      const intervention = buildIntervention();
      intervention.snooze(new Date(Date.now() + 60 * 60 * 1000).toISOString());
      intervention.acknowledge();
      expect(intervention.status).toBe('Acknowledged');
    });
  });

  describe('wakeIfDue', () => {
    it('transitions Snoozed -> Pending once snoozedUntil has passed (期限到達で再遷移)', () => {
      const intervention = buildIntervention();
      intervention.snooze(new Date(Date.now() + 1000).toISOString());
      intervention.wakeIfDue(new Date(Date.now() + 2000));
      expect(intervention.status).toBe('Pending');
    });

    it('does not transition before snoozedUntil (期限前は据え置き)', () => {
      const intervention = buildIntervention();
      const until = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      intervention.snooze(until);
      intervention.wakeIfDue(new Date());
      expect(intervention.status).toBe('Snoozed');
    });

    it('is a no-op when status is not Snoozed (Snoozed以外では何もしない)', () => {
      const intervention = buildIntervention();
      intervention.wakeIfDue(new Date(Date.now() + 1000 * 1000));
      expect(intervention.status).toBe('Pending');
    });
  });

  it('restores from persisted fields as-is (restore)', () => {
    const now = new Date('2026-07-18T00:00:00.000Z');
    const intervention = Intervention.restore({
      id: 'i-5',
      record: {
        generatedAt: '2026-07-18T00:00:00.000Z',
        intensity: 'Critical',
        triggerRuleId: 'distraction-cluster',
        message: 'x',
      },
      createdAt: now,
      status: 'Dismissed',
      respondedAt: now,
      responseNote: '誤検知',
    });
    expect(intervention.status).toBe('Dismissed');
    expect(intervention.responseNote).toBe('誤検知');
  });
});
