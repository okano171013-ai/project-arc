import type { AppearanceLog } from '../../../domain/entities/AppearanceLog.js';
import type { AppearanceLogRepository } from '../../ports/AppearanceLogRepository.js';

export interface ListAppearanceLogsOutput {
  logs: AppearanceLog[];
}

export class ListAppearanceLogsUseCase {
  constructor(private readonly appearanceLogRepository: AppearanceLogRepository) {}

  async execute(): Promise<ListAppearanceLogsOutput> {
    const logs = await this.appearanceLogRepository.findAll();
    return { logs: [...logs].sort((a, b) => b.date.localeCompare(a.date)) };
  }
}
