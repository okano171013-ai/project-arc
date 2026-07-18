import { randomUUID } from 'node:crypto';
import { DistractionSignal, type DistractionSignalRecord } from '../../../domain/entities/DistractionSignal.js';
import type { DistractionSignalRepository } from '../../ports/DistractionSignalRepository.js';

export interface AddDistractionSignalInput {
  record: DistractionSignalRecord;
}

export interface AddDistractionSignalOutput {
  signal: DistractionSignal;
  deduped: boolean;
}

export class AddDistractionSignalUseCase {
  constructor(private readonly distractionSignalRepository: DistractionSignalRepository) {}

  async execute(input: AddDistractionSignalInput): Promise<AddDistractionSignalOutput> {
    if (input.record.idempotencyKey) {
      const existing = await this.distractionSignalRepository.findAll();
      const duplicate = existing.find((s) => s.record.idempotencyKey === input.record.idempotencyKey);
      if (duplicate) {
        return { signal: duplicate, deduped: true };
      }
    }
    const signal = DistractionSignal.create({ id: randomUUID(), record: input.record });
    await this.distractionSignalRepository.save(signal);
    return { signal, deduped: false };
  }
}
