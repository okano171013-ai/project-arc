import type { ManagementFeedback, ManagementFeedbackResolution } from '../../../domain/entities/ManagementFeedback.js';
import type { ManagementFeedbackRepository } from '../../ports/ManagementFeedbackRepository.js';

export interface ResolveManagementFeedbackInput {
  id: string;
  resolution: ManagementFeedbackResolution;
}

export interface ResolveManagementFeedbackOutput {
  feedback: ManagementFeedback;
}

/**
 * ResolveManagementFeedbackUseCase
 *
 * 遷移が正しいかどうかの判定は`ManagementFeedback.transitionTo()`
 * （Domain層）にすべて委ねる。このUseCaseはOwnerが指定した遷移先を
 * そのまま実行するだけで、独自の判断は行わない。
 */
export class ResolveManagementFeedbackUseCase {
  constructor(private readonly managementFeedbackRepository: ManagementFeedbackRepository) {}

  async execute(input: ResolveManagementFeedbackInput): Promise<ResolveManagementFeedbackOutput> {
    const feedback = await this.managementFeedbackRepository.findById(input.id);
    if (!feedback) {
      throw new Error(`ManagementFeedback not found: ${input.id}`);
    }
    feedback.transitionTo(input.resolution);
    await this.managementFeedbackRepository.save(feedback);
    return { feedback };
  }
}
