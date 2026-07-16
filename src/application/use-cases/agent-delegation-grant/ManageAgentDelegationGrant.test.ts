import { describe, it, expect, beforeEach } from 'vitest';
import { ManageAgentDelegationGrantUseCase } from './ManageAgentDelegationGrant.js';
import type { AgentDelegationGrant } from '../../../domain/entities/AgentDelegationGrant.js';
import type { AgentDelegationGrantRepository } from '../../ports/AgentDelegationGrantRepository.js';

class FakeAgentDelegationGrantRepository implements AgentDelegationGrantRepository {
  store = new Map<string, AgentDelegationGrant>();
  async save(grant: AgentDelegationGrant): Promise<void> {
    this.store.set(grant.id, grant);
  }
  async findById(id: string): Promise<AgentDelegationGrant | null> {
    return this.store.get(id) ?? null;
  }
  async findAll(): Promise<AgentDelegationGrant[]> {
    return [...this.store.values()];
  }
}

function futureIso(): string {
  return new Date(Date.now() + 60 * 60 * 1000).toISOString();
}

describe('ManageAgentDelegationGrantUseCase', () => {
  let repo: FakeAgentDelegationGrantRepository;
  let useCase: ManageAgentDelegationGrantUseCase;

  beforeEach(() => {
    repo = new FakeAgentDelegationGrantRepository();
    useCase = new ManageAgentDelegationGrantUseCase(repo);
  });

  it('creates and persists a grant (作成・保存)', async () => {
    const { grant } = await useCase.execute({
      action: 'create',
      record: { scope: ['Reflection'], expiresAt: futureIso(), usageLimit: 10, reason: 'テスト' },
    });
    expect(grant.status).toBe('Active');
    expect(await repo.findById(grant.id)).not.toBeNull();
  });

  it('rejects create without record (record必須)', async () => {
    await expect(useCase.execute({ action: 'create' })).rejects.toThrow("record is required for action 'create'");
  });

  it('pauses/resumes/revokes an existing grant by id (状態遷移)', async () => {
    const { grant } = await useCase.execute({
      action: 'create',
      record: { scope: ['Reflection'], expiresAt: futureIso(), usageLimit: 10, reason: 'テスト' },
    });

    const paused = await useCase.execute({ action: 'pause', id: grant.id });
    expect(paused.grant.status).toBe('Paused');

    const resumed = await useCase.execute({ action: 'resume', id: grant.id });
    expect(resumed.grant.status).toBe('Active');

    const revoked = await useCase.execute({ action: 'revoke', id: grant.id });
    expect(revoked.grant.status).toBe('Revoked');
  });

  it('rejects resume after revoke (取消し後のresume拒否)', async () => {
    const { grant } = await useCase.execute({
      action: 'create',
      record: { scope: ['Reflection'], expiresAt: futureIso(), usageLimit: 10, reason: 'テスト' },
    });
    await useCase.execute({ action: 'revoke', id: grant.id });
    await expect(useCase.execute({ action: 'resume', id: grant.id })).rejects.toThrow(
      /Illegal AgentDelegationGrant status transition/,
    );
  });

  it('rejects transitions without id (id必須)', async () => {
    await expect(useCase.execute({ action: 'pause' })).rejects.toThrow("id is required for action 'pause'");
  });

  it('rejects transitions on an unknown id (未知id)', async () => {
    await expect(useCase.execute({ action: 'pause', id: 'does-not-exist' })).rejects.toThrow(
      'AgentDelegationGrant not found: does-not-exist',
    );
  });
});
