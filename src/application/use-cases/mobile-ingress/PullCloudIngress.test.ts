import { describe, it, expect } from 'vitest';
import { PullCloudIngressUseCase } from './PullCloudIngress.js';
import { ReceiveIngressRecordUseCase } from './ReceiveIngressRecord.js';
import type { CloudIngressClient, CloudIngressRecordWithPayload } from '../../ports/CloudIngressClient.js';
import type { IngressRecord } from '../../../domain/entities/IngressRecord.js';
import type { IngressRecordRepository } from '../../ports/IngressRecordRepository.js';

class InMemoryIngressRecordRepository implements IngressRecordRepository {
  store = new Map<string, IngressRecord>();
  async save(record: IngressRecord): Promise<void> {
    this.store.set(record.id, record);
  }
  async findById(id: string): Promise<IngressRecord | null> {
    return this.store.get(id) ?? null;
  }
  async findByIdempotencyKey(idempotencyKey: string): Promise<IngressRecord | null> {
    return [...this.store.values()].find((r) => r.data.idempotencyKey === idempotencyKey) ?? null;
  }
  async findAll(): Promise<IngressRecord[]> {
    return [...this.store.values()];
  }
  async findByStatus(status: IngressRecord['status']): Promise<IngressRecord[]> {
    return [...this.store.values()].filter((r) => r.status === status);
  }
}

/** テスト用の合成データのみ（実データは扱わない）。 */
function cloudRecord(overrides: Partial<CloudIngressRecordWithPayload> = {}): CloudIngressRecordWithPayload {
  return {
    id: 'cloud-1',
    idempotencyKey: 'idem-cloud-1',
    payloadType: 'Reflection',
    payload: { date: '2026-07-20', record: { proudOf: 'pull実機テスト' } },
    clientCreatedAt: '2026-07-20T10:00:00.000Z',
    ...overrides,
  };
}

class FakeCloudIngressClient implements CloudIngressClient {
  acked: string[] = [];
  constructor(
    private records: CloudIngressRecordWithPayload[],
    private readonly options: { failAckFor?: string } = {},
  ) {}
  async listAccepted(): Promise<CloudIngressRecordWithPayload[]> {
    return this.records;
  }
  async ack(id: string): Promise<void> {
    if (this.options.failAckFor === id) {
      throw new Error('ack failed (simulated network error)');
    }
    this.acked.push(id);
    this.records = this.records.filter((r) => r.id !== id);
  }
}

describe('PullCloudIngressUseCase (Version38, ADR 0069)', () => {
  it('pulls a cloud record into the local repository and acks it', async () => {
    const localRepo = new InMemoryIngressRecordRepository();
    const receive = new ReceiveIngressRecordUseCase(localRepo);
    const cloud = new FakeCloudIngressClient([cloudRecord()]);
    const pull = new PullCloudIngressUseCase(cloud, receive);

    const result = await pull.execute();

    expect(result.summary).toEqual({ pulled: 1, duplicate: 0, pulledAckFailed: 0, failed: 0 });
    expect(cloud.acked).toEqual(['cloud-1']);
    const local = await localRepo.findByIdempotencyKey('idem-cloud-1');
    expect(local?.data.payload).toEqual(cloudRecord().payload);
  });

  it('is idempotent: re-pulling the same record after a previous local receive reports duplicate, still acks', async () => {
    const localRepo = new InMemoryIngressRecordRepository();
    const receive = new ReceiveIngressRecordUseCase(localRepo);
    // ローカルには既に同じidempotencyKeyで受信済み（例：以前のpullでackだけ失敗し、
    // cloud側に残っていたケースを模擬）。
    await receive.execute({
      idempotencyKey: 'idem-cloud-1',
      payloadType: 'Reflection',
      payload: cloudRecord().payload,
      clientCreatedAt: '2026-07-20T09:00:00.000Z',
    });
    const cloud = new FakeCloudIngressClient([cloudRecord()]);
    const pull = new PullCloudIngressUseCase(cloud, receive);

    const result = await pull.execute();

    expect(result.summary).toEqual({ pulled: 0, duplicate: 1, pulledAckFailed: 0, failed: 0 });
    expect(cloud.acked).toEqual(['cloud-1']); // 重複でもcloud側のcleanupは行う
  });

  it('reports pulled-ack-failed when local receive succeeds but the cloud ack fails (data is safe locally)', async () => {
    const localRepo = new InMemoryIngressRecordRepository();
    const receive = new ReceiveIngressRecordUseCase(localRepo);
    const cloud = new FakeCloudIngressClient([cloudRecord()], { failAckFor: 'cloud-1' });
    const pull = new PullCloudIngressUseCase(cloud, receive);

    const result = await pull.execute();

    expect(result.summary).toEqual({ pulled: 0, duplicate: 0, pulledAckFailed: 1, failed: 0 });
    // データはローカルに反映済み（ackが失敗しても失われない）。
    const local = await localRepo.findByIdempotencyKey('idem-cloud-1');
    expect(local).not.toBeNull();
  });

  it('reports failed and does not ack when the local receive itself fails (retries safely next pull)', async () => {
    const localRepo = new InMemoryIngressRecordRepository();
    const receive = new ReceiveIngressRecordUseCase(localRepo);
    const invalidRecord = cloudRecord({ id: 'cloud-invalid', idempotencyKey: '', clientCreatedAt: 'not-a-date' });
    const cloud = new FakeCloudIngressClient([invalidRecord]);
    const pull = new PullCloudIngressUseCase(cloud, receive);

    const result = await pull.execute();

    expect(result.summary).toEqual({ pulled: 0, duplicate: 0, pulledAckFailed: 0, failed: 1 });
    expect(cloud.acked).toEqual([]); // ackしていない → 次回pullで残ったままretryされる
  });

  it('processes multiple records independently, reporting a mixed partial-failure summary', async () => {
    const localRepo = new InMemoryIngressRecordRepository();
    const receive = new ReceiveIngressRecordUseCase(localRepo);
    const cloud = new FakeCloudIngressClient(
      [
        cloudRecord({ id: 'ok-1', idempotencyKey: 'idem-ok-1' }),
        cloudRecord({ id: 'ok-2', idempotencyKey: 'idem-ok-2' }),
        cloudRecord({ id: 'bad-1', idempotencyKey: '', clientCreatedAt: 'not-a-date' }),
      ],
      { failAckFor: 'ok-2' },
    );
    const pull = new PullCloudIngressUseCase(cloud, receive);

    const result = await pull.execute();

    expect(result.summary).toEqual({ pulled: 1, duplicate: 0, pulledAckFailed: 1, failed: 1 });
  });
});
