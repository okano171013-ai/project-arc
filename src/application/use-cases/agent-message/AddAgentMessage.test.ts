import { describe, it, expect, beforeEach } from 'vitest';
import { AddAgentMessageUseCase } from './AddAgentMessage.js';
import type { AgentMessage } from '../../../domain/entities/AgentMessage.js';
import type { AgentMessageRepository } from '../../ports/AgentMessageRepository.js';

class FakeAgentMessageRepository implements AgentMessageRepository {
  store = new Map<string, AgentMessage>();
  async save(message: AgentMessage): Promise<void> {
    this.store.set(message.id, message);
  }
  async findById(id: string): Promise<AgentMessage | null> {
    return this.store.get(id) ?? null;
  }
  async findAll(): Promise<AgentMessage[]> {
    return [...this.store.values()];
  }
}

describe('AddAgentMessageUseCase', () => {
  let repo: FakeAgentMessageRepository;

  beforeEach(() => {
    repo = new FakeAgentMessageRepository();
  });

  it('creates and persists a message (作成・保存)', async () => {
    const useCase = new AddAgentMessageUseCase(repo);
    const { message } = await useCase.execute({
      record: { direction: 'ToClaudeCode', content: '指示書です' },
    });

    expect(await repo.findById(message.id)).not.toBeNull();
  });
});
