import { randomUUID } from 'node:crypto';
import { ChallengeLog, type ChallengeLogRecord } from '../../../domain/entities/ChallengeLog.js';
import type { ChallengeLogRepository } from '../../ports/ChallengeLogRepository.js';

export interface AddChallengeLogInput {
  record: ChallengeLogRecord;
}

export interface AddChallengeLogOutput {
  log: ChallengeLog;
}

export class AddChallengeLogUseCase {
  constructor(private readonly challengeLogRepository: ChallengeLogRepository) {}

  async execute(input: AddChallengeLogInput): Promise<AddChallengeLogOutput> {
    const log = ChallengeLog.create({ id: randomUUID(), record: input.record });
    await this.challengeLogRepository.save(log);
    return { log };
  }
}
