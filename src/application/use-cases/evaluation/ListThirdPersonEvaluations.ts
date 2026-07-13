import type { ThirdPersonEvaluation } from '../../../domain/entities/ThirdPersonEvaluation.js';
import type { ThirdPersonEvaluationRepository } from '../../ports/ThirdPersonEvaluationRepository.js';

export interface ListThirdPersonEvaluationsOutput {
  evaluations: ThirdPersonEvaluation[];
}

export class ListThirdPersonEvaluationsUseCase {
  constructor(private readonly repository: ThirdPersonEvaluationRepository) {}

  async execute(): Promise<ListThirdPersonEvaluationsOutput> {
    const evaluations = await this.repository.findAll();
    const sorted = [...evaluations].sort((a, b) => b.date.localeCompare(a.date));
    return { evaluations: sorted };
  }
}
