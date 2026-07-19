import type { IngressRecord } from '../../../domain/entities/IngressRecord.js';
import type { IngressRecordRepository } from '../../ports/IngressRecordRepository.js';

export interface RetryFailedIngressRecordInput {
  id: string;
}

export interface RetryFailedIngressRecordOutput {
  record: IngressRecord;
}

/**
 * RetryFailedIngressRecordUseCase（Version35、ADR 0065）
 *
 * `Failed → Accepted`。次回の`SyncIngressRecordsUseCase`実行時に
 * 再度Canonicalizeが試行される。`MAX_RETRY`到達後は
 * `IngressRecord.retry()`自体が例外を投げる（circuit breaker）。
 */
export class RetryFailedIngressRecordUseCase {
  constructor(private readonly ingressRecordRepository: IngressRecordRepository) {}

  async execute(input: RetryFailedIngressRecordInput): Promise<RetryFailedIngressRecordOutput> {
    const record = await this.ingressRecordRepository.findById(input.id);
    if (!record) {
      throw new Error(`IngressRecord not found: ${input.id}`);
    }
    record.retry();
    await this.ingressRecordRepository.save(record);
    return { record };
  }
}
