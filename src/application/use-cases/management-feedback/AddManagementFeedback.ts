import { randomUUID } from 'node:crypto';
import {
  ManagementFeedback,
  type ManagementFeedbackRecord,
} from '../../../domain/entities/ManagementFeedback.js';
import type { ManagementFeedbackRepository } from '../../ports/ManagementFeedbackRepository.js';

export interface AddManagementFeedbackInput {
  record: ManagementFeedbackRecord;
}

export interface AddManagementFeedbackOutput {
  feedback: ManagementFeedback;
}

export class AddManagementFeedbackUseCase {
  constructor(private readonly managementFeedbackRepository: ManagementFeedbackRepository) {}

  async execute(input: AddManagementFeedbackInput): Promise<AddManagementFeedbackOutput> {
    const feedback = ManagementFeedback.create({ id: randomUUID(), record: input.record });
    await this.managementFeedbackRepository.save(feedback);
    return { feedback };
  }
}
