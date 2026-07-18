import { randomUUID } from 'node:crypto';
import { StudySession, type StudySessionRecord } from '../../../domain/entities/StudySession.js';
import type { StudySessionRepository } from '../../ports/StudySessionRepository.js';

export interface RecordStudySessionInput {
  record: StudySessionRecord;
  now?: Date;
}

export interface RecordStudySessionOutput {
  session: StudySession;
  duplicate: boolean;
}

/**
 * RecordStudySessionUseCase（Version27）
 *
 * `sessionId`で冪等化する——既存のidempotencyKey方式
 * （MealLog等、Version25）と同じくUseCase層でRepository全件から
 * 重複を探す（Repository自体に一意制約は持たせない）。
 */
export class RecordStudySessionUseCase {
  constructor(private readonly studySessionRepository: StudySessionRepository) {}

  async execute(input: RecordStudySessionInput): Promise<RecordStudySessionOutput> {
    const existing = await this.studySessionRepository.findAll();
    const duplicate = existing.find((s) => s.record.sessionId === input.record.sessionId);
    if (duplicate) {
      return { session: duplicate, duplicate: true };
    }
    const session = StudySession.create({ id: randomUUID(), record: input.record, now: input.now });
    await this.studySessionRepository.save(session);
    return { session, duplicate: false };
  }
}
