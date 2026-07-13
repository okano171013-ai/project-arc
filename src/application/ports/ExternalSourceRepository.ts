import type { ExternalSource } from '../../domain/entities/ExternalSource.js';

export interface ExternalSourceRepository {
  save(source: ExternalSource): Promise<void>;
  findById(id: string): Promise<ExternalSource | null>;
  findAll(): Promise<ExternalSource[]>;
  delete(id: string): Promise<void>;
  findByUrl(url: string): Promise<ExternalSource[]>;
  findByIdentifier(identifier: string): Promise<ExternalSource[]>;
}
