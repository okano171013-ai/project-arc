import type { CheckIn } from '../../../domain/entities/CheckIn.js';
import type { CheckInRepository } from '../../ports/CheckInRepository.js';

const MAX_READ_LIMIT = 100;

export interface ListCheckInsInput {
  limit: number;
  /** occurredAtの前方一致（例：'2026-07-18'）。 */
  date?: string;
}

export interface ListCheckInsOutput {
  checkIns: CheckIn[];
}

export class ListCheckInsUseCase {
  constructor(private readonly checkInRepository: CheckInRepository) {}

  async execute(input: ListCheckInsInput): Promise<ListCheckInsOutput> {
    this.assertValidLimit(input.limit);
    const all = await this.checkInRepository.findAll();
    const filtered = all.filter((c) => !input.date || c.record.occurredAt.startsWith(input.date));
    const sorted = [...filtered].sort((a, b) => b.record.occurredAt.localeCompare(a.record.occurredAt));
    return { checkIns: sorted.slice(0, input.limit) };
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
