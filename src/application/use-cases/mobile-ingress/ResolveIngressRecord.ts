import { UpdateDailyReflectionUseCase } from '../reflection/UpdateDailyReflection.js';
import type { ReflectionRecord } from '../../../domain/entities/Reflection.js';
import type { IngressRecord } from '../../../domain/entities/IngressRecord.js';
import type { IngressRecordRepository } from '../../ports/IngressRecordRepository.js';
import type { ReflectionRepository } from '../../ports/ReflectionRepository.js';

export type ResolveIngressRecordAction = 'accept' | 'discard';

export interface ResolveIngressRecordInput {
  id: string;
  action: ResolveIngressRecordAction;
}

export interface ResolveIngressRecordOutput {
  record: IngressRecord;
}

/**
 * ResolveIngressRecordUseCase（Version35、ADR 0065）
 *
 * `Pending`（競合検出）または`Failed`（circuit breaker打ち切り後）の
 * IngressRecordを、Owner確認の結果に基づいて解決する
 * （Constitution第2条：Systemは判断しない、判断するのは常にOwner）。
 *
 * - `discard`：受信内容を破棄し、既存のlocalデータをそのまま保持する
 *   （Pending・Failedどちらからも可能）。
 * - `accept`：受信内容を採用し、実際にCanonicalize（上書き）する。
 *   本MVPでは`Reflection`のみ対応——他の種別（idempotencyKeyによる
 *   重複防止が既にある）はPending状態に到達しない設計のため
 *   （`SyncIngressRecordsUseCase`参照）。
 */
export class ResolveIngressRecordUseCase {
  constructor(
    private readonly ingressRecordRepository: IngressRecordRepository,
    private readonly reflectionRepository: ReflectionRepository,
  ) {}

  async execute(input: ResolveIngressRecordInput): Promise<ResolveIngressRecordOutput> {
    const record = await this.ingressRecordRepository.findById(input.id);
    if (!record) {
      throw new Error(`IngressRecord not found: ${input.id}`);
    }

    if (input.action === 'discard') {
      record.discard();
      await this.ingressRecordRepository.save(record);
      return { record };
    }

    if (record.data.payloadType !== 'Reflection') {
      throw new Error(
        `'accept' is only implemented for payloadType 'Reflection' in this MVP (got '${record.data.payloadType}')`,
      );
    }

    const payload = record.data.payload as { date: string; record: ReflectionRecord };
    const useCase = new UpdateDailyReflectionUseCase(this.reflectionRepository);
    const result = await useCase.execute({ date: payload.date, record: payload.record });
    record.acceptPending(result.reflection.id);
    await this.ingressRecordRepository.save(record);
    return { record };
  }
}
