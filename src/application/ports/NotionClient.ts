import type { BridgeLogType } from '../../domain/value-objects/BridgeLogType.js';

/**
 * NotionClient（Application層のポート、Version42・ADR 0075）
 *
 * NotionをMobile Ingressと同格の新しいTransport sourceとして扱う
 * ためのポート。実装（Notion API経由のHTTP通信）はInfrastructure層に
 * 置く——Application層は`fetch`等の具体的な通信手段を知らない
 * （Clean Architectureの依存方向を維持、`CloudIngressClient`と同型）。
 */
export interface NotionEntryRecord {
  /** NotionページID。idempotencyKeyの基になる（`notion:${pageId}`）。 */
  pageId: string;
  payloadType: BridgeLogType;
  payload: Record<string, unknown>;
  clientCreatedAt: string;
}

export interface NotionClient {
  /** `Synced`チェックボックスが未チェックの全ページを取得する。 */
  listUnsynced(): Promise<NotionEntryRecord[]>;
  /** ローカルへのpull成功後、Notion側の`Synced`をtrueに更新する（削除はしない、ADR 0075）。 */
  markSynced(pageId: string): Promise<void>;
}
