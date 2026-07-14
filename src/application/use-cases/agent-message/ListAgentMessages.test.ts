import { describe, it, expect, beforeEach } from 'vitest';
import { ListAgentMessagesUseCase } from './ListAgentMessages.js';
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

describe('ListAgentMessagesUseCase', () => {
  let repo: FakeAgentMessageRepository;

  beforeEach(() => {
    repo = new FakeAgentMessageRepository();
  });

  it('lists newest-first and filters by direction/relatedVersion (新しい順・絞り込み)', async () => {
    const add = new AddAgentMessageUseCase(repo);

    await add.execute({
      record: { direction: 'ToClaudeCode', content: '1件目', relatedVersion: 'Version17' },
    });
    await new Promise((r) => setTimeout(r, 2));
    await add.execute({
      record: { direction: 'ToARC', content: '2件目', relatedVersion: 'Version17' },
    });

    const list = new ListAgentMessagesUseCase(repo);
    const all = await list.execute();
    expect(all.messages.map((m) => m.record.content)).toEqual(['2件目', '1件目']);

    const toArcOnly = await list.execute({ direction: 'ToARC' });
    expect(toArcOnly.messages).toHaveLength(1);
    expect(toArcOnly.messages[0]?.record.content).toBe('2件目');

    const byVersion = await list.execute({ relatedVersion: 'Version17' });
    expect(byVersion.messages).toHaveLength(2);
  });
});
