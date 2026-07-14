import { randomUUID } from 'node:crypto';
import { AgentMessage, type AgentMessageRecord } from '../../../domain/entities/AgentMessage.js';
import type { AgentMessageRepository } from '../../ports/AgentMessageRepository.js';

export interface AddAgentMessageInput {
  record: AgentMessageRecord;
}

export interface AddAgentMessageOutput {
  message: AgentMessage;
}

export class AddAgentMessageUseCase {
  constructor(private readonly agentMessageRepository: AgentMessageRepository) {}

  async execute(input: AddAgentMessageInput): Promise<AddAgentMessageOutput> {
    const message = AgentMessage.create({ id: randomUUID(), record: input.record });
    await this.agentMessageRepository.save(message);
    return { message };
  }
}
