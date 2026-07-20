import type { BridgeLogType } from '../../domain/value-objects/BridgeLogType.js';

/**
 * CloudIngressClient（Application層のポート、Version38・ADR 0069）
 *
 * cloud側（例：Cloudflare Workers、`cloudflare/src/worker.ts`）の
 * Mobile Ingress queueへアクセスするためのポート。実装（HTTP経由）は
 * Infrastructure層に置く——Application層は`fetch`等の具体的な通信
 * 手段を知らない（Clean Architectureの依存方向を維持）。
 */
export interface CloudIngressRecordWithPayload {
  id: string;
  idempotencyKey: string;
  payloadType: BridgeLogType;
  payload: Record<string, unknown>;
  clientCreatedAt: string;
}

export interface CloudIngressClient {
  /** cloud側のAccepted状態レコードを全件取得する（pull token、全件許可）。 */
  listAccepted(): Promise<CloudIngressRecordWithPayload[]>;
  /** ローカルへのpull成功後、cloud側から削除する（retention）。 */
  ack(id: string): Promise<void>;
}
