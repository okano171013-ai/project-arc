import type { ExternalSourceRepository } from '../../ports/ExternalSourceRepository.js';

export interface DeleteExternalSourceInput {
  id: string;
}

export class DeleteExternalSourceUseCase {
  constructor(private readonly externalSourceRepository: ExternalSourceRepository) {}

  async execute(input: DeleteExternalSourceInput): Promise<void> {
    const source = await this.externalSourceRepository.findById(input.id);
    if (!source) {
      throw new Error(`ExternalSource not found: ${input.id}`);
    }
    await this.externalSourceRepository.delete(input.id);
  }
}
