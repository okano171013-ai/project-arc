import type { Intervention, InterventionIntensity } from '../../../domain/entities/Intervention.js';
import type { InterventionRepository } from '../../ports/InterventionRepository.js';

export interface MeasureInterventionEffectivenessInput {
  from: string; // ISO8601、generatedAtの範囲下限（含む）
  to: string; // ISO8601、generatedAtの範囲上限（含む）
}

export interface IntensityBreakdown {
  generated: number;
  acknowledged: number;
  dismissed: number;
}

export interface MeasureInterventionEffectivenessOutput {
  totalGenerated: number;
  acknowledgedCount: number;
  dismissedCount: number;
  snoozedCount: number;
  pendingCount: number;
  /** totalGenerated===0ならundefined（0件で割らない、比較不能を明示）。 */
  dismissRate: number | undefined;
  snoozeRate: number | undefined;
  /** AcknowledgedかつresumedActivityAtが記録されている介入の平均再開分数。対象がなければundefined。 */
  avgResumeMinutes: number | undefined;
  byIntensity: Record<InterventionIntensity, IntensityBreakdown>;
}

/**
 * MeasureInterventionEffectivenessUseCase（Version26、行動介入レイヤー）
 *
 * 保存済みInterventionの応答結果を集計するだけの純粋な計算——実際の
 * 効果測定値は、Ownerの実運用データが蓄積して初めて意味を持つ
 * （本Versionでは合成データでのテストのみ、`docs/reports/
 * Version26_Report.md`参照）。
 */
export class MeasureInterventionEffectivenessUseCase {
  constructor(private readonly interventionRepository: InterventionRepository) {}

  async execute(input: MeasureInterventionEffectivenessInput): Promise<MeasureInterventionEffectivenessOutput> {
    const from = Date.parse(input.from);
    const to = Date.parse(input.to);
    const all = await this.interventionRepository.findAll();
    const inRange = all.filter((i) => {
      const t = Date.parse(i.record.generatedAt);
      return t >= from && t <= to;
    });

    const byIntensity: Record<InterventionIntensity, IntensityBreakdown> = {
      Notice: { generated: 0, acknowledged: 0, dismissed: 0 },
      Warning: { generated: 0, acknowledged: 0, dismissed: 0 },
      Critical: { generated: 0, acknowledged: 0, dismissed: 0 },
    };

    let acknowledgedCount = 0;
    let dismissedCount = 0;
    let snoozedCount = 0;
    let pendingCount = 0;
    const resumeMinutes: number[] = [];

    for (const intervention of inRange) {
      const bucket = byIntensity[intervention.record.intensity];
      bucket.generated += 1;
      if (intervention.status === 'Acknowledged') {
        acknowledgedCount += 1;
        bucket.acknowledged += 1;
        const minutes = this.resumeMinutesFor(intervention);
        if (minutes !== undefined) resumeMinutes.push(minutes);
      } else if (intervention.status === 'Dismissed') {
        dismissedCount += 1;
        bucket.dismissed += 1;
      } else if (intervention.status === 'Snoozed') {
        snoozedCount += 1;
      } else {
        pendingCount += 1;
      }
    }

    const total = inRange.length;
    return {
      totalGenerated: total,
      acknowledgedCount,
      dismissedCount,
      snoozedCount,
      pendingCount,
      dismissRate: total > 0 ? dismissedCount / total : undefined,
      snoozeRate: total > 0 ? snoozedCount / total : undefined,
      avgResumeMinutes:
        resumeMinutes.length > 0 ? resumeMinutes.reduce((a, b) => a + b, 0) / resumeMinutes.length : undefined,
      byIntensity,
    };
  }

  private resumeMinutesFor(intervention: Intervention): number | undefined {
    const resumedActivityAt = intervention.resumedActivityAt;
    if (!resumedActivityAt) return undefined;
    const generated = Date.parse(intervention.record.generatedAt);
    const resumed = Date.parse(resumedActivityAt);
    if (Number.isNaN(generated) || Number.isNaN(resumed)) return undefined;
    return (resumed - generated) / 60000;
  }
}
