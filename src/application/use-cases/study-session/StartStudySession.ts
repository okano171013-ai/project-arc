import { randomUUID } from 'node:crypto';
import { InProgressStudySession } from '../../../domain/entities/InProgressStudySession.js';
import type { InProgressStudySessionRepository } from '../../ports/InProgressStudySessionRepository.js';

export interface StartStudySessionInput {
  subject: string;
  task?: string;
  source: string;
  now?: Date;
}

export interface StartStudySessionOutput {
  session: InProgressStudySession;
}

/**
 * StartStudySessionUseCase（Version40）
 *
 * 対話（ChatGPT/Claude Code）から「今から勉強する」を記録する。
 * 完了した記録ではないため既存の`StudySession`（正本）へは書かず、
 * `InProgressStudySession`という別の一時的な状態として保持する。
 */
export class StartStudySessionUseCase {
  constructor(private readonly repository: InProgressStudySessionRepository) {}

  async execute(input: StartStudySessionInput): Promise<StartStudySessionOutput> {
    const session = InProgressStudySession.create({
      id: randomUUID(),
      record: {
        subject: input.subject,
        task: input.task,
        startedAt: (input.now ?? new Date()).toISOString(),
        source: input.source,
      },
    });
    await this.repository.save(session);
    return { session };
  }
}
