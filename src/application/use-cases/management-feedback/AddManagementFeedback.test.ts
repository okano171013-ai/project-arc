import { describe, it, expect, beforeEach } from 'vitest';
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

describe('AddManagementFeedbackUseCase', () => {
  let repo: FakeManagementFeedbackRepository;

  beforeEach(() => {
    repo = new FakeManagementFeedbackRepository();
  });

  it('creates and persists a feedback in Open resolution (作成・保存)', async () => {
    const useCase = new AddManagementFeedbackUseCase(repo);
    const { feedback } = await useCase.execute({
      record: { author: 'ARC', category: 'Process', content: '内容', reason: '理由' },
    });

    expect(feedback.resolution).toBe('Open');
    expect(await repo.findById(feedback.id)).not.toBeNull();
  });
});
