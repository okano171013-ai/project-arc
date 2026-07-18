import type { Intervention, InterventionStatus } from '../../../domain/entities/Intervention.js';
import type { InterventionRepository } from '../../ports/InterventionRepository.js';

const MAX_READ_LIMIT = 100;

export interface ListInterventionsInput {
  limit: number;
  status?: InterventionStatus;
}

export interface ListInterventionsOutput {
  interventions: Intervention[];
}

export class ListInterventionsUseCase {
  constructor(private readonly interventionRepository: InterventionRepository) {}

  async execute(input: ListInterventionsInput): Promise<ListInterventionsOutput> {
    this.assertValidLimit(input.limit);
    const all = await this.interventionRepository.findAll();
    const filtered = all.filter((i) => !input.status || i.status === input.status);
    const sorted = [...filtered].sort((a, b) => b.record.generatedAt.localeCompare(a.record.generatedAt));
    return { interventions: sorted.slice(0, input.limit) };
  }

  private assertValidLimit(limit: number): void {
    if (!Number.isInteger(limit) || limit <= 0) {
      throw new Error('limit must be a positive integer');
    }
    if (limit > MAX_READ_LIMIT) {
      throw new Error(`limit must not exceed ${MAX_READ_LIMIT}`);
    }
  }
}
