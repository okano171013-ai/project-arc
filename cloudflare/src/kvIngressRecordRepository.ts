import {
  IngressRecord,
  type IngressRecordData,
  type IngressRecordStatus,
} from '../../src/domain/entities/IngressRecord.js';
import type { IngressRecordRepository } from '../../src/application/ports/IngressRecordRepository.js';

/**
 * KvIngressRecordRepository（Version38、ADR 0069）
 *
 * `IngressRecordRepository`（Application層のポート、Version35・
 * ADR 0065）をCloudflare Workers KVで実装するAdapter。
 * ADR 0068の決定通り、Application/Domain層は一切変更していない
 * ——`JsonFileIngressRecordRepository`（ローカル実装）と全く同じ
 * インターフェースを実装するだけで、provider差し替えが成立する
 * ことを示す実装。
 *
 * KVは単純なkey-valueストアのため、`JsonFileIngressRecordRepository`
 * と同じ行shapeをJSON文字列として保存し、2種類のキーで索引する：
 *   - `record:<id>` → 本体
 *   - `idempotency:<idempotencyKey>` → id（`findByIdempotencyKey`用）
 */
interface IngressRecordRow {
  id: string;
  data: IngressRecordData;
  receivedAt: string;
  status: IngressRecordStatus;
  retryCount: number;
  failureReason?: string;
  canonicalizedAs?: string;
}

export class KvIngressRecordRepository implements IngressRecordRepository {
  constructor(private readonly kv: KVNamespace) {}

  async save(record: IngressRecord): Promise<void> {
    const row: IngressRecordRow = {
      id: record.id,
      data: record.data,
      receivedAt: record.receivedAt.toISOString(),
      status: record.status,
      retryCount: record.retryCount,
      failureReason: record.failureReason,
      canonicalizedAs: record.canonicalizedAs,
    };
    await this.kv.put(`record:${record.id}`, JSON.stringify(row));
    await this.kv.put(`idempotency:${record.data.idempotencyKey}`, record.id);
  }

  async findById(id: string): Promise<IngressRecord | null> {
    const raw = await this.kv.get(`record:${id}`);
    return raw ? this.deserialize(JSON.parse(raw) as IngressRecordRow) : null;
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<IngressRecord | null> {
    const id = await this.kv.get(`idempotency:${idempotencyKey}`);
    return id ? this.findById(id) : null;
  }

  async findAll(): Promise<IngressRecord[]> {
    const list = await this.kv.list({ prefix: 'record:' });
    const rows = await Promise.all(
      list.keys.map(async (key) => {
        const raw = await this.kv.get(key.name);
        return raw ? this.deserialize(JSON.parse(raw) as IngressRecordRow) : null;
      }),
    );
    return rows.filter((r): r is IngressRecord => r !== null);
  }

  async findByStatus(status: IngressRecordStatus): Promise<IngressRecord[]> {
    const all = await this.findAll();
    return all.filter((r) => r.status === status);
  }

  /**
   * 保存済みIDのCanonical/Discardedレコードをcloud側から削除する
   * （retention、Version38）。ローカル`pnpm mobile-sync pull`が
   * 正常にpull・local反映を終えた後に呼ぶ想定——cloud queueは
   * Transportに過ぎず、削除してもCanonical Store（ローカル）の
   * データは失われない（ADR 0059の設計をcloud側にも適用）。
   */
  async delete(id: string): Promise<void> {
    const record = await this.findById(id);
    await this.kv.delete(`record:${id}`);
    if (record) {
      await this.kv.delete(`idempotency:${record.data.idempotencyKey}`);
    }
  }

  private deserialize(row: IngressRecordRow): IngressRecord {
    return IngressRecord.restore({
      id: row.id,
      data: row.data,
      receivedAt: new Date(row.receivedAt),
      status: row.status,
      retryCount: row.retryCount,
      failureReason: row.failureReason,
      canonicalizedAs: row.canonicalizedAs,
    });
  }
}
