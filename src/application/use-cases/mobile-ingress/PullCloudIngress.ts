import type { CloudIngressClient, CloudIngressRecordWithPayload } from '../../ports/CloudIngressClient.js';
import { ReceiveIngressRecordUseCase } from './ReceiveIngressRecord.js';

export type PullCloudIngressResultStatus = 'pulled' | 'duplicate' | 'pulled-ack-failed' | 'failed';

export interface PullCloudIngressResult {
  id: string;
  idempotencyKey: string;
  status: PullCloudIngressResultStatus;
  reason?: string;
}

export interface PullCloudIngressOutput {
  results: PullCloudIngressResult[];
  summary: { pulled: number; duplicate: number; pulledAckFailed: number; failed: number };
}

/**
 * PullCloudIngressUseCase（Version38、ADR 0069）
 *
 * cloud側（`CloudIngressClient`経由、実装はCloudflare Workers等）の
 * Accepted queueをローカルへ引き下ろす「Reconciliation」。cloud→local
 * の2段目のTransport hop——ADR 0059のTransport/Canonical分離を
 * cloud経由の場合にも一貫させる（cloud queueは一時的な受け皿、
 * ローカルのReflection等RepositoryのみがCanonical Store）。
 *
 * 部分失敗を2種類に分けて報告する：
 *   - `failed`：ローカルへの反映自体が失敗——次回pullで自動的に
 *     再試行される（cloud側からackしていないため）。同じ
 *     idempotencyKeyの再試行はローカル側の冪等化により安全。
 *   - `pulled-ack-failed`：ローカルへの反映は成功したが、cloud側の
 *     削除（ack）だけ失敗——データは既に安全にローカルへ複製済み。
 *     次回pullで同じレコードを再度受信しても、ローカル側の
 *     idempotencyKeyにより`duplicate: true`となり無害。
 *
 * 自動dead-letter化（一定回数失敗したレコードを自動的に
 * discardする等）は未実装——現状は「失敗したら次回pullで再試行し
 * 続ける」設計に留めている（Version38 Report「実装しなかった機能」
 * 参照）。
 */
export class PullCloudIngressUseCase {
  constructor(
    private readonly cloudClient: CloudIngressClient,
    private readonly receive: ReceiveIngressRecordUseCase,
  ) {}

  async execute(): Promise<PullCloudIngressOutput> {
    const cloudRecords = await this.cloudClient.listAccepted();
    const results: PullCloudIngressResult[] = [];

    for (const record of cloudRecords) {
      results.push(await this.pullOne(record));
    }

    return { results, summary: summarize(results) };
  }

  private async pullOne(record: CloudIngressRecordWithPayload): Promise<PullCloudIngressResult> {
    let duplicate: boolean;
    try {
      const receiveResult = await this.receive.execute({
        idempotencyKey: record.idempotencyKey,
        payloadType: record.payloadType,
        payload: record.payload,
        clientCreatedAt: record.clientCreatedAt,
      });
      duplicate = receiveResult.duplicate;
    } catch (error) {
      return {
        id: record.id,
        idempotencyKey: record.idempotencyKey,
        status: 'failed',
        reason: error instanceof Error ? error.message : String(error),
      };
    }

    try {
      await this.cloudClient.ack(record.id);
      return { id: record.id, idempotencyKey: record.idempotencyKey, status: duplicate ? 'duplicate' : 'pulled' };
    } catch (error) {
      return {
        id: record.id,
        idempotencyKey: record.idempotencyKey,
        status: 'pulled-ack-failed',
        reason: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

function summarize(results: PullCloudIngressResult[]): PullCloudIngressOutput['summary'] {
  return {
    pulled: results.filter((r) => r.status === 'pulled').length,
    duplicate: results.filter((r) => r.status === 'duplicate').length,
    pulledAckFailed: results.filter((r) => r.status === 'pulled-ack-failed').length,
    failed: results.filter((r) => r.status === 'failed').length,
  };
}
