import type { InProgressStudySessionRepository } from '../../ports/InProgressStudySessionRepository.js';
import { RecordStudySessionUseCase, type RecordStudySessionOutput } from './RecordStudySession.js';

export interface FinishStudySessionInput {
  id: string;
  now?: Date;
}

export type FinishStudySessionOutput = RecordStudySessionOutput;

/**
 * FinishStudySessionUseCase（Version40）
 *
 * 進行中セッションを終了し、既存の`RecordStudySessionUseCase`
 * （Version27、外部Study Timerアプリと共有する正本への書き込み経路）
 * へそのまま委譲する——StudySessionの確定保存経路を2つに増やさない
 * （ADR 0039と同じ「書き込み経路を増やさない」方針）。成功後、進行中
 * セッションは削除する。
 */
export class FinishStudySessionUseCase {
  constructor(
    private readonly inProgressRepository: InProgressStudySessionRepository,
    private readonly recordStudySession: RecordStudySessionUseCase,
  ) {}

  async execute(input: FinishStudySessionInput): Promise<FinishStudySessionOutput> {
    const session = await this.inProgressRepository.findById(input.id);
    if (!session) {
      throw new Error(`InProgressStudySession not found: ${input.id}`);
    }
    const now = input.now ?? new Date();
    const startedAtMs = Date.parse(session.record.startedAt);
    const durationMs = now.getTime() - startedAtMs;
    if (durationMs <= 0) {
      throw new Error('finish time must be after startedAt');
    }

    const output = await this.recordStudySession.execute({
      record: {
        sessionId: `in-progress:${session.id}`,
        subject: session.record.subject,
        task: session.record.task,
        startedAt: session.record.startedAt,
        endedAt: now.toISOString(),
        durationMs,
        source: session.record.source,
        clientCreatedAt: now.toISOString(),
      },
      now,
    });

    await this.inProgressRepository.delete(session.id);
    return output;
  }
}
