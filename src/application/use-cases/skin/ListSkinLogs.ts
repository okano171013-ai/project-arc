import type { SkinLog } from '../../../domain/entities/SkinLog.js';
import type { SkinLogRepository } from '../../ports/SkinLogRepository.js';

export interface ListSkinLogsOutput {
  logs: SkinLog[];
}

export class ListSkinLogsUseCase {
  constructor(private readonly skinLogRepository: SkinLogRepository) {}

  async execute(): Promise<ListSkinLogsOutput> {
    const logs = await this.skinLogRepository.findAll();
    const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));
    return { logs: sorted };
  }
}
