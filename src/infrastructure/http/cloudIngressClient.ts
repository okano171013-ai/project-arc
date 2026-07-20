import type { CloudIngressClient, CloudIngressRecordWithPayload } from '../../application/ports/CloudIngressClient.js';

/**
 * HttpCloudIngressClient（Version38、ADR 0069）
 *
 * `CloudIngressClient`ポートのHTTP実装。cloud側（Cloudflare Workers
 * 等、`cloudflare/src/worker.ts`と同じ契約）へ`fetch`する
 * Infrastructure層のAdapter。`PULL_TOKEN`（全件list・ack専用の
 * 信頼された鍵）でのみ動作する——スマホ側の`DEVICE_TOKEN`とは別の
 * 鍵であることが前提。
 */
export class HttpCloudIngressClient implements CloudIngressClient {
  constructor(
    private readonly baseUrl: string,
    private readonly pullToken: string,
  ) {}

  async listAccepted(): Promise<CloudIngressRecordWithPayload[]> {
    const res = await fetch(`${this.baseUrl}/ingress?status=Accepted`, {
      headers: { Authorization: `Bearer ${this.pullToken}` },
    });
    if (!res.ok) {
      throw new Error(`CloudIngressClient.listAccepted failed: HTTP ${res.status}`);
    }
    const body = (await res.json()) as {
      records: Array<{
        id: string;
        idempotencyKey: string;
        payloadType: string;
        payload?: Record<string, unknown>;
        clientCreatedAt?: string;
      }>;
    };
    return body.records.map((r) => {
      if (!r.payload || !r.clientCreatedAt) {
        throw new Error(
          `CloudIngressClient.listAccepted: record ${r.id} is missing payload/clientCreatedAt ` +
            '(is PULL_TOKEN correctly configured on the cloud side?)',
        );
      }
      return {
        id: r.id,
        idempotencyKey: r.idempotencyKey,
        payloadType: r.payloadType as CloudIngressRecordWithPayload['payloadType'],
        payload: r.payload,
        clientCreatedAt: r.clientCreatedAt,
      };
    });
  }

  async ack(id: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/ingress/${encodeURIComponent(id)}/ack`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.pullToken}` },
    });
    if (!res.ok) {
      throw new Error(`CloudIngressClient.ack(${id}) failed: HTTP ${res.status}`);
    }
  }
}
