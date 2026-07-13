import type { ExternalSource } from '../../../domain/entities/ExternalSource.js';
import type { ExternalSourceRepository } from '../../ports/ExternalSourceRepository.js';

export interface ListExternalSourcesOutput {
  sources: ExternalSource[];
}

export class ListExternalSourcesUseCase {
  constructor(private readonly externalSourceRepository: ExternalSourceRepository) {}

  async execute(): Promise<ListExternalSourcesOutput> {
    const sources = await this.externalSourceRepository.findAll();
    const sorted = [...sources].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return { sources: sorted };
  }
}
