import type { AgentMessage, AgentMessageDirection } from '../../../domain/entities/AgentMessage.js';
import type { AgentMessageRepository } from '../../ports/AgentMessageRepository.js';

export interface ListAgentMessagesInput {
  direction?: AgentMessageDirection;
  relatedVersion?: string;
}

export interface ListAgentMessagesOutput {
  messages: AgentMessage[];
}

export class ListAgentMessagesUseCase {
  constructor(private readonly agentMessageRepository: AgentMessageRepository) {}

  async execute(input: ListAgentMessagesInput = {}): Promise<ListAgentMessagesOutput> {
    const all = await this.agentMessageRepository.findAll();
    const filtered = all
      .filter((m) => !input.direction || m.record.direction === input.direction)
      .filter((m) => !input.relatedVersion || m.record.relatedVersion === input.relatedVersion);
    const sorted = [...filtered].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return { messages: sorted };
  }
}
