import type { Capture } from '../../domain/entities/Capture.js';

export interface CaptureRepository {
  save(capture: Capture): Promise<void>;
  findAll(): Promise<Capture[]>;
}
