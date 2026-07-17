import type { WeightLog } from '../../../domain/entities/WeightLog.js';
import type { WeightLogRepository } from '../../ports/WeightLogRepository.js';

const MAX_READ_LIMIT = 100;

export interface ListWeightLogsInput {
  limit: number;
  /** measuredAtの前方一致（例：'2026-07-17'）。 */
  date?: string;
}

export interface ListWeightLogsOutput {
  logs: WeightLog[];
}

export class ListWeightLogsUseCase {
  constructor(private readonly weightLogRepository: WeightLogRepository) {}

  async execute(input: ListWeightLogsInput): Promise<ListWeightLogsOutput> {
    this.assertValidLimit(input.limit);
    const all = await this.weightLogRepository.findAll();
    const filtered = all.filter((l) => !input.date || l.record.measuredAt.startsWith(input.date));
    const sorted = [...filtered].sort((a, b) => b.record.measuredAt.localeCompare(a.record.measuredAt));
    return { logs: sorted.slice(0, input.limit) };
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
