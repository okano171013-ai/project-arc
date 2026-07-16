import { randomUUID } from 'node:crypto';
import { AgentDelegationGrant, type AgentDelegationGrantRecord } from '../../../domain/entities/AgentDelegationGrant.js';
import type { AgentDelegationGrantRepository } from '../../ports/AgentDelegationGrantRepository.js';

export type ManageAgentDelegationGrantAction = 'create' | 'pause' | 'resume' | 'revoke';

export interface ManageAgentDelegationGrantInput {
  action: ManageAgentDelegationGrantAction;
  /** action: 'create'のみ必須。 */
  record?: AgentDelegationGrantRecord;
  /** action: 'pause'|'resume'|'revoke'のみ必須。 */
  id?: string;
}

export interface ManageAgentDelegationGrantOutput {
  grant: AgentDelegationGrant;
}

/**
 * ManageAgentDelegationGrantUseCase（Version24、Constitution第4条限定改定）
 *
 * Grantのcreate/pause/resume/revokeを1つのUseCaseに集約する——
 * ADR 0039の「書き込み経路を増やさない」方針を踏襲し、新しいMCP
 * Toolを追加せず既存の`proposal_create`/`approve`
 * （type: 'AgentDelegationGrant'）だけで完結させるための設計。
 *
 * このUseCase自体は「委譲すべきかどうか」を判断しない——action・
 * recordの構造検証と、`AgentDelegationGrant`エンティティの状態機械
 * （`resume()`がRevokedから呼べない等）をそのまま呼び出すだけ
 * （Constitution第2条）。
 */
export class ManageAgentDelegationGrantUseCase {
  constructor(private readonly agentDelegationGrantRepository: AgentDelegationGrantRepository) {}

  async execute(input: ManageAgentDelegationGrantInput): Promise<ManageAgentDelegationGrantOutput> {
    if (input.action === 'create') {
      if (!input.record) {
        throw new Error("record is required for action 'create'");
      }
      const grant = AgentDelegationGrant.create({ id: randomUUID(), record: input.record });
      await this.agentDelegationGrantRepository.save(grant);
      return { grant };
    }

    if (!input.id) {
      throw new Error(`id is required for action '${input.action}'`);
    }
    const grant = await this.agentDelegationGrantRepository.findById(input.id);
    if (!grant) {
      throw new Error(`AgentDelegationGrant not found: ${input.id}`);
    }

    if (input.action === 'pause') grant.pause();
    else if (input.action === 'resume') grant.resume();
    else grant.revoke();

    await this.agentDelegationGrantRepository.save(grant);
    return { grant };
  }
}
