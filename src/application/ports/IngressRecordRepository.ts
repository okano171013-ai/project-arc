import type { IngressRecord, IngressRecordStatus } from '../../domain/entities/IngressRecord.js';

/** IngressRecordRepository（ポート、ADR 0065） */
export interface IngressRecordRepository {
  save(record: IngressRecord): Promise<void>;
  findById(id: string): Promise<IngressRecord | null>;
  findByIdempotencyKey(idempotencyKey: string): Promise<IngressRecord | null>;
  findAll(): Promise<IngressRecord[]>;
  findByStatus(status: IngressRecordStatus): Promise<IngressRecord[]>;
}
