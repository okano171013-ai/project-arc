import { randomUUID } from 'node:crypto';
import { AgentTask, type AgentTaskRecord, type AgentTaskStatus, type AgentTaskTestResult } from '../../../domain/entities/AgentTask.js';
import type { AgentTaskRepository } from '../../ports/AgentTaskRepository.js';

export type ManageAgentTaskAction =
  | 'create'
  | 'markReady'
  | 'claim'
  | 'heartbeat'
  | 'start'
  | 'recordCommit'
  | 'submitForReview'
  | 'requestChanges'
  | 'resumeAfterChanges'
  | 'accept'
  | 'close';

export interface ManageAgentTaskInput {
  action: ManageAgentTaskAction;
  /** action: 'create'のみ必須。 */
  record?: AgentTaskRecord;
  /** action: 'create'以外は必須。 */
  id?: string;
  /** action: 'claim'|'heartbeat'のみ必須。 */
  agentId?: string;
  /** action: 'recordCommit'のみ必須。 */
  commitHash?: string;
  /** action: 'submitForReview'のみ必須。 */
  testResult?: AgentTaskTestResult;
}

export interface ManageAgentTaskOutput {
  task: AgentTask;
}

const BRANCH_ACTIVE_STATUSES: AgentTaskStatus[] = ['Claimed', 'InProgress', 'Review', 'ChangesRequested'];

/**
 * ManageAgentTaskUseCase（Version33、ADR 0061）
 *
 * Entity自身が持つ状態機械の呼び出しに加え、Entity単体では判定
 * できない「1 branch 1 writer」（同じbranchに対して同時にActiveな
 * taskは1つだけ）をここで検証する——複数taskをまたいだ整合性は
 * Repository越しにしか確認できないため。
 */
export class ManageAgentTaskUseCase {
  constructor(private readonly agentTaskRepository: AgentTaskRepository) {}

  async execute(input: ManageAgentTaskInput): Promise<ManageAgentTaskOutput> {
    if (input.action === 'create') {
      if (!input.record) {
        throw new Error("record is required for action 'create'");
      }
      const task = AgentTask.create({ id: randomUUID(), record: input.record });
      await this.agentTaskRepository.save(task);
      return { task };
    }

    if (!input.id) {
      throw new Error(`id is required for action '${input.action}'`);
    }
    const task = await this.agentTaskRepository.findById(input.id);
    if (!task) {
      throw new Error(`AgentTask not found: ${input.id}`);
    }

    switch (input.action) {
      case 'markReady':
        task.markReady();
        break;
      case 'claim': {
        if (!input.agentId) throw new Error("agentId is required for action 'claim'");
        await this.assertBranchIsFree(task);
        task.claim(input.agentId);
        break;
      }
      case 'heartbeat':
        if (!input.agentId) throw new Error("agentId is required for action 'heartbeat'");
        task.heartbeat(input.agentId);
        break;
      case 'start':
        task.start();
        break;
      case 'recordCommit':
        if (!input.commitHash) throw new Error("commitHash is required for action 'recordCommit'");
        task.recordCommit(input.commitHash);
        break;
      case 'submitForReview':
        if (!input.testResult) throw new Error("testResult is required for action 'submitForReview'");
        task.submitForReview(input.testResult);
        break;
      case 'requestChanges':
        task.requestChanges();
        break;
      case 'resumeAfterChanges':
        task.resumeAfterChanges();
        break;
      case 'accept':
        task.accept();
        break;
      case 'close':
        task.close();
        break;
    }

    await this.agentTaskRepository.save(task);
    return { task };
  }

  /**
   * 同じ`allowedScope.branch`を持つ、既にActiveな別taskが無いかを
   * 確認する（1 branch 1 writer、ADR 0061）。確認前に、同じbranchの
   * 他task（Claimed/InProgressのみ——leaseの対象）についてlease失効
   * チェックを先に走らせ、失効していれば`Ready`へ自動的に差し戻して
   * から判定する。Review/ChangesRequestedはlease対象外のため、
   * 時間経過だけでは自動解放されない——保留中のreviewはOwner/ARCの
   * 明示的な判断（accept/requestChanges/close）でしか動かない。
   */
  private async assertBranchIsFree(task: AgentTask): Promise<void> {
    const all = await this.agentTaskRepository.findAll();
    const sameBranch = all.filter(
      (other) => other.id !== task.id && other.record.allowedScope.branch === task.record.allowedScope.branch,
    );

    for (const other of sameBranch) {
      if (other.releaseIfLeaseExpired()) {
        await this.agentTaskRepository.save(other);
      }
    }

    const conflicting = sameBranch.find((other) => BRANCH_ACTIVE_STATUSES.includes(other.status));
    if (conflicting) {
      throw new Error(
        `Branch ${task.record.allowedScope.branch} is already owned by AgentTask ${conflicting.id} (status: ${conflicting.status})`,
      );
    }
  }
}
