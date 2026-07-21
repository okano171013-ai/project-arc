import type { InProgressStudySession } from '../../../domain/entities/InProgressStudySession.js';
import type { InProgressStudySessionRepository } from '../../ports/InProgressStudySessionRepository.js';

export interface UpdateStudySessionInput {
  id: string;
  subject?: string;
  task?: string;
}

export interface UpdateStudySessionOutput {
  session: InProgressStudySession;
}

/**
 * UpdateStudySessionUseCase（Version40）
 *
 * 進行中セッションの科目・タスクを訂正する。開始・終了時刻は
 * 対象外——時刻の訂正が必要な場合はfinish後に既存のStudySession
 * 訂正手段（未実装、Version24/25から持ち越し中の既知の技術的負債）に
 * 委ねる。
 */
export class UpdateStudySessionUseCase {
  constructor(private readonly repository: InProgressStudySessionRepository) {}

  async execute(input: UpdateStudySessionInput): Promise<UpdateStudySessionOutput> {
    const session = await this.repository.findById(input.id);
    if (!session) {
      throw new Error(`InProgressStudySession not found: ${input.id}`);
    }
    session.update({ subject: input.subject, task: input.task });
    await this.repository.save(session);
    return { session };
  }
}
