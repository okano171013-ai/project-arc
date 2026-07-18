import { randomUUID } from 'node:crypto';
import { CheckIn, type CheckInRecord } from '../../../domain/entities/CheckIn.js';
import type { CheckInRepository } from '../../ports/CheckInRepository.js';

export interface AddCheckInInput {
  record: CheckInRecord;
}

export interface AddCheckInOutput {
  checkIn: CheckIn;
  deduped: boolean;
}

export class AddCheckInUseCase {
  constructor(private readonly checkInRepository: CheckInRepository) {}

  async execute(input: AddCheckInInput): Promise<AddCheckInOutput> {
    if (input.record.idempotencyKey) {
      const existing = await this.checkInRepository.findAll();
      const duplicate = existing.find((c) => c.record.idempotencyKey === input.record.idempotencyKey);
      if (duplicate) {
        return { checkIn: duplicate, deduped: true };
      }
    }
    const checkIn = CheckIn.create({ id: randomUUID(), record: input.record });
    await this.checkInRepository.save(checkIn);
    return { checkIn, deduped: false };
  }
}
