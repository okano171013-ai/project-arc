import type { StudySessionRepository } from '../../ports/StudySessionRepository.js';
import type { InProgressStudySessionRepository } from '../../ports/InProgressStudySessionRepository.js';

export interface StudySessionListItem {
  id: string;
  status: 'InProgress' | 'Completed';
  subject: string;
  task?: string;
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
}

export interface ListStudySessionsInput {
  limit: number;
  date?: string; // startedAtの前方一致（例: 2026-07-20）。Completedのみに適用。
}

export interface ListStudySessionsOutput {
  sessions: StudySessionListItem[];
}

/**
 * ListStudySessionsUseCase（Version40）
 *
 * 完了済み（正本のStudySession）と進行中（InProgressStudySession）を
 * 両方まとめて一覧する——「今なにか勉強中かどうか」をChatGPT側が
 * 別々のtoolを呼ばずに一度で確認できるようにする。
 */
export class ListStudySessionsUseCase {
  constructor(
    private readonly studySessionRepository: StudySessionRepository,
    private readonly inProgressRepository: InProgressStudySessionRepository,
  ) {}

  async execute(input: ListStudySessionsInput): Promise<ListStudySessionsOutput> {
    const inProgress = await this.inProgressRepository.findAll();
    const completedAll = await this.studySessionRepository.findAll();
    const completed = input.date ? completedAll.filter((s) => s.record.startedAt.startsWith(input.date!)) : completedAll;

    const items: StudySessionListItem[] = [
      ...inProgress.map((s) => ({
        id: s.id,
        status: 'InProgress' as const,
        subject: s.record.subject,
        task: s.record.task,
        startedAt: s.record.startedAt,
      })),
      ...completed.map((s) => ({
        id: s.id,
        status: 'Completed' as const,
        subject: s.record.subject,
        task: s.record.task,
        startedAt: s.record.startedAt,
        endedAt: s.record.endedAt,
        durationMs: s.record.durationMs,
      })),
    ].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));

    return { sessions: items.slice(0, input.limit) };
  }
}
