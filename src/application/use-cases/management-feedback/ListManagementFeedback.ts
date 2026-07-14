import type { ManagementFeedback, ManagementFeedbackResolution } from '../../../domain/entities/ManagementFeedback.js';
import type { ManagementFeedbackRepository } from '../../ports/ManagementFeedbackRepository.js';

export interface ListManagementFeedbackInput {
  resolution?: ManagementFeedbackResolution;
}

export interface ListManagementFeedbackOutput {
  feedback: ManagementFeedback[];
}

export class ListManagementFeedbackUseCase {
  constructor(private readonly managementFeedbackRepository: ManagementFeedbackRepository) {}

  async execute(input: ListManagementFeedbackInput = {}): Promise<ListManagementFeedbackOutput> {
    const all = await this.managementFeedbackRepository.findAll();
    const filtered = input.resolution
      ? all.filter((f) => f.resolution === input.resolution)
      : all;
    const sorted = [...filtered].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    return { feedback: sorted };
  }
}
