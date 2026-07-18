import { previousDate } from '../../../shared/date.js';
import { DEFAULT_INTERVENTION_POLICY_SETTINGS } from '../../../domain/entities/InterventionPolicySettings.js';
import {
  IDEAL_LIFE_SCORE_BASELINE,
  CHECKIN_COMPLETION_BONUS_MAX,
  WARNING_INTERVENTION_PENALTY,
  CRITICAL_INTERVENTION_PENALTY,
  MIN_DAYS_FOR_7D_COMPARISON,
  MIN_DAYS_FOR_30D_COMPARISON,
} from '../../../domain/value-objects/BehaviorScoreConstants.js';
import type { InterventionPolicySettingsRecord } from '../../../domain/entities/InterventionPolicySettings.js';
import type { CheckIn } from '../../../domain/entities/CheckIn.js';
import type { Intervention } from '../../../domain/entities/Intervention.js';
import type { ReflectionRepository } from '../../ports/ReflectionRepository.js';
import type { CheckInRepository } from '../../ports/CheckInRepository.js';
import type { InterventionRepository } from '../../ports/InterventionRepository.js';
import type { InterventionPolicySettingsRepository } from '../../ports/InterventionPolicySettingsRepository.js';

export interface TrendComparison {
  readonly available: boolean;
  readonly deltaVsAverage?: number;
  readonly daysWithData?: number;
  readonly reason?: string;
}

export interface GetDailyBehaviorScoreInput {
  date: string; // YYYY-MM-DD
}

export interface GetDailyBehaviorScoreOutput {
  date: string;
  reflectionScore: number | undefined;
  checkInCompletionRate: number | undefined;
  interventionPenalty: number;
  compositeScore: number | undefined;
  idealBaseline: number;
  vsIdealBaseline: number | undefined;
  previousDayDelta: number | undefined;
  sevenDayComparison: TrendComparison;
  thirtyDayComparison: TrendComparison;
}

interface DayComputation {
  reflectionScore: number | undefined;
  checkInCompletionRate: number | undefined;
  interventionPenalty: number;
  compositeScore: number | undefined;
}

/**
 * GetDailyBehaviorScoreUseCase（Version26、行動介入レイヤー）
 *
 * 既存`Reflection.score()`は一切変更しない——この合成スコアは別途
 * 計算する派生指標であり、`reflectionScore`未定義（その日Reflection
 * 未記録）なら`compositeScore`も常にundefinedとする（0点で水増し
 * しない）。7日/30日比較は最低有効日数に満たなければ`available:
 * false`で「比較不能」を明示する（指示書「記録不足は高評価せず、
 * 比較不能を明示」「単発の好記録ではなく継続性を重視」）。
 */
export class GetDailyBehaviorScoreUseCase {
  constructor(
    private readonly reflectionRepository: ReflectionRepository,
    private readonly checkInRepository: CheckInRepository,
    private readonly interventionRepository: InterventionRepository,
    private readonly interventionPolicySettingsRepository: InterventionPolicySettingsRepository,
  ) {}

  async execute(input: GetDailyBehaviorScoreInput): Promise<GetDailyBehaviorScoreOutput> {
    const [settingsEntity, allCheckIns, allInterventions] = await Promise.all([
      this.interventionPolicySettingsRepository.find(),
      this.checkInRepository.findAll(),
      this.interventionRepository.findAll(),
    ]);
    const settings = settingsEntity?.record ?? DEFAULT_INTERVENTION_POLICY_SETTINGS;

    const today = await this.computeForDate(input.date, settings, allCheckIns, allInterventions);
    const previousDayScore = (
      await this.computeForDate(previousDate(input.date), settings, allCheckIns, allInterventions)
    ).compositeScore;
    const previousDayDelta =
      today.compositeScore !== undefined && previousDayScore !== undefined
        ? today.compositeScore - previousDayScore
        : undefined;

    const [sevenDayComparison, thirtyDayComparison] = await Promise.all([
      this.buildTrendComparison(
        input.date,
        7,
        MIN_DAYS_FOR_7D_COMPARISON,
        settings,
        today.compositeScore,
        allCheckIns,
        allInterventions,
      ),
      this.buildTrendComparison(
        input.date,
        30,
        MIN_DAYS_FOR_30D_COMPARISON,
        settings,
        today.compositeScore,
        allCheckIns,
        allInterventions,
      ),
    ]);

    return {
      date: input.date,
      reflectionScore: today.reflectionScore,
      checkInCompletionRate: today.checkInCompletionRate,
      interventionPenalty: today.interventionPenalty,
      compositeScore: today.compositeScore,
      idealBaseline: IDEAL_LIFE_SCORE_BASELINE,
      vsIdealBaseline: today.compositeScore !== undefined ? today.compositeScore - IDEAL_LIFE_SCORE_BASELINE : undefined,
      previousDayDelta,
      sevenDayComparison,
      thirtyDayComparison,
    };
  }

  private async computeForDate(
    date: string,
    settings: InterventionPolicySettingsRecord,
    allCheckIns: readonly CheckIn[],
    allInterventions: readonly Intervention[],
  ): Promise<DayComputation> {
    const reflection = await this.reflectionRepository.findByDate(date);
    const reflectionScore = reflection?.score();

    const checkIns = allCheckIns.filter((c) => c.record.occurredAt.startsWith(date));
    const activeMinutes = this.activeMinutes(settings);
    const expectedCheckIns = Math.floor(activeMinutes / settings.checkInIntervalMinutes);
    const checkInCompletionRate = expectedCheckIns > 0 ? Math.min(1, checkIns.length / expectedCheckIns) : undefined;

    const acknowledgedToday = allInterventions.filter(
      (i) => i.record.generatedAt.startsWith(date) && i.status === 'Acknowledged',
    );
    let interventionPenalty = 0;
    for (const intervention of acknowledgedToday) {
      if (intervention.record.intensity === 'Critical') interventionPenalty += CRITICAL_INTERVENTION_PENALTY;
      else if (intervention.record.intensity === 'Warning') interventionPenalty += WARNING_INTERVENTION_PENALTY;
    }

    const compositeScore =
      reflectionScore === undefined
        ? undefined
        : Math.max(
            0,
            Math.min(
              100,
              reflectionScore +
                (checkInCompletionRate !== undefined ? Math.round(checkInCompletionRate * CHECKIN_COMPLETION_BONUS_MAX) : 0) -
                interventionPenalty,
            ),
          );

    return { reflectionScore, checkInCompletionRate, interventionPenalty, compositeScore };
  }

  private activeMinutes(settings: InterventionPolicySettingsRecord): number {
    const [startHour, startMinute] = settings.activeHoursStart.split(':').map(Number);
    const [endHour, endMinute] = settings.activeHoursEnd.split(':').map(Number);
    const start = (startHour ?? 0) * 60 + (startMinute ?? 0);
    const end = (endHour ?? 0) * 60 + (endMinute ?? 0);
    return end > start ? end - start : 24 * 60 - start + end;
  }

  private async buildTrendComparison(
    date: string,
    windowDays: number,
    minDays: number,
    settings: InterventionPolicySettingsRecord,
    todayScore: number | undefined,
    allCheckIns: readonly CheckIn[],
    allInterventions: readonly Intervention[],
  ): Promise<TrendComparison> {
    const scores: number[] = [];
    let cursor = date;
    for (let i = 0; i < windowDays; i++) {
      cursor = previousDate(cursor);
      const { compositeScore } = await this.computeForDate(cursor, settings, allCheckIns, allInterventions);
      if (compositeScore !== undefined) scores.push(compositeScore);
    }
    if (scores.length < minDays || todayScore === undefined) {
      return {
        available: false,
        daysWithData: scores.length,
        reason: `insufficient data: only ${scores.length}/${windowDays} days have both Reflection and enough context`,
      };
    }
    const average = scores.reduce((a, b) => a + b, 0) / scores.length;
    return { available: true, deltaVsAverage: todayScore - average, daysWithData: scores.length };
  }
}
