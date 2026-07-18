import type { Intervention } from '../../domain/entities/Intervention.js';

export interface InterventionRepository {
  save(intervention: Intervention): Promise<void>;
  findById(id: string): Promise<Intervention | null>;
  findAll(): Promise<Intervention[]>;
}
