import { describe, it, expect, beforeEach } from 'vitest';
import { ListManagementFeedbackUseCase } from './ListManagementFeedback.js';
import { AddManagementFeedbackUseCase } from './AddManagementFeedback.js';
import { ResolveManagementFeedbackUseCase } from './ResolveManagementFeedback.js';
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

describe('ListManagementFeedbackUseCase', () => {
  let repo: FakeManagementFeedbackRepository;

  beforeEach(() => {
    repo = new FakeManagementFeedbackRepository();
  });

  it('lists newest-first and filters by resolution (新しい順・resolutionフィルタ)', async () => {
    const add = new AddManagementFeedbackUseCase(repo);
    const resolve = new ResolveManagementFeedbackUseCase(repo);

    const { feedback: first } = await add.execute({
      record: { author: 'ARC', category: 'Process', content: '1件目', reason: '理由' },
    });
    await new Promise((r) => setTimeout(r, 2));
    await add.execute({
      record: { author: 'ARC', category: 'Priority', content: '2件目', reason: '理由' },
    });
    await resolve.execute({ id: first.id, resolution: 'Accepted' });

    const list = new ListManagementFeedbackUseCase(repo);
    const all = await list.execute();
    expect(all.feedback.map((f) => f.record.content)).toEqual(['2件目', '1件目']);

    const openOnly = await list.execute({ resolution: 'Open' });
    expect(openOnly.feedback).toHaveLength(1);
    expect(openOnly.feedback[0]?.record.content).toBe('2件目');
  });
});
