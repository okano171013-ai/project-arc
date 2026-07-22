import type { NotionClient, NotionEntryRecord } from '../../ports/NotionClient.js';
import { ReceiveIngressRecordUseCase } from './ReceiveIngressRecord.js';

export type PullNotionEntriesResultStatus = 'pulled' | 'duplicate' | 'pulled-sync-failed' | 'failed';

export interface PullNotionEntriesResult {
  pageId: string;
  idempotencyKey: string;
  status: PullNotionEntriesResultStatus;
  reason?: string;
}

export interface PullNotionEntriesOutput {
  results: PullNotionEntriesResult[];
  summary: { pulled: number; duplicate: number; pulledSyncFailed: number; failed: number };
}

/**
 * PullNotionEntriesUseCase（Version42、ADR 0075）
 *
 * Notion（`NotionClient`経由）の`Synced`未チェックのページを
 * ローカルへ引き下ろす「Reconciliation」。`PullCloudIngressUseCase`
 * （Version38、ADR 0069）と同型——NotionはOwnerが日常記録する
 * Transport source、ローカルのReflection等RepositoryのみがCanonical
 * Storeという構図を一貫させる。
 *
 * cloud Ingress Queueと異なり、pull後もNotion側のページは削除
 * しない（Ownerの一次記録として残す、ADR 0075）。代わりに`Synced`
 * フラグを立てるだけに留める：
 *   - `failed`：ローカルへの反映自体が失敗——`Synced`を更新しない
 *     ため次回pullで自動的に再試行される。
 *   - `pulled-sync-failed`：ローカルへの反映は成功したが、Notion側の
 *     `Synced`更新だけ失敗——データは既に安全にローカルへ複製済み。
 *     次回pullで同じページを再度受信しても、ローカル側の
 *     idempotencyKeyにより`duplicate: true`となり無害。
 */
export class PullNotionEntriesUseCase {
  constructor(
    private readonly notionClient: NotionClient,
    private readonly receive: ReceiveIngressRecordUseCase,
  ) {}

  async execute(): Promise<PullNotionEntriesOutput> {
    const entries = await this.notionClient.listUnsynced();
    const results: PullNotionEntriesResult[] = [];

    for (const entry of entries) {
      results.push(await this.pullOne(entry));
    }

    return { results, summary: summarize(results) };
  }

  private async pullOne(entry: NotionEntryRecord): Promise<PullNotionEntriesResult> {
    const idempotencyKey = `notion:${entry.pageId}`;
    let duplicate: boolean;
    try {
      const receiveResult = await this.receive.execute({
        idempotencyKey,
        payloadType: entry.payloadType,
        payload: entry.payload,
        clientCreatedAt: entry.clientCreatedAt,
      });
      duplicate = receiveResult.duplicate;
    } catch (error) {
      return {
        pageId: entry.pageId,
        idempotencyKey,
        status: 'failed',
        reason: error instanceof Error ? error.message : String(error),
      };
    }

    try {
      await this.notionClient.markSynced(entry.pageId);
      return { pageId: entry.pageId, idempotencyKey, status: duplicate ? 'duplicate' : 'pulled' };
    } catch (error) {
      return {
        pageId: entry.pageId,
        idempotencyKey,
        status: 'pulled-sync-failed',
        reason: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

function summarize(results: PullNotionEntriesResult[]): PullNotionEntriesOutput['summary'] {
  return {
    pulled: results.filter((r) => r.status === 'pulled').length,
    duplicate: results.filter((r) => r.status === 'duplicate').length,
    pulledSyncFailed: results.filter((r) => r.status === 'pulled-sync-failed').length,
    failed: results.filter((r) => r.status === 'failed').length,
  };
}
