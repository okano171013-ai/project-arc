import { describe, it, expect, beforeEach } from 'vitest';
import { StartStudySessionUseCase } from './StartStudySession.js';
import { UpdateStudySessionUseCase } from './UpdateStudySession.js';
import { FinishStudySessionUseCase } from './FinishStudySession.js';
import { ListStudySessionsUseCase } from './ListStudySessions.js';
import { RecordStudySessionUseCase } from './RecordStudySession.js';
import type { InProgressStudySessionRepository } from '../../ports/InProgressStudySessionRepository.js';
import type { StudySessionRepository } from '../../ports/StudySessionRepository.js';
import type { InProgressStudySession } from '../../../domain/entities/InProgressStudySession.js';
import type { StudySession } from '../../../domain/entities/StudySession.js';

class FakeInProgressStudySessionRepository implements InProgressStudySessionRepository {
  store: InProgressStudySession[] = [];
  async save(session: InProgressStudySession): Promise<void> {
    this.store = [...this.store.filter((s) => s.id !== session.id), session];
  }
  async findById(id: string): Promise<InProgressStudySession | null> {
    return this.store.find((s) => s.id === id) ?? null;
  }
  async findAll(): Promise<InProgressStudySession[]> {
    return [...this.store];
  }
  async delete(id: string): Promise<void> {
    this.store = this.store.filter((s) => s.id !== id);
  }
}

class FakeStudySessionRepository implements StudySessionRepository {
  store: StudySession[] = [];
  async save(session: StudySession): Promise<void> {
    this.store.push(session);
  }
  async findAll(): Promise<StudySession[]> {
    return [...this.store];
  }
}

describe('StudySession lifecycle (Version40, Owner指示 ba6548bc-... 項目2)', () => {
  let inProgressRepo: FakeInProgressStudySessionRepository;
  let studySessionRepo: FakeStudySessionRepository;
  let start: StartStudySessionUseCase;
  let update: UpdateStudySessionUseCase;
  let finish: FinishStudySessionUseCase;
  let list: ListStudySessionsUseCase;

  beforeEach(() => {
    inProgressRepo = new FakeInProgressStudySessionRepository();
    studySessionRepo = new FakeStudySessionRepository();
    start = new StartStudySessionUseCase(inProgressRepo);
    update = new UpdateStudySessionUseCase(inProgressRepo);
    finish = new FinishStudySessionUseCase(inProgressRepo, new RecordStudySessionUseCase(studySessionRepo));
    list = new ListStudySessionsUseCase(studySessionRepo, inProgressRepo);
  });

  it('start creates an InProgress session not yet in the canonical StudySession store', async () => {
    const now = new Date('2026-07-20T10:00:00.000Z');
    const { session } = await start.execute({ subject: '刑訴法', task: '判例百選', source: 'mcp', now });
    expect(session.record.subject).toBe('刑訴法');
    expect(studySessionRepo.store).toHaveLength(0);

    const { sessions } = await list.execute({ limit: 10 });
    expect(sessions).toEqual([
      { id: session.id, status: 'InProgress', subject: '刑訴法', task: '判例百選', startedAt: now.toISOString() },
    ]);
  });

  it('update patches subject/task of an InProgress session', async () => {
    const { session } = await start.execute({ subject: '刑訴法', source: 'mcp' });
    const { session: updated } = await update.execute({ id: session.id, task: '判例百選 第10版' });
    expect(updated.record.task).toBe('判例百選 第10版');
  });

  it('update throws for an unknown id', async () => {
    await expect(update.execute({ id: 'missing', subject: 'x' })).rejects.toThrow('InProgressStudySession not found');
  });

  it('finish moves the session into the canonical StudySession store and removes it from InProgress', async () => {
    const startedAt = new Date('2026-07-20T10:00:00.000Z');
    const finishedAt = new Date('2026-07-20T11:00:00.000Z');
    const { session } = await start.execute({ subject: '刑訴法', task: '判例百選', source: 'mcp', now: startedAt });

    const { session: finished, duplicate } = await finish.execute({ id: session.id, now: finishedAt });

    expect(duplicate).toBe(false);
    expect(finished.record.durationMs).toBe(60 * 60 * 1000);
    expect(studySessionRepo.store).toHaveLength(1);
    expect(await inProgressRepo.findById(session.id)).toBeNull();

    const { sessions } = await list.execute({ limit: 10 });
    expect(sessions).toEqual([
      {
        id: finished.id,
        status: 'Completed',
        subject: '刑訴法',
        task: '判例百選',
        startedAt: startedAt.toISOString(),
        endedAt: finishedAt.toISOString(),
        durationMs: 60 * 60 * 1000,
      },
    ]);
  });

  it('finish throws for an unknown id', async () => {
    await expect(finish.execute({ id: 'missing' })).rejects.toThrow('InProgressStudySession not found');
  });

  it('finish rejects a finish time at or before startedAt', async () => {
    const startedAt = new Date('2026-07-20T10:00:00.000Z');
    const { session } = await start.execute({ subject: '刑訴法', source: 'mcp', now: startedAt });
    await expect(finish.execute({ id: session.id, now: startedAt })).rejects.toThrow(
      'finish time must be after startedAt',
    );
  });

  it('list_studySessions never reports 0 minutes just because Timeline is empty — it reads StudySession directly (Owner指示)', async () => {
    const startedAt = new Date('2026-07-20T10:00:00.000Z');
    const finishedAt = new Date('2026-07-20T10:30:00.000Z');
    const { session } = await start.execute({ subject: '民法', source: 'mcp', now: startedAt });
    await finish.execute({ id: session.id, now: finishedAt });

    // Timelineには一切触れていない——StudySessionのみを正本として集計する
    // という設計そのものを、Timeline依存を持たないことで検証する。
    const { sessions } = await list.execute({ limit: 10, date: '2026-07-20' });
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.durationMs).toBe(30 * 60 * 1000);
  });
});
