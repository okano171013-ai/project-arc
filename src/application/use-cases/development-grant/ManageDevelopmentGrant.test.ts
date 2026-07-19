import { describe, it, expect, beforeEach } from 'vitest';
import { ManageDevelopmentGrantUseCase } from './ManageDevelopmentGrant.js';
import type { DevelopmentGrant } from '../../../domain/entities/DevelopmentGrant.js';
import type { DevelopmentGrantRepository } from '../../ports/DevelopmentGrantRepository.js';

class FakeDevelopmentGrantRepository implements DevelopmentGrantRepository {
  store = new Map<string, DevelopmentGrant>();
  async save(grant: DevelopmentGrant): Promise<void> {
    this.store.set(grant.id, grant);
  }
  async findById(id: string): Promise<DevelopmentGrant | null> {
    return this.store.get(id) ?? null;
  }
  async findAll(): Promise<DevelopmentGrant[]> {
    return [...this.store.values()];
  }
}

function baseRecord() {
  return {
    scope: { repositories: ['project-arc'], branchPrefix: 'auto/' },
    maxVersionCount: 3,
    costCeiling: 0 as const,
    reason: 'テスト',
  };
}

describe('ManageDevelopmentGrantUseCase', () => {
  let repo: FakeDevelopmentGrantRepository;
  let useCase: ManageDevelopmentGrantUseCase;

  beforeEach(() => {
    repo = new FakeDevelopmentGrantRepository();
    useCase = new ManageDevelopmentGrantUseCase(repo);
  });

  it('creates and persists a grant (作成・保存)', async () => {
    const { grant } = await useCase.execute({ action: 'create', record: baseRecord() });
    expect(grant.status).toBe('Active');
    expect(await repo.findById(grant.id)).not.toBeNull();
  });

  it('rejects create without record (record必須)', async () => {
    await expect(useCase.execute({ action: 'create' })).rejects.toThrow("record is required for action 'create'");
  });

  it('pauses/resumes/revokes an existing grant by id (状態遷移)', async () => {
    const { grant } = await useCase.execute({ action: 'create', record: baseRecord() });

    const paused = await useCase.execute({ action: 'pause', id: grant.id });
    expect(paused.grant.status).toBe('Paused');

    const resumed = await useCase.execute({ action: 'resume', id: grant.id });
    expect(resumed.grant.status).toBe('Active');

    const revoked = await useCase.execute({ action: 'revoke', id: grant.id });
    expect(revoked.grant.status).toBe('Revoked');
  });

  it('rejects resume after revoke (取消し後のresume拒否)', async () => {
    const { grant } = await useCase.execute({ action: 'create', record: baseRecord() });
    await useCase.execute({ action: 'revoke', id: grant.id });
    await expect(useCase.execute({ action: 'resume', id: grant.id })).rejects.toThrow(
      /Illegal DevelopmentGrant status transition/,
    );
  });

  it('rejects transitions on an unknown id (未知id)', async () => {
    await expect(useCase.execute({ action: 'pause', id: 'does-not-exist' })).rejects.toThrow(
      'DevelopmentGrant not found: does-not-exist',
    );
  });
});
