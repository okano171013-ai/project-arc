import type { DistractionSignal } from '../../domain/entities/DistractionSignal.js';

export interface DistractionSignalRepository {
  save(signal: DistractionSignal): Promise<void>;
  findAll(): Promise<DistractionSignal[]>;
}
