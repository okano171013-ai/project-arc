import type { ExternalSource } from '../../../domain/entities/ExternalSource.js';
import type { ExternalSourceRepository } from '../../ports/ExternalSourceRepository.js';

export interface GetExternalSourceInput {
  id: string;
}

export interface GetExternalSourceOutput {
  source: ExternalSource | null;
}

export class GetExternalSourceUseCase {
  constructor(private readonly externalSourceRepository: ExternalSourceRepository) {}

  async execute(input: GetExternalSourceInput): Promise<GetExternalSourceOutput> {
    const source = await this.externalSourceRepository.findById(input.id);
    return { source };
  }
}
