import type { StudySessionRepository } from '../../ports/StudySessionRepository.js';

export interface SummarizeStudySessionsInput {
  from: string; // ISO8601
  to: string; // ISO8601、排他的上限（[from, to)）
}

export interface SummarizeStudySessionsOutput {
  from: string;
  to: string;
  sessionCount: number;
  totalDurationMs: number;
  bySubject: Record<string, number>;
}

/**
 * SummarizeStudySessionsUseCase（Version27）
 *
 * `startedAt`が`[from, to)`に入るセッションのみを集計する派生指標——
 * 保存はしない（`nutrition_summary_by_date`、Version25と同じ設計）。
 */
export class SummarizeStudySessionsUseCase {
  constructor(private readonly studySessionRepository: StudySessionRepository) {}

  async execute(input: SummarizeStudySessionsInput): Promise<SummarizeStudySessionsOutput> {
    const fromMs = Date.parse(input.from);
    const toMs = Date.parse(input.to);
    if (Number.isNaN(fromMs)) throw new Error('from must be a valid ISO8601 date');
    if (Number.isNaN(toMs)) throw new Error('to must be a valid ISO8601 date');
    if (toMs <= fromMs) throw new Error('to must be after from');

    const all = await this.studySessionRepository.findAll();
    const inRange = all.filter((s) => {
      const startedAtMs = Date.parse(s.record.startedAt);
      return startedAtMs >= fromMs && startedAtMs < toMs;
    });

    const bySubject: Record<string, number> = {};
    let totalDurationMs = 0;
    for (const session of inRange) {
      totalDurationMs += session.record.durationMs;
      bySubject[session.record.subject] = (bySubject[session.record.subject] ?? 0) + session.record.durationMs;
    }

    return { from: input.from, to: input.to, sessionCount: inRange.length, totalDurationMs, bySubject };
  }
}
