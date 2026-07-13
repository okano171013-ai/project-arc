import { randomUUID } from 'node:crypto';
import { AppearanceLog, type AppearanceLogRecord } from '../../../domain/entities/AppearanceLog.js';
import type { AppearanceLogRepository } from '../../ports/AppearanceLogRepository.js';

export interface AddAppearanceLogInput {
  record: AppearanceLogRecord;
}

export interface AddAppearanceLogOutput {
  log: AppearanceLog;
}

export class AddAppearanceLogUseCase {
  constructor(private readonly appearanceLogRepository: AppearanceLogRepository) {}

  async execute(input: AddAppearanceLogInput): Promise<AddAppearanceLogOutput> {
    const log = AppearanceLog.create({ id: randomUUID(), record: input.record });
    await this.appearanceLogRepository.save(log);
    return { log };
  }
}
