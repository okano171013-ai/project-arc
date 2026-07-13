import { randomUUID } from 'node:crypto';
import {
  ThirdPersonEvaluation,
  type ThirdPersonEvaluationRecord,
} from '../../../domain/entities/ThirdPersonEvaluation.js';
import type { ThirdPersonEvaluationRepository } from '../../ports/ThirdPersonEvaluationRepository.js';

export interface AddThirdPersonEvaluationInput {
  record: ThirdPersonEvaluationRecord;
}

export interface AddThirdPersonEvaluationOutput {
  evaluation: ThirdPersonEvaluation;
}

export class AddThirdPersonEvaluationUseCase {
  constructor(private readonly repository: ThirdPersonEvaluationRepository) {}

  async execute(input: AddThirdPersonEvaluationInput): Promise<AddThirdPersonEvaluationOutput> {
    const evaluation = ThirdPersonEvaluation.create({ id: randomUUID(), record: input.record });
    await this.repository.save(evaluation);
    return { evaluation };
  }
}
