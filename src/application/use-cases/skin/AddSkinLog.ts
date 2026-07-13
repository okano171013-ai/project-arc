import { randomUUID } from 'node:crypto';
import { SkinLog, type SkinLogRecord } from '../../../domain/entities/SkinLog.js';
import type { SkinLogRepository } from '../../ports/SkinLogRepository.js';

export interface AddSkinLogInput {
  record: SkinLogRecord;
}

export interface AddSkinLogOutput {
  log: SkinLog;
}

export class AddSkinLogUseCase {
  constructor(private readonly skinLogRepository: SkinLogRepository) {}

  async execute(input: AddSkinLogInput): Promise<AddSkinLogOutput> {
    const log = SkinLog.create({ id: randomUUID(), record: input.record });
    await this.skinLogRepository.save(log);
    return { log };
  }
}
