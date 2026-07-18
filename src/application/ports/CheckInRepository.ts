import type { CheckIn } from '../../domain/entities/CheckIn.js';

export interface CheckInRepository {
  save(checkIn: CheckIn): Promise<void>;
  findAll(): Promise<CheckIn[]>;
}
