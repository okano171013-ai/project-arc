import { randomUUID } from 'node:crypto';
import { IngressRecord, type IngressRecordData } from '../../../domain/entities/IngressRecord.js';
import type { IngressRecordRepository } from '../../ports/IngressRecordRepository.js';

export type ReceiveIngressRecordInput = IngressRecordData;

export interface ReceiveIngressRecordOutput {
  record: IngressRecord;
  /** 同じidempotencyKeyで既に受信済みの場合true——新規作成せず既存を返す（ADR 0063・0065）。 */
  duplicate: boolean;
}

/**
 * ReceiveIngressRecordUseCase（Version35、ADR 0065）
 *
 * Mobile Ingressの「受信」。idempotencyKeyで冪等化する——同じ
 * キーで複数回呼ばれても2回目以降は新規作成しない。スマートフォン
 * 側のoffline再送・network不安定時の重複送信を安全にする。
 */
export class ReceiveIngressRecordUseCase {
  constructor(private readonly ingressRecordRepository: IngressRecordRepository) {}

  async execute(input: ReceiveIngressRecordInput): Promise<ReceiveIngressRecordOutput> {
    const existing = await this.ingressRecordRepository.findByIdempotencyKey(input.idempotencyKey);
    if (existing) {
      return { record: existing, duplicate: true };
    }

    const record = IngressRecord.accept({ id: randomUUID(), data: input });
    await this.ingressRecordRepository.save(record);
    return { record, duplicate: false };
  }
}
