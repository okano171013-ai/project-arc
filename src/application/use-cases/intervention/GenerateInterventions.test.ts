import { describe, it, expect, beforeEach } from 'vitest';
import { GenerateInterventionsUseCase } from './GenerateInterventions.js';
import { CheckIn } from '../../../domain/entities/CheckIn.js';
import { DistractionSignal } from '../../../domain/entities/DistractionSignal.js';
import { Intervention } from '../../../domain/entities/Intervention.js';
import {
  InterventionPolicySettings,
  DEFAULT_INTERVENTION_POLICY_SETTINGS,
} from '../../../domain/entities/InterventionPolicySettings.js';
import type { CheckInRepository } from '../../ports/CheckInRepository.js';
import type { DistractionSignalRepository } from '../../ports/DistractionSignalRepository.js';
import type { InterventionRepository } from '../../ports/InterventionRepository.js';
import type { InterventionPolicySettingsRepository } from '../../ports/InterventionPolicySettingsRepository.js';

class FakeCheckInRepository implements CheckInRepository {
  store: CheckIn[] = [];
  async save(c: CheckIn): Promise<void> {
    this.store.push(c);
  }
  async findAll(): Promise<CheckIn[]> {
    return [...this.store];
  }
}

class FakeDistractionSignalRepository implements DistractionSignalRepository {
  store: DistractionSignal[] = [];
  async save(s: DistractionSignal): Promise<void> {
    this.store.push(s);
  }
  async findAll(): Promise<DistractionSignal[]> {
    return [...this.store];
  }
}

class FakeInterventionRepository implements InterventionRepository {
  store: Intervention[] = [];
  async save(i: Intervention): Promise<void> {
    const idx = this.store.findIndex((x) => x.id === i.id);
    if (idx >= 0) this.store[idx] = i;
    else this.store.push(i);
  }
  async findById(id: string): Promise<Intervention | null> {
    return this.store.find((i) => i.id === id) ?? null;
  }
  async findAll(): Promise<Intervention[]> {
    return [...this.store];
  }
}

class FakeInterventionPolicySettingsRepository implements InterventionPolicySettingsRepository {
  settings: InterventionPolicySettings | undefined;
  async save(s: InterventionPolicySettings): Promise<void> {
    this.settings = s;
  }
  async find(): Promise<InterventionPolicySettings | undefined> {
    return this.settings;
  }
}

// 2026-07-18は土曜日。14:00は既定のactiveHours(07:00-23:00)内・quietHours(23:00-07:00)外。
const NOON_ISH = new Date('2026-07-18T14:00:00');

function minutesAgo(reference: Date, minutes: number): string {
  return new Date(reference.getTime() - minutes * 60 * 1000).toISOString();
}

describe('GenerateInterventionsUseCase', () => {
  let checkInRepo: FakeCheckInRepository;
  let signalRepo: FakeDistractionSignalRepository;
  let interventionRepo: FakeInterventionRepository;
  let settingsRepo: FakeInterventionPolicySettingsRepository;
  let useCase: GenerateInterventionsUseCase;

  beforeEach(() => {
    checkInRepo = new FakeCheckInRepository();
    signalRepo = new FakeDistractionSignalRepository();
    interventionRepo = new FakeInterventionRepository();
    settingsRepo = new FakeInterventionPolicySettingsRepository();
    useCase = new GenerateInterventionsUseCase(checkInRepo, signalRepo, interventionRepo, settingsRepo);
  });

  describe('overdue-checkin rule', () => {
    it('does not fire at interval+9min (境界: 未達)', async () => {
      await checkInRepo.save(
        CheckIn.create({
          id: 'c-1',
          record: { occurredAt: minutesAgo(NOON_ISH, 129), currentActivity: 'x', nextTwoHourGoal: 'y' },
        }),
      );
      const result = await useCase.execute({ now: NOON_ISH });
      expect(result.generated).toHaveLength(0);
    });

    it('fires Notice at exactly interval+10min (境界: 発火、Notice)', async () => {
      await checkInRepo.save(
        CheckIn.create({
          id: 'c-2',
          record: { occurredAt: minutesAgo(NOON_ISH, 130), currentActivity: 'x', nextTwoHourGoal: 'y' },
        }),
      );
      const result = await useCase.execute({ now: NOON_ISH });
      expect(result.generated).toHaveLength(1);
      expect(result.generated[0]?.record.triggerRuleId).toBe('overdue-checkin');
      expect(result.generated[0]?.record.intensity).toBe('Notice');
    });

    it('fires Warning once overdue reaches double the interval (2倍でWarning)', async () => {
      await checkInRepo.save(
        CheckIn.create({
          id: 'c-3',
          record: { occurredAt: minutesAgo(NOON_ISH, 240), currentActivity: 'x', nextTwoHourGoal: 'y' },
        }),
      );
      const result = await useCase.execute({ now: NOON_ISH });
      expect(result.generated[0]?.record.intensity).toBe('Warning');
    });
  });

  describe('quiet hours and exclusion windows', () => {
    it('does not fire during quiet hours (quiet hours中は発火しない)', async () => {
      const lateNight = new Date('2026-07-18T23:30:00');
      await checkInRepo.save(
        CheckIn.create({
          id: 'c-4',
          record: { occurredAt: minutesAgo(lateNight, 300), currentActivity: 'x', nextTwoHourGoal: 'y' },
        }),
      );
      const result = await useCase.execute({ now: lateNight });
      expect(result.generated).toHaveLength(0);
    });

    it('does not fire during an active exclusion window (除外ウィンドウ中は発火しない)', async () => {
      await settingsRepo.save(
        InterventionPolicySettings.create({
          id: 'settings-1',
          record: {
            ...DEFAULT_INTERVENTION_POLICY_SETTINGS,
            exclusionWindows: [
              { reason: 'class', start: '2026-07-18T13:00:00', end: '2026-07-18T15:00:00', note: '刑訴法' },
            ],
          },
        }),
      );
      await checkInRepo.save(
        CheckIn.create({
          id: 'c-5',
          record: { occurredAt: minutesAgo(NOON_ISH, 300), currentActivity: 'x', nextTwoHourGoal: 'y' },
        }),
      );
      const result = await useCase.execute({ now: NOON_ISH });
      expect(result.generated).toHaveLength(0);
    });
  });

  describe('dedup and cooldown', () => {
    it('does not re-fire the same rule within dedupWindowMinutes (dedup)', async () => {
      await checkInRepo.save(
        CheckIn.create({
          id: 'c-6',
          record: { occurredAt: minutesAgo(NOON_ISH, 300), currentActivity: 'x', nextTwoHourGoal: 'y' },
        }),
      );
      const first = await useCase.execute({ now: NOON_ISH });
      expect(first.generated).toHaveLength(1);

      const secondNow = new Date(NOON_ISH.getTime() + 5 * 60 * 1000);
      const second = await useCase.execute({ now: secondNow });
      expect(second.generated).toHaveLength(0);
    });

    it('does not re-fire the same rule within dismissCooldownHours after being dismissed (却下クールダウン)', async () => {
      await checkInRepo.save(
        CheckIn.create({
          id: 'c-7',
          record: { occurredAt: minutesAgo(NOON_ISH, 300), currentActivity: 'x', nextTwoHourGoal: 'y' },
        }),
      );
      const first = await useCase.execute({ now: NOON_ISH });
      const intervention = first.generated[0]!;
      intervention.dismiss('誤検知でした', NOON_ISH);
      await interventionRepo.save(intervention);

      const laterNow = new Date(NOON_ISH.getTime() + (DEFAULT_INTERVENTION_POLICY_SETTINGS.dismissCooldownHours - 1) * 60 * 60 * 1000);
      const second = await useCase.execute({ now: laterNow });
      expect(second.generated).toHaveLength(0);

      const evenLaterNow = new Date(NOON_ISH.getTime() + (DEFAULT_INTERVENTION_POLICY_SETTINGS.dismissCooldownHours + 1) * 60 * 60 * 1000);
      const third = await useCase.execute({ now: evenLaterNow });
      expect(third.generated).toHaveLength(1);
    });

    it('stops firing once dailyNotificationLimit is reached (1日上限)', async () => {
      await settingsRepo.save(
        InterventionPolicySettings.create({
          id: 'settings-2',
          record: { ...DEFAULT_INTERVENTION_POLICY_SETTINGS, dailyNotificationLimit: 1 },
        }),
      );
      // 既に本日1件生成済みという状態を再現する。
      await interventionRepo.save(
        Intervention.create({
          id: 'existing-1',
          record: {
            generatedAt: NOON_ISH.toISOString(),
            intensity: 'Notice',
            triggerRuleId: 'some-other-rule',
            message: 'x',
          },
        }),
      );
      await checkInRepo.save(
        CheckIn.create({
          id: 'c-8',
          record: { occurredAt: minutesAgo(NOON_ISH, 300), currentActivity: 'x', nextTwoHourGoal: 'y' },
        }),
      );
      const result = await useCase.execute({ now: NOON_ISH });
      expect(result.generated).toHaveLength(0);
    });
  });

  describe('wakeIfDue', () => {
    it('transitions a Snoozed intervention back to Pending once due, before evaluating new rules', async () => {
      const intervention = Intervention.create({
        id: 'snoozed-1',
        record: {
          generatedAt: minutesAgo(NOON_ISH, 300),
          intensity: 'Notice',
          triggerRuleId: 'overdue-checkin',
          message: 'x',
        },
      });
      const snoozedAt = new Date(NOON_ISH.getTime() - 5 * 60 * 1000);
      const snoozeUntil = new Date(NOON_ISH.getTime() - 1000);
      intervention.snooze(snoozeUntil.toISOString(), snoozedAt);
      await interventionRepo.save(intervention);

      await useCase.execute({ now: NOON_ISH });
      const stored = await interventionRepo.findById('snoozed-1');
      expect(stored?.status).toBe('Pending');
    });
  });

  describe('distraction-cluster rule', () => {
    async function seedSignal(id: string, minutesAgoValue: number, confidence: 'low' | 'medium' | 'high') {
      await signalRepo.save(
        DistractionSignal.create({
          id,
          record: {
            occurredAt: minutesAgo(NOON_ISH, minutesAgoValue),
            kind: 'YouTube',
            source: 'OwnerReported',
            basis: 'x',
            confidence,
          },
        }),
      );
    }

    it('fires Warning with 3+ medium+ signals in 60min and no CheckIn between (Warning)', async () => {
      await seedSignal('s-1', 50, 'medium');
      await seedSignal('s-2', 30, 'medium');
      await seedSignal('s-3', 10, 'medium');
      const result = await useCase.execute({ now: NOON_ISH });
      expect(result.generated.some((i) => i.record.triggerRuleId === 'distraction-cluster')).toBe(true);
      const c = result.generated.find((i) => i.record.triggerRuleId === 'distraction-cluster');
      expect(c?.record.intensity).toBe('Warning');
    });

    it('fires Critical with 5+ signals including at least one high (Critical)', async () => {
      await seedSignal('s-4', 55, 'medium');
      await seedSignal('s-5', 45, 'medium');
      await seedSignal('s-6', 35, 'medium');
      await seedSignal('s-7', 25, 'high');
      await seedSignal('s-8', 15, 'medium');
      const result = await useCase.execute({ now: NOON_ISH });
      const c = result.generated.find((i) => i.record.triggerRuleId === 'distraction-cluster');
      expect(c?.record.intensity).toBe('Critical');
    });

    it('does not fire when a CheckIn occurred within the window (窓内にCheckInがあれば発火しない)', async () => {
      await seedSignal('s-9', 50, 'medium');
      await seedSignal('s-10', 30, 'medium');
      await seedSignal('s-11', 10, 'medium');
      await checkInRepo.save(
        CheckIn.create({
          id: 'c-9',
          record: { occurredAt: minutesAgo(NOON_ISH, 20), currentActivity: 'x', nextTwoHourGoal: 'y' },
        }),
      );
      const result = await useCase.execute({ now: NOON_ISH });
      expect(result.generated.some((i) => i.record.triggerRuleId === 'distraction-cluster')).toBe(false);
    });

    it('does not count low-confidence signals toward the cluster threshold (低confidenceは対象外)', async () => {
      await seedSignal('s-12', 50, 'low');
      await seedSignal('s-13', 30, 'low');
      await seedSignal('s-14', 10, 'low');
      const result = await useCase.execute({ now: NOON_ISH });
      expect(result.generated.some((i) => i.record.triggerRuleId === 'distraction-cluster')).toBe(false);
    });
  });

  describe('missed-goal-no-restart rule', () => {
    it('fires when resumeAt has passed and no later CheckIn exists (再開未確認で発火)', async () => {
      await checkInRepo.save(
        CheckIn.create({
          id: 'c-10',
          record: {
            occurredAt: minutesAgo(NOON_ISH, 60),
            currentActivity: 'x',
            nextTwoHourGoal: 'y',
            previousGoalStatus: 'missed',
            missedReason: '集中が切れた',
            correctiveAction: '休憩して再開',
            resumeAt: minutesAgo(NOON_ISH, 30),
          },
        }),
      );
      const result = await useCase.execute({ now: NOON_ISH });
      expect(result.generated.some((i) => i.record.triggerRuleId === 'missed-goal-no-restart')).toBe(true);
    });

    it('does not fire when resumeAt has not yet passed (再開予定前は発火しない)', async () => {
      const future = new Date(NOON_ISH.getTime() + 30 * 60 * 1000).toISOString();
      await checkInRepo.save(
        CheckIn.create({
          id: 'c-11',
          record: {
            occurredAt: minutesAgo(NOON_ISH, 10),
            currentActivity: 'x',
            nextTwoHourGoal: 'y',
            previousGoalStatus: 'missed',
            missedReason: '集中が切れた',
            correctiveAction: '休憩して再開',
            resumeAt: future,
          },
        }),
      );
      const result = await useCase.execute({ now: NOON_ISH });
      expect(result.generated.some((i) => i.record.triggerRuleId === 'missed-goal-no-restart')).toBe(false);
    });
  });

  describe('library-no-timer and scheduled-task-not-started rules', () => {
    it('fires library-no-timer for a recent unresolved signal (発火)', async () => {
      await signalRepo.save(
        DistractionSignal.create({
          id: 's-15',
          record: {
            occurredAt: minutesAgo(NOON_ISH, 30),
            kind: 'NoTimerAtLibrary',
            source: 'ARCInference',
            basis: '位置情報と学習タイマー状態から推定',
            confidence: 'medium',
          },
        }),
      );
      const result = await useCase.execute({ now: NOON_ISH });
      expect(result.generated.some((i) => i.record.triggerRuleId === 'library-no-timer')).toBe(true);
    });

    it('does not fire scheduled-task-not-started before the 15 minute grace period (猶予前は発火しない)', async () => {
      await signalRepo.save(
        DistractionSignal.create({
          id: 's-16',
          record: {
            occurredAt: minutesAgo(NOON_ISH, 10),
            kind: 'ScheduledTaskNotStarted',
            source: 'ARCInference',
            basis: 'カレンダーとの照合',
            confidence: 'medium',
          },
        }),
      );
      const result = await useCase.execute({ now: NOON_ISH });
      expect(result.generated.some((i) => i.record.triggerRuleId === 'scheduled-task-not-started')).toBe(false);
    });

    it('fires scheduled-task-not-started as Warning after 60 minutes (60分超でWarning)', async () => {
      await signalRepo.save(
        DistractionSignal.create({
          id: 's-17',
          record: {
            occurredAt: minutesAgo(NOON_ISH, 65),
            kind: 'ScheduledTaskNotStarted',
            source: 'ARCInference',
            basis: 'カレンダーとの照合',
            confidence: 'medium',
          },
        }),
      );
      const result = await useCase.execute({ now: NOON_ISH });
      const c = result.generated.find((i) => i.record.triggerRuleId === 'scheduled-task-not-started');
      expect(c?.record.intensity).toBe('Warning');
    });
  });
});
