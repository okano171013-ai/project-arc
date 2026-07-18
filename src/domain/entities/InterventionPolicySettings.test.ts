import { describe, it, expect } from 'vitest';
import { InterventionPolicySettings, DEFAULT_INTERVENTION_POLICY_SETTINGS } from './InterventionPolicySettings.js';

describe('InterventionPolicySettings', () => {
  it('creates with the default record (既定値で作成)', () => {
    const settings = InterventionPolicySettings.create({ id: 'p-1', record: DEFAULT_INTERVENTION_POLICY_SETTINGS });
    expect(settings.record.checkInIntervalMinutes).toBe(120);
  });

  it.each(['checkInIntervalMinutes', 'dailyNotificationLimit', 'dedupWindowMinutes', 'dismissCooldownHours'] as const)(
    'rejects a non-positive %s (非正数の拒否)',
    (field) => {
      expect(() =>
        InterventionPolicySettings.create({
          id: 'p-2',
          record: { ...DEFAULT_INTERVENTION_POLICY_SETTINGS, [field]: 0 },
        }),
      ).toThrow(`${field} must be a positive integer`);
    },
  );

  it.each(['activeHoursStart', 'activeHoursEnd', 'quietHoursStart', 'quietHoursEnd'] as const)(
    'rejects an invalid %s format (HH:mm不正の拒否)',
    (field) => {
      expect(() =>
        InterventionPolicySettings.create({
          id: 'p-3',
          record: { ...DEFAULT_INTERVENTION_POLICY_SETTINGS, [field]: '9:00' },
        }),
      ).toThrow(`${field} must match HH:mm`);
    },
  );

  it('rejects an exclusionWindow with an invalid date (除外ウィンドウの不正日時拒否)', () => {
    expect(() =>
      InterventionPolicySettings.create({
        id: 'p-4',
        record: {
          ...DEFAULT_INTERVENTION_POLICY_SETTINGS,
          exclusionWindows: [{ reason: 'class', start: 'nope', end: '2026-07-18T12:00:00+09:00' }],
        },
      }),
    ).toThrow('exclusionWindows entries must have valid ISO8601 start/end');
  });

  it('rejects an exclusionWindow where start is not before end (start>=endの拒否)', () => {
    expect(() =>
      InterventionPolicySettings.create({
        id: 'p-5',
        record: {
          ...DEFAULT_INTERVENTION_POLICY_SETTINGS,
          exclusionWindows: [
            { reason: 'sleep', start: '2026-07-18T12:00:00+09:00', end: '2026-07-18T11:00:00+09:00' },
          ],
        },
      }),
    ).toThrow('exclusionWindows entries must have start before end');
  });

  it('accepts a valid exclusionWindow (有効な除外ウィンドウで受理)', () => {
    const settings = InterventionPolicySettings.create({
      id: 'p-6',
      record: {
        ...DEFAULT_INTERVENTION_POLICY_SETTINGS,
        exclusionWindows: [
          { reason: 'class', start: '2026-07-18T09:00:00+09:00', end: '2026-07-18T10:30:00+09:00', note: '刑訴法' },
        ],
      },
    });
    expect(settings.record.exclusionWindows).toHaveLength(1);
  });
});
