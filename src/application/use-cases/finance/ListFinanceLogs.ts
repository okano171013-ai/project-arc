import type { FinanceLog, FinanceLogType } from '../../../domain/entities/FinanceLog.js';
import type { FinanceLogRepository } from '../../ports/FinanceLogRepository.js';

const MAX_READ_LIMIT = 100;

export interface ListFinanceLogsInput {
  limit: number;
  /** occurredAtの前方一致（例：'2026-07-17'）。 */
  date?: string;
  category?: string;
  type?: FinanceLogType;
}

export interface ListFinanceLogsOutput {
  logs: FinanceLog[];
}

export class ListFinanceLogsUseCase {
  constructor(private readonly financeLogRepository: FinanceLogRepository) {}

  async execute(input: ListFinanceLogsInput): Promise<ListFinanceLogsOutput> {
    this.assertValidLimit(input.limit);
    const all = await this.financeLogRepository.findAll();
    const filtered = all
      .filter((l) => !input.date || l.record.occurredAt.startsWith(input.date))
      .filter((l) => !input.category || l.record.category === input.category)
      .filter((l) => !input.type || l.record.type === input.type);
    const sorted = [...filtered].sort((a, b) => b.record.occurredAt.localeCompare(a.record.occurredAt));
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
