import type { IngressRecord } from '../../../domain/entities/IngressRecord.js';
import type { IngressRecordRepository } from '../../ports/IngressRecordRepository.js';
import type { ReflectionRepository } from '../../ports/ReflectionRepository.js';
import { ImportLogsUseCase } from '../bridge/ImportLogs.js';

export interface SyncIngressRecordsOutput {
  canonicalized: number;
  pending: number;
  failed: number;
}

/**
 * SyncIngressRecordsUseCase（Version35、ADR 0065）
 *
 * `Accepted`状態の全IngressRecordを対象に、既存の`ImportLogsUseCase`
 * （Bridge Layer、Version9）へCanonicalizeを委譲する
 * （車輪の再発明をしない、ADR 0065）。
 *
 * 競合検出は、Canonicalize前に対象Repositoryへ既存有無を確認する
 * 事前チェックで行う——エラーメッセージのパターンマッチには依存
 * しない（ADR 0065「根拠」参照）。本MVPでは、`date`単位で「既に
 * 存在するなら上書き」という強い意味を持つReflectionのみ事前
 * チェック対象とする。他のLife Log種別（MealLog等）は
 * idempotencyKeyによる重複防止が各Add系UseCase自身に既に組み込まれ
 * ており、Sync層での追加の競合検出を必要としない。
 */
export class SyncIngressRecordsUseCase {
  private readonly importLogs: ImportLogsUseCase;

  constructor(
    private readonly ingressRecordRepository: IngressRecordRepository,
    private readonly reflectionRepository: ReflectionRepository,
    importLogs: ImportLogsUseCase,
  ) {
    this.importLogs = importLogs;
  }

  async execute(): Promise<SyncIngressRecordsOutput> {
    const accepted = await this.ingressRecordRepository.findByStatus('Accepted');
    const output: SyncIngressRecordsOutput = { canonicalized: 0, pending: 0, failed: 0 };

    for (const record of accepted) {
      await this.syncOne(record);
      if (record.status === 'Canonicalized') output.canonicalized += 1;
      else if (record.status === 'Pending') output.pending += 1;
      else if (record.status === 'Failed') output.failed += 1;
    }

    return output;
  }

  private async syncOne(record: IngressRecord): Promise<void> {
    if (record.data.payloadType === 'Reflection') {
      const date = (record.data.payload as { date?: unknown }).date;
      if (typeof date === 'string') {
        const existing = await this.reflectionRepository.findByDate(date);
        if (existing) {
          record.markPending(`同じ日付（${date}）のReflectionが既に存在します（既存id: ${existing.id}）`);
          await this.ingressRecordRepository.save(record);
          return;
        }
      }
    }

    const { results } = await this.importLogs.execute({
      logs: [{ type: record.data.payloadType, data: record.data.payload }],
    });
    const result = results[0];

    if (result?.ok && result.id) {
      record.markCanonicalized(result.id);
    } else {
      record.markFailed(result?.error ?? 'unknown import failure');
    }
    await this.ingressRecordRepository.save(record);
  }
}
