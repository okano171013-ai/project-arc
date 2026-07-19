import type { DevelopmentGrant, DevelopmentGrantStatus } from '../../../domain/entities/DevelopmentGrant.js';
import type { DevelopmentGrantRepository } from '../../ports/DevelopmentGrantRepository.js';

export interface ListDevelopmentGrantsInput {
  status?: DevelopmentGrantStatus;
}

export interface ListDevelopmentGrantsOutput {
  grants: DevelopmentGrant[];
}

export class ListDevelopmentGrantsUseCase {
  constructor(private readonly developmentGrantRepository: DevelopmentGrantRepository) {}

  async execute(input: ListDevelopmentGrantsInput = {}): Promise<ListDevelopmentGrantsOutput> {
    const all = await this.developmentGrantRepository.findAll();
    const filtered = all.filter((g) => !input.status || g.status === input.status);
    const sorted = [...filtered].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return { grants: sorted };
  }
}
