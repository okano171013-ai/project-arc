import { describe, it, expect } from 'vitest';
import { CheckIn } from './CheckIn.js';

describe('CheckIn', () => {
  it('creates with valid minimal fields (作成)', () => {
    const checkIn = CheckIn.create({
      id: 'c-1',
      record: {
        occurredAt: '2026-07-18T10:00:00+09:00',
        currentActivity: '判例百選を読んでいる',
        nextTwoHourGoal: '論証パターン3つを覚える',
      },
    });
    expect(checkIn.record.currentActivity).toBe('判例百選を読んでいる');
  });

  it('rejects an invalid occurredAt (不正なoccurredAtの拒否)', () => {
    expect(() =>
      CheckIn.create({
        id: 'c-2',
        record: { occurredAt: 'nope', currentActivity: 'x', nextTwoHourGoal: 'y' },
      }),
    ).toThrow('occurredAt must be a valid ISO8601 date');
  });

  it('rejects empty currentActivity (currentActivity空の拒否)', () => {
    expect(() =>
      CheckIn.create({
        id: 'c-3',
        record: { occurredAt: '2026-07-18T10:00:00+09:00', currentActivity: '  ', nextTwoHourGoal: 'y' },
      }),
    ).toThrow('currentActivity must not be empty');
  });

  it('rejects empty nextTwoHourGoal (nextTwoHourGoal空の拒否)', () => {
    expect(() =>
      CheckIn.create({
        id: 'c-4',
        record: { occurredAt: '2026-07-18T10:00:00+09:00', currentActivity: 'x', nextTwoHourGoal: '  ' },
      }),
    ).toThrow('nextTwoHourGoal must not be empty');
  });

  it.each(['partial', 'missed'] as const)(
    'rejects previousGoalStatus %s without missedReason/correctiveAction/resumeAt (未達3点セット未入力の拒否)',
    (status) => {
      expect(() =>
        CheckIn.create({
          id: 'c-5',
          record: {
            occurredAt: '2026-07-18T10:00:00+09:00',
            currentActivity: 'x',
            nextTwoHourGoal: 'y',
            previousGoalStatus: status,
          },
        }),
      ).toThrow(/missedReason and correctiveAction are required/);
    },
  );

  it.each(['partial', 'missed'] as const)(
    'rejects previousGoalStatus %s with reason/action but invalid resumeAt (resumeAt不正の拒否)',
    (status) => {
      expect(() =>
        CheckIn.create({
          id: 'c-6',
          record: {
            occurredAt: '2026-07-18T10:00:00+09:00',
            currentActivity: 'x',
            nextTwoHourGoal: 'y',
            previousGoalStatus: status,
            missedReason: '集中が切れた',
            correctiveAction: '5分休憩して再開する',
            resumeAt: 'not-a-date',
          },
        }),
      ).toThrow(/resumeAt must be a valid ISO8601 date/);
    },
  );

  it.each(['partial', 'missed'] as const)(
    'accepts previousGoalStatus %s with all three fields present (未達3点セット完備で受理)',
    (status) => {
      const checkIn = CheckIn.create({
        id: 'c-7',
        record: {
          occurredAt: '2026-07-18T10:00:00+09:00',
          currentActivity: 'x',
          nextTwoHourGoal: 'y',
          previousGoalStatus: status,
          missedReason: '集中が切れた',
          correctiveAction: '5分休憩して再開する',
          resumeAt: '2026-07-18T10:30:00+09:00',
        },
      });
      expect(checkIn.record.previousGoalStatus).toBe(status);
    },
  );

  it('does not require the 3-field set when previousGoalStatus is achieved (achievedなら不要)', () => {
    const checkIn = CheckIn.create({
      id: 'c-8',
      record: {
        occurredAt: '2026-07-18T10:00:00+09:00',
        currentActivity: 'x',
        nextTwoHourGoal: 'y',
        previousGoalStatus: 'achieved',
      },
    });
    expect(checkIn.record.previousGoalStatus).toBe('achieved');
  });
});
