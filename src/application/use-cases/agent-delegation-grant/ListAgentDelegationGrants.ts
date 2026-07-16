import type { AgentDelegationGrant, AgentDelegationGrantStatus } from '../../../domain/entities/AgentDelegationGrant.js';
import type { AgentDelegationGrantRepository } from '../../ports/AgentDelegationGrantRepository.js';

export interface ListAgentDelegationGrantsInput {
  status?: AgentDelegationGrantStatus;
}

export interface ListAgentDelegationGrantsOutput {
  grants: AgentDelegationGrant[];
}

export class ListAgentDelegationGrantsUseCase {
  constructor(private readonly agentDelegationGrantRepository: AgentDelegationGrantRepository) {}

  async execute(input: ListAgentDelegationGrantsInput = {}): Promise<ListAgentDelegationGrantsOutput> {
    const all = await this.agentDelegationGrantRepository.findAll();
    const filtered = all.filter((g) => !input.status || g.status === input.status);
    const sorted = [...filtered].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return { grants: sorted };
  }
}
