import { describe, it, expect, beforeEach } from 'vitest';
import { ManageAgentTaskUseCase } from './ManageAgentTask.js';
import type { AgentTask } from '../../../domain/entities/AgentTask.js';
import type { AgentTaskRepository } from '../../ports/AgentTaskRepository.js';

class FakeAgentTaskRepository implements AgentTaskRepository {
  store = new Map<string, AgentTask>();
  async save(task: AgentTask): Promise<void> {
    this.store.set(task.id, task);
  }
  async findById(id: string): Promise<AgentTask | null> {
    return this.store.get(id) ?? null;
  }
  async findAll(): Promise<AgentTask[]> {
    return [...this.store.values()];
  }
}

function baseRecord(overrides: Partial<{ branch: string }> = {}) {
  return {
    relatedVersion: 'Version33',
    title: 'テストtask',
    acceptanceCriteria: ['pnpm testが緑'],
    relatedAdrIds: ['0061'],
    allowedScope: { repository: 'project-arc', branch: overrides.branch ?? 'auto/version33-task1' },
    developmentGrantId: 'grant-1',
  };
}

describe('ManageAgentTaskUseCase', () => {
  let repo: FakeAgentTaskRepository;
  let useCase: ManageAgentTaskUseCase;

  beforeEach(() => {
    repo = new FakeAgentTaskRepository();
    useCase = new ManageAgentTaskUseCase(repo);
  });

  it('creates and persists a task (作成・保存)', async () => {
    const { task } = await useCase.execute({ action: 'create', record: baseRecord() });
    expect(task.status).toBe('Proposed');
    expect(await repo.findById(task.id)).not.toBeNull();
  });

  it('rejects create without record (record必須)', async () => {
    await expect(useCase.execute({ action: 'create' })).rejects.toThrow("record is required for action 'create'");
  });

  it('walks the full lifecycle through the use case (通常のライフサイクル)', async () => {
    const { task } = await useCase.execute({ action: 'create', record: baseRecord() });
    await useCase.execute({ action: 'markReady', id: task.id });
    await useCase.execute({ action: 'claim', id: task.id, agentId: 'agent-1' });
    await useCase.execute({ action: 'start', id: task.id });
    await useCase.execute({ action: 'recordCommit', id: task.id, commitHash: 'abc1234' });
    const reviewed = await useCase.execute({
      action: 'submitForReview',
      id: task.id,
      testResult: { passed: true, summary: 'all green' },
    });
    expect(reviewed.task.status).toBe('Review');
    const accepted = await useCase.execute({ action: 'accept', id: task.id });
    expect(accepted.task.status).toBe('Accepted');
    const closed = await useCase.execute({ action: 'close', id: task.id });
    expect(closed.task.status).toBe('Closed');
  });

  it('rejects claim without agentId (agentId必須)', async () => {
    const { task } = await useCase.execute({ action: 'create', record: baseRecord() });
    await useCase.execute({ action: 'markReady', id: task.id });
    await expect(useCase.execute({ action: 'claim', id: task.id })).rejects.toThrow(
      "agentId is required for action 'claim'",
    );
  });

  describe('1 branch 1 writer (ADR 0061)', () => {
    it('rejects claiming a task whose branch is already owned by another active task', async () => {
      const { task: taskA } = await useCase.execute({ action: 'create', record: baseRecord({ branch: 'auto/shared' }) });
      await useCase.execute({ action: 'markReady', id: taskA.id });
      await useCase.execute({ action: 'claim', id: taskA.id, agentId: 'agent-1' });

      const { task: taskB } = await useCase.execute({ action: 'create', record: baseRecord({ branch: 'auto/shared' }) });
      await useCase.execute({ action: 'markReady', id: taskB.id });

      await expect(useCase.execute({ action: 'claim', id: taskB.id, agentId: 'agent-2' })).rejects.toThrow(
        `Branch auto/shared is already owned by AgentTask ${taskA.id} (status: Claimed)`,
      );
    });

    it('allows claiming a different branch concurrently (別branchなら競合しない)', async () => {
      const { task: taskA } = await useCase.execute({ action: 'create', record: baseRecord({ branch: 'auto/one' }) });
      await useCase.execute({ action: 'markReady', id: taskA.id });
      await useCase.execute({ action: 'claim', id: taskA.id, agentId: 'agent-1' });

      const { task: taskB } = await useCase.execute({ action: 'create', record: baseRecord({ branch: 'auto/two' }) });
      await useCase.execute({ action: 'markReady', id: taskB.id });
      const claimed = await useCase.execute({ action: 'claim', id: taskB.id, agentId: 'agent-2' });
      expect(claimed.task.status).toBe('Claimed');
    });

    it('allows claiming a branch once the previous holder\'s lease has expired (lease失効後の再claim)', async () => {
      const { task: taskA } = await useCase.execute({ action: 'create', record: baseRecord({ branch: 'auto/shared' }) });
      await useCase.execute({ action: 'markReady', id: taskA.id });
      // 極端に短いleaseですぐ失効させるため、直接Entity経由でclaimする代わりに
      // use case実行後、保存されたEntityのlease延長ロジックをbypassして
      // 疑似的に「失効済み」を作る——use caseのpublic APIにはlease長を渡す口が
      // 無いため、ここではDEFAULT_LEASE_MSより前の時刻をclaimTimeとして
      // 直接Entityを操作しrepositoryへ保存し直す。
      const stale = await repo.findById(taskA.id);
      stale!.claim('agent-1', new Date(Date.now() - 60 * 60 * 1000), 1000); // 1時間前に1秒leaseでclaim=既に失効
      await repo.save(stale!);

      const { task: taskB } = await useCase.execute({ action: 'create', record: baseRecord({ branch: 'auto/shared' }) });
      await useCase.execute({ action: 'markReady', id: taskB.id });
      const claimed = await useCase.execute({ action: 'claim', id: taskB.id, agentId: 'agent-2' });
      expect(claimed.task.status).toBe('Claimed');

      // 失効したtaskAはReadyへ差し戻されている。
      const releasedTaskA = await repo.findById(taskA.id);
      expect(releasedTaskA!.status).toBe('Ready');
    });

    it('does not release a task that is in Review even if its old lease timestamp is stale (Reviewはlease対象外)', async () => {
      const { task: taskA } = await useCase.execute({ action: 'create', record: baseRecord({ branch: 'auto/shared' }) });
      await useCase.execute({ action: 'markReady', id: taskA.id });
      const claimedA = await repo.findById(taskA.id);
      claimedA!.claim('agent-1', new Date(Date.now() - 60 * 60 * 1000), 1000);
      claimedA!.start();
      claimedA!.submitForReview({ passed: true, summary: 'ok' });
      await repo.save(claimedA!);

      const { task: taskB } = await useCase.execute({ action: 'create', record: baseRecord({ branch: 'auto/shared' }) });
      await useCase.execute({ action: 'markReady', id: taskB.id });
      await expect(useCase.execute({ action: 'claim', id: taskB.id, agentId: 'agent-2' })).rejects.toThrow(
        `Branch auto/shared is already owned by AgentTask ${taskA.id} (status: Review)`,
      );
    });
  });

  it('rejects transitions on an unknown id (未知id)', async () => {
    await expect(useCase.execute({ action: 'markReady', id: 'does-not-exist' })).rejects.toThrow(
      'AgentTask not found: does-not-exist',
    );
  });

  it('rejects transitions without id (id必須)', async () => {
    await expect(useCase.execute({ action: 'markReady' })).rejects.toThrow("id is required for action 'markReady'");
  });
});
