import { randomUUID } from 'node:crypto';
import { Intervention, type InterventionIntensity } from '../../../domain/entities/Intervention.js';
import type { CheckIn } from '../../../domain/entities/CheckIn.js';
import type { DistractionSignal } from '../../../domain/entities/DistractionSignal.js';
import {
  DEFAULT_INTERVENTION_POLICY_SETTINGS,
  type InterventionPolicySettingsRecord,
} from '../../../domain/entities/InterventionPolicySettings.js';
import type { CheckInRepository } from '../../ports/CheckInRepository.js';
import type { DistractionSignalRepository } from '../../ports/DistractionSignalRepository.js';
import type { InterventionRepository } from '../../ports/InterventionRepository.js';
import type { InterventionPolicySettingsRepository } from '../../ports/InterventionPolicySettingsRepository.js';

/**
 * GenerateInterventionsUseCase（Version26、行動介入レイヤー）
 *
 * 決定的ルールエンジン。CheckIn/DistractionSignalの構造化フィールド
 * （confidence・kind・occurredAt等）への閾値・日時比較のみを行い、
 * 自由記述（basis/notes等）は一切読まない——ADR 0048の型固定ルール
 * 前例と同じ理由でConstitution第2条に抵触しない（詳細はADR 0053）。
 *
 * ネットワーク越しに呼べるMCP Tool/HTTP Routeは意図的に用意しない
 * ——`checkInPrompter.ts`（ローカルスケジューラ）のみがこのUseCaseを
 * 直接importして呼ぶ。Remote MCPは現状無認証のままであり、新しい
 * 書き込み可能エンドポイントを追加しないため（ADR 0053参照）。
 */

const CONFIDENCE_RANK: Record<'low' | 'medium' | 'high', number> = { low: 0, medium: 1, high: 2 };

function confidenceAtLeast(value: 'low' | 'medium' | 'high', threshold: 'low' | 'medium' | 'high'): boolean {
  return CONFIDENCE_RANK[value] >= CONFIDENCE_RANK[threshold];
}

function mostRecent<T extends { record: { occurredAt: string } }>(items: T[]): T | undefined {
  return [...items].sort((a, b) => Date.parse(b.record.occurredAt) - Date.parse(a.record.occurredAt))[0];
}

function localHHMM(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** start > end のときは日跨ぎレンジ（例：23:00〜07:00）として扱う。 */
function isWithinDailyRange(hhmm: string, start: string, end: string): boolean {
  if (start <= end) {
    return hhmm >= start && hhmm < end;
  }
  return hhmm >= start || hhmm < end;
}

function startOfActiveHoursToday(now: Date, settings: InterventionPolicySettingsRecord): Date {
  const [h, m] = settings.activeHoursStart.split(':').map(Number);
  const start = new Date(now);
  start.setHours(h ?? 0, m ?? 0, 0, 0);
  return start;
}

function isSameLocalDate(isoString: string, reference: Date): boolean {
  const d = new Date(isoString);
  return (
    d.getFullYear() === reference.getFullYear() &&
    d.getMonth() === reference.getMonth() &&
    d.getDate() === reference.getDate()
  );
}

function isWithinWindow(isoString: string, startMs: number, endMs: number): boolean {
  const t = Date.parse(isoString);
  return t >= startMs && t <= endMs;
}

/** signalTime以降にCheckInまたは別のDistractionSignalが記録されていれば、状況は既に更新済みとみなす。 */
function hasNewerActivitySince(
  sinceMs: number,
  excludeSignalId: string,
  checkIns: CheckIn[],
  signals: DistractionSignal[],
): boolean {
  return (
    checkIns.some((c) => Date.parse(c.record.occurredAt) > sinceMs) ||
    signals.some((s) => s.id !== excludeSignalId && Date.parse(s.record.occurredAt) > sinceMs)
  );
}

interface RuleCandidate {
  ruleId: string;
  intensity: InterventionIntensity;
  message: string;
  relatedCheckInIds?: string[];
  relatedDistractionSignalIds?: string[];
}

const MESSAGE_TEMPLATES: Record<string, (params: Record<string, string | number>) => string> = {
  'overdue-checkin': (p) =>
    `チェックイン未実施のまま${p.overdueMinutes}分経過しています。現在の行動と次の2時間の成果を記録してください。`,
  'distraction-cluster': (p) =>
    `直近60分で逃避候補シグナルが${p.count}件検知されました。チェックインして状況を記録してください。`,
  'missed-goal-no-restart': (p) =>
    `前回の目標未達に対する再開予定時刻（${p.resumeAt}）を過ぎていますが、再開が確認できていません。`,
  'library-no-timer': (p) => `図書館にいる状態で学習タイマーが未起動のまま${p.sinceMinutes}分経過しています。`,
  'scheduled-task-not-started': (p) =>
    `予定タスクの開始予定から${p.gracePassedMinutes}分経過していますが、開始が確認できていません。`,
};

export interface GenerateInterventionsInput {
  now?: Date;
}

export interface GenerateInterventionsOutput {
  generated: Intervention[];
}

export class GenerateInterventionsUseCase {
  constructor(
    private readonly checkInRepository: CheckInRepository,
    private readonly distractionSignalRepository: DistractionSignalRepository,
    private readonly interventionRepository: InterventionRepository,
    private readonly interventionPolicySettingsRepository: InterventionPolicySettingsRepository,
  ) {}

  async execute(input: GenerateInterventionsInput = {}): Promise<GenerateInterventionsOutput> {
    const now = input.now ?? new Date();
    const [settingsEntity, allInterventions] = await Promise.all([
      this.interventionPolicySettingsRepository.find(),
      this.interventionRepository.findAll(),
    ]);
    const settings = settingsEntity?.record ?? DEFAULT_INTERVENTION_POLICY_SETTINGS;

    for (const intervention of allInterventions) {
      if (intervention.status === 'Snoozed') {
        intervention.wakeIfDue(now);
        await this.interventionRepository.save(intervention);
      }
    }

    if (this.isInExclusionWindow(now, settings) || this.isInQuietHours(now, settings)) {
      return { generated: [] };
    }

    const todayCount = allInterventions.filter((i) => isSameLocalDate(i.record.generatedAt, now)).length;
    if (todayCount >= settings.dailyNotificationLimit) {
      return { generated: [] };
    }

    const [checkIns, signals] = await Promise.all([
      this.checkInRepository.findAll(),
      this.distractionSignalRepository.findAll(),
    ]);

    const candidates = [
      this.evaluateOverdueCheckIn(now, settings, checkIns),
      this.evaluateDistractionCluster(now, settings, checkIns, signals),
      this.evaluateMissedGoalNoRestart(now, checkIns),
      this.evaluateLibraryNoTimer(now, settings, checkIns, signals),
      this.evaluateScheduledTaskNotStarted(now, checkIns, signals),
    ].filter((c): c is RuleCandidate => c !== undefined);

    const generated: Intervention[] = [];
    for (const candidate of candidates) {
      if (todayCount + generated.length >= settings.dailyNotificationLimit) break;
      if (this.isDeduped(candidate.ruleId, now, settings, allInterventions)) continue;
      if (this.isInDismissCooldown(candidate.ruleId, now, settings, allInterventions)) continue;

      const intervention = Intervention.create({
        id: randomUUID(),
        record: {
          generatedAt: now.toISOString(),
          intensity: candidate.intensity,
          triggerRuleId: candidate.ruleId,
          relatedCheckInIds: candidate.relatedCheckInIds,
          relatedDistractionSignalIds: candidate.relatedDistractionSignalIds,
          message: candidate.message,
        },
      });
      await this.interventionRepository.save(intervention);
      generated.push(intervention);
    }

    return { generated };
  }

  private isInQuietHours(now: Date, settings: InterventionPolicySettingsRecord): boolean {
    return isWithinDailyRange(localHHMM(now), settings.quietHoursStart, settings.quietHoursEnd);
  }

  private isInExclusionWindow(now: Date, settings: InterventionPolicySettingsRecord): boolean {
    return settings.exclusionWindows.some(
      (w) => now.getTime() >= Date.parse(w.start) && now.getTime() < Date.parse(w.end),
    );
  }

  private isDeduped(
    ruleId: string,
    now: Date,
    settings: InterventionPolicySettingsRecord,
    interventions: Intervention[],
  ): boolean {
    return interventions.some(
      (i) =>
        i.record.triggerRuleId === ruleId &&
        (i.status === 'Pending' || i.status === 'Snoozed') &&
        now.getTime() - Date.parse(i.record.generatedAt) < settings.dedupWindowMinutes * 60 * 1000,
    );
  }

  private isInDismissCooldown(
    ruleId: string,
    now: Date,
    settings: InterventionPolicySettingsRecord,
    interventions: Intervention[],
  ): boolean {
    const dismissed = interventions
      .filter((i) => i.record.triggerRuleId === ruleId && i.status === 'Dismissed' && i.respondedAt)
      .sort((a, b) => (b.respondedAt?.getTime() ?? 0) - (a.respondedAt?.getTime() ?? 0))[0];
    if (!dismissed?.respondedAt) return false;
    return now.getTime() - dismissed.respondedAt.getTime() < settings.dismissCooldownHours * 60 * 60 * 1000;
  }

  private evaluateOverdueCheckIn(
    now: Date,
    settings: InterventionPolicySettingsRecord,
    checkIns: CheckIn[],
  ): RuleCandidate | undefined {
    const latest = mostRecent(checkIns);
    const referenceTime = latest ? Date.parse(latest.record.occurredAt) : startOfActiveHoursToday(now, settings).getTime();
    const overdueMinutes = Math.floor((now.getTime() - referenceTime) / 60000);
    if (overdueMinutes < settings.checkInIntervalMinutes + 10) return undefined;
    const intensity: InterventionIntensity = overdueMinutes >= settings.checkInIntervalMinutes * 2 ? 'Warning' : 'Notice';
    return {
      ruleId: 'overdue-checkin',
      intensity,
      message: MESSAGE_TEMPLATES['overdue-checkin']!({ overdueMinutes }),
      relatedCheckInIds: latest ? [latest.id] : undefined,
    };
  }

  private evaluateDistractionCluster(
    now: Date,
    settings: InterventionPolicySettingsRecord,
    checkIns: CheckIn[],
    signals: DistractionSignal[],
  ): RuleCandidate | undefined {
    const windowStart = now.getTime() - 60 * 60 * 1000;
    const windowSignals = signals.filter(
      (s) =>
        isWithinWindow(s.record.occurredAt, windowStart, now.getTime()) &&
        confidenceAtLeast(s.record.confidence, settings.minDistractionConfidenceForWarning),
    );
    const windowCheckIns = checkIns.filter((c) => isWithinWindow(c.record.occurredAt, windowStart, now.getTime()));
    if (windowSignals.length < 3 || windowCheckIns.length > 0) return undefined;
    const hasHigh = windowSignals.some((s) => s.record.confidence === 'high');
    const intensity: InterventionIntensity = windowSignals.length >= 5 && hasHigh ? 'Critical' : 'Warning';
    return {
      ruleId: 'distraction-cluster',
      intensity,
      message: MESSAGE_TEMPLATES['distraction-cluster']!({ count: windowSignals.length }),
      relatedDistractionSignalIds: windowSignals.map((s) => s.id),
    };
  }

  private evaluateMissedGoalNoRestart(now: Date, checkIns: CheckIn[]): RuleCandidate | undefined {
    const latest = mostRecent(checkIns);
    if (!latest) return undefined;
    const { previousGoalStatus, resumeAt } = latest.record;
    if (previousGoalStatus !== 'partial' && previousGoalStatus !== 'missed') return undefined;
    if (!resumeAt || Date.parse(resumeAt) > now.getTime()) return undefined;
    if (Date.parse(latest.record.occurredAt) > Date.parse(resumeAt)) return undefined;
    return {
      ruleId: 'missed-goal-no-restart',
      intensity: 'Warning',
      message: MESSAGE_TEMPLATES['missed-goal-no-restart']!({ resumeAt }),
      relatedCheckInIds: [latest.id],
    };
  }

  private evaluateLibraryNoTimer(
    now: Date,
    settings: InterventionPolicySettingsRecord,
    checkIns: CheckIn[],
    signals: DistractionSignal[],
  ): RuleCandidate | undefined {
    const windowStart = now.getTime() - settings.checkInIntervalMinutes * 60 * 1000;
    const candidates = signals.filter(
      (s) =>
        s.record.kind === 'NoTimerAtLibrary' &&
        confidenceAtLeast(s.record.confidence, 'medium') &&
        isWithinWindow(s.record.occurredAt, windowStart, now.getTime()),
    );
    const signal = mostRecent(candidates);
    if (!signal) return undefined;
    const signalTime = Date.parse(signal.record.occurredAt);
    if (hasNewerActivitySince(signalTime, signal.id, checkIns, signals)) return undefined;
    const sinceMinutes = Math.floor((now.getTime() - signalTime) / 60000);
    return {
      ruleId: 'library-no-timer',
      intensity: 'Notice',
      message: MESSAGE_TEMPLATES['library-no-timer']!({ sinceMinutes }),
      relatedDistractionSignalIds: [signal.id],
    };
  }

  private evaluateScheduledTaskNotStarted(
    now: Date,
    checkIns: CheckIn[],
    signals: DistractionSignal[],
  ): RuleCandidate | undefined {
    const candidates = signals.filter(
      (s) => s.record.kind === 'ScheduledTaskNotStarted' && confidenceAtLeast(s.record.confidence, 'medium'),
    );
    const signal = mostRecent(candidates);
    if (!signal) return undefined;
    const signalTime = Date.parse(signal.record.occurredAt);
    const gracePassedMinutes = Math.floor((now.getTime() - signalTime) / 60000);
    if (gracePassedMinutes < 15) return undefined;
    if (hasNewerActivitySince(signalTime, signal.id, checkIns, signals)) return undefined;
    const intensity: InterventionIntensity = gracePassedMinutes >= 60 ? 'Warning' : 'Notice';
    return {
      ruleId: 'scheduled-task-not-started',
      intensity,
      message: MESSAGE_TEMPLATES['scheduled-task-not-started']!({ gracePassedMinutes }),
      relatedDistractionSignalIds: [signal.id],
    };
  }
}
