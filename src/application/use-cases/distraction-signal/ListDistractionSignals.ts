import type { DistractionSignal, DistractionSignalKind } from '../../../domain/entities/DistractionSignal.js';
import type { DistractionSignalRepository } from '../../ports/DistractionSignalRepository.js';

const MAX_READ_LIMIT = 100;

export interface ListDistractionSignalsInput {
  limit: number;
  /** occurredAtの前方一致（例：'2026-07-18'）。 */
  date?: string;
  kind?: DistractionSignalKind;
}

export interface ListDistractionSignalsOutput {
  signals: DistractionSignal[];
}

export class ListDistractionSignalsUseCase {
  constructor(private readonly distractionSignalRepository: DistractionSignalRepository) {}

  async execute(input: ListDistractionSignalsInput): Promise<ListDistractionSignalsOutput> {
    this.assertValidLimit(input.limit);
    const all = await this.distractionSignalRepository.findAll();
    const filtered = all
      .filter((s) => !input.date || s.record.occurredAt.startsWith(input.date))
      .filter((s) => !input.kind || s.record.kind === input.kind);
    const sorted = [...filtered].sort((a, b) => b.record.occurredAt.localeCompare(a.record.occurredAt));
    return { signals: sorted.slice(0, input.limit) };
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
