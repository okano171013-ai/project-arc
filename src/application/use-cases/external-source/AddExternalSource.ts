import { randomUUID } from 'node:crypto';
import {
  ExternalSource,
  type ExternalSourceRecord,
} from '../../../domain/entities/ExternalSource.js';
import type { ExternalSourceRepository } from '../../ports/ExternalSourceRepository.js';

export interface AddExternalSourceInput {
  record: ExternalSourceRecord;
}

export interface AddExternalSourceOutput {
  source: ExternalSource;
}

export class AddExternalSourceUseCase {
  constructor(private readonly externalSourceRepository: ExternalSourceRepository) {}

  async execute(input: AddExternalSourceInput): Promise<AddExternalSourceOutput> {
    const source = ExternalSource.create({ id: randomUUID(), record: input.record });
    await this.externalSourceRepository.save(source);
    return { source };
  }
}
