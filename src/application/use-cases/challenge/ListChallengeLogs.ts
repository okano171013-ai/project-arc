import type { ChallengeLog } from '../../../domain/entities/ChallengeLog.js';
import type { ChallengeLogRepository } from '../../ports/ChallengeLogRepository.js';

export interface ListChallengeLogsOutput {
  logs: ChallengeLog[];
}

export class ListChallengeLogsUseCase {
  constructor(private readonly challengeLogRepository: ChallengeLogRepository) {}

  async execute(): Promise<ListChallengeLogsOutput> {
    const logs = await this.challengeLogRepository.findAll();
    const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));
    return { logs: sorted };
  }
}
