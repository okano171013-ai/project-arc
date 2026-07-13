import type { ThirdPersonEvaluation } from '../../domain/entities/ThirdPersonEvaluation.js';

export interface ThirdPersonEvaluationRepository {
  save(evaluation: ThirdPersonEvaluation): Promise<void>;
  findAll(): Promise<ThirdPersonEvaluation[]>;
}
