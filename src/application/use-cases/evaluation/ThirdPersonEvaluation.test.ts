import { describe, it, expect, beforeEach } from 'vitest';
import { AddThirdPersonEvaluationUseCase } from './AddThirdPersonEvaluation.js';
import { ListThirdPersonEvaluationsUseCase } from './ListThirdPersonEvaluations.js';
import type { ThirdPersonEvaluationRepository } from '../../ports/ThirdPersonEvaluationRepository.js';
import type { ThirdPersonEvaluation } from '../../../domain/entities/ThirdPersonEvaluation.js';

class FakeThirdPersonEvaluationRepository implements ThirdPersonEvaluationRepository {
  store: ThirdPersonEvaluation[] = [];
  async save(evaluation: ThirdPersonEvaluation): Promise<void> {
    this.store.push(evaluation);
  }
  async findAll(): Promise<ThirdPersonEvaluation[]> {
    return [...this.store];
  }
}

describe('ThirdPersonEvaluation use cases', () => {
  let repository: FakeThirdPersonEvaluationRepository;

  beforeEach(() => {
    repository = new FakeThirdPersonEvaluationRepository();
  });

  it('adds a new evaluation', async () => {
    const useCase = new AddThirdPersonEvaluationUseCase(repository);
    const result = await useCase.execute({
      record: {
        date: '2026-07-13',
        person: 'いとこ',
        evaluation: 'ガタイ良くなった',
        category: '体格',
      },
    });
    expect(result.evaluation.record.person).toBe('いとこ');
  });

  it('rejects an empty person', async () => {
    const useCase = new AddThirdPersonEvaluationUseCase(repository);
    await expect(
      useCase.execute({
        record: { date: '2026-07-13', person: '  ', evaluation: 'ガタイ良くなった' },
      }),
    ).rejects.toThrow(/person must not be empty/);
  });

  it('rejects an empty evaluation', async () => {
    const useCase = new AddThirdPersonEvaluationUseCase(repository);
    await expect(
      useCase.execute({
        record: { date: '2026-07-13', person: 'いとこ', evaluation: '  ' },
      }),
    ).rejects.toThrow(/evaluation must not be empty/);
  });

  it('lists evaluations sorted by date descending', async () => {
    const addUseCase = new AddThirdPersonEvaluationUseCase(repository);
    await addUseCase.execute({
      record: { date: '2026-05-01', person: 'A', evaluation: '古い' },
    });
    await addUseCase.execute({
      record: { date: '2026-07-01', person: 'B', evaluation: '新しい' },
    });

    const listUseCase = new ListThirdPersonEvaluationsUseCase(repository);
    const result = await listUseCase.execute();
    expect(result.evaluations).toHaveLength(2);
    expect(result.evaluations[0]?.record.person).toBe('B');
  });
});
