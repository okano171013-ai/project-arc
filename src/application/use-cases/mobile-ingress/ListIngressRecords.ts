import type { IngressRecord, IngressRecordStatus } from '../../../domain/entities/IngressRecord.js';
import type { IngressRecordRepository } from '../../ports/IngressRecordRepository.js';

export interface ListIngressRecordsInput {
  status?: IngressRecordStatus;
  /**
   * 指定時、この`idempotencyKey`の1件のみを返す（Version37、
   * スマホ側のread契約——送信直後に「自分が送ったものが今どういう
   * 状態か」をポーリングできるようにする）。`status`と併用した場合、
   * 両方に一致する場合のみ返す。
   */
  idempotencyKey?: string;
}

export interface ListIngressRecordsOutput {
  records: IngressRecord[];
}

export class ListIngressRecordsUseCase {
  constructor(private readonly ingressRecordRepository: IngressRecordRepository) {}

  async execute(input: ListIngressRecordsInput = {}): Promise<ListIngressRecordsOutput> {
    if (input.idempotencyKey) {
      const record = await this.ingressRecordRepository.findByIdempotencyKey(input.idempotencyKey);
      const matches = record && (!input.status || record.status === input.status);
      return { records: matches ? [record] : [] };
    }
    const all = input.status
      ? await this.ingressRecordRepository.findByStatus(input.status)
      : await this.ingressRecordRepository.findAll();
    const sorted = [...all].sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());
    return { records: sorted };
  }
}
