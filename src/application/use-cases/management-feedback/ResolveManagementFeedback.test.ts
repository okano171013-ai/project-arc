import { describe, it, expect, beforeEach } from 'vitest';
import { ResolveManagementFeedbackUseCase } from './ResolveManagementFeedback.js';
import { AddManagementFeedbackUseCase } from './AddManagementFeedback.js';
import type { ManagementFeedback } from '../../../domain/entities/ManagementFeedback.js';
import type { ManagementFeedbackRepository } from '../../ports/ManagementFeedbackRepository.js';

class FakeManagementFeedbackRepository implements ManagementFeedbackRepository {
  store = new Map<string, ManagementFeedback>();
  async save(feedback: ManagementFeedback): Promise<void> {
    this.store.set(feedback.id, feedback);
  }
  async findById(id: string): Promise<ManagementFeedback | null> {
    return this.store.get(id) ?? null;
  }
  async findAll(): Promise<ManagementFeedback[]> {
    return [...this.store.values()];
  }
}

describe('ResolveManagementFeedbackUseCase', () => {
  let repo: FakeManagementFeedbackRepository;

  beforeEach(() => {
    repo = new FakeManagementFeedbackRepository();
  });

  it('transitions and persists the new resolution (遷移・保存)', async () => {
    const { feedback } = await new AddManagementFeedbackUseCase(repo).execute({
      record: { author: 'ARC', category: 'Process', content: '内容', reason: '理由' },
    });

    const useCase = new ResolveManagementFeedbackUseCase(repo);
    const result = await useCase.execute({ id: feedback.id, resolution: 'Accepted' });

    expect(result.feedback.resolution).toBe('Accepted');
    const persisted = await repo.findById(feedback.id);
    expect(persisted?.resolution).toBe('Accepted');
  });

  it('throws when the feedback does not exist (存在しないidの拒否)', async () => {
    const useCase = new ResolveManagementFeedbackUseCase(repo);
    await expect(useCase.execute({ id: 'missing', resolution: 'Accepted' })).rejects.toThrow(
      'ManagementFeedback not found: missing',
    );
  });

  it('propagates the entity error on an illegal transition (不正遷移のエラー伝播)', async () => {
    const { feedback } = await new AddManagementFeedbackUseCase(repo).execute({
      record: { author: 'ARC', category: 'Process', content: '内容', reason: '理由' },
    });

    const useCase = new ResolveManagementFeedbackUseCase(repo);
    await expect(useCase.execute({ id: feedback.id, resolution: 'Implemented' })).rejects.toThrow(
      'Illegal resolution transition: Open -> Implemented',
    );
  });
});
