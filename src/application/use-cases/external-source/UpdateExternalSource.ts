import type { ExternalSource, ExternalSourceRecord } from '../../../domain/entities/ExternalSource.js';
import type { ExternalSourceRepository } from '../../ports/ExternalSourceRepository.js';

export interface UpdateExternalSourceInput {
  id: string;
  changes: Partial<ExternalSourceRecord>;
}

export interface UpdateExternalSourceOutput {
  source: ExternalSource;
}

export class UpdateExternalSourceUseCase {
  constructor(private readonly externalSourceRepository: ExternalSourceRepository) {}

  async execute(input: UpdateExternalSourceInput): Promise<UpdateExternalSourceOutput> {
    const source = await this.externalSourceRepository.findById(input.id);
    if (!source) {
      throw new Error(`ExternalSource not found: ${input.id}`);
    }
    source.update(input.changes);
    await this.externalSourceRepository.save(source);
    return { source };
  }
}
