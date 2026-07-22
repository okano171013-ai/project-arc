import { describe, it, expect } from 'vitest';
import { PullNotionEntriesUseCase } from './PullNotionEntries.js';
import { ReceiveIngressRecordUseCase } from './ReceiveIngressRecord.js';
import type { NotionClient, NotionEntryRecord } from '../../ports/NotionClient.js';
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
function notionEntry(overrides: Partial<NotionEntryRecord> = {}): NotionEntryRecord {
  return {
    pageId: 'page-1',
    payloadType: 'Memory',
    payload: { record: { category: 'Preferences', title: '合成テスト', content: 'pull実機テスト' } },
    clientCreatedAt: '2026-07-21T10:00:00.000Z',
    ...overrides,
  };
}

class FakeNotionClient implements NotionClient {
  synced: string[] = [];
  constructor(
    private entries: NotionEntryRecord[],
    private readonly options: { failSyncFor?: string } = {},
  ) {}
  async listUnsynced(): Promise<NotionEntryRecord[]> {
    return this.entries;
  }
  async markSynced(pageId: string): Promise<void> {
    if (this.options.failSyncFor === pageId) {
      throw new Error('markSynced failed (simulated network error)');
    }
    this.synced.push(pageId);
    this.entries = this.entries.filter((e) => e.pageId !== pageId);
  }
}

describe('PullNotionEntriesUseCase (Version42, ADR 0075)', () => {
  it('pulls a Notion page into the local repository and marks it synced', async () => {
    const localRepo = new InMemoryIngressRecordRepository();
    const receive = new ReceiveIngressRecordUseCase(localRepo);
    const notion = new FakeNotionClient([notionEntry()]);
    const pull = new PullNotionEntriesUseCase(notion, receive);

    const result = await pull.execute();

    expect(result.summary).toEqual({ pulled: 1, duplicate: 0, pulledSyncFailed: 0, failed: 0 });
    expect(notion.synced).toEqual(['page-1']);
    const local = await localRepo.findByIdempotencyKey('notion:page-1');
    expect(local?.data.payload).toEqual(notionEntry().payload);
  });

  it('is idempotent: re-pulling the same page after a previous local receive reports duplicate, still marks synced', async () => {
    const localRepo = new InMemoryIngressRecordRepository();
    const receive = new ReceiveIngressRecordUseCase(localRepo);
    // ローカルには既に同じidempotencyKeyで受信済み（例：以前のpullでSynced更新だけ失敗し、
    // Notion側に未同期のまま残っていたケースを模擬）。
    await receive.execute({
      idempotencyKey: 'notion:page-1',
      payloadType: 'Memory',
      payload: notionEntry().payload,
      clientCreatedAt: '2026-07-21T09:00:00.000Z',
    });
    const notion = new FakeNotionClient([notionEntry()]);
    const pull = new PullNotionEntriesUseCase(notion, receive);

    const result = await pull.execute();

    expect(result.summary).toEqual({ pulled: 0, duplicate: 1, pulledSyncFailed: 0, failed: 0 });
    expect(notion.synced).toEqual(['page-1']); // 重複でもNotion側のSynced更新は行う
  });

  it('reports pulled-sync-failed when local receive succeeds but marking Synced fails (data is safe locally)', async () => {
    const localRepo = new InMemoryIngressRecordRepository();
    const receive = new ReceiveIngressRecordUseCase(localRepo);
    const notion = new FakeNotionClient([notionEntry()], { failSyncFor: 'page-1' });
    const pull = new PullNotionEntriesUseCase(notion, receive);

    const result = await pull.execute();

    expect(result.summary).toEqual({ pulled: 0, duplicate: 0, pulledSyncFailed: 1, failed: 0 });
    // データはローカルに反映済み（Synced更新が失敗しても失われない）。
    const local = await localRepo.findByIdempotencyKey('notion:page-1');
    expect(local).not.toBeNull();
  });

  it('reports failed and does not mark synced when the local receive itself fails (retries safely next pull)', async () => {
    const localRepo = new InMemoryIngressRecordRepository();
    const receive = new ReceiveIngressRecordUseCase(localRepo);
    const invalidEntry = notionEntry({ pageId: 'page-invalid', clientCreatedAt: 'not-a-date' });
    const notion = new FakeNotionClient([invalidEntry]);
    const pull = new PullNotionEntriesUseCase(notion, receive);

    const result = await pull.execute();

    expect(result.summary).toEqual({ pulled: 0, duplicate: 0, pulledSyncFailed: 0, failed: 1 });
    expect(notion.synced).toEqual([]); // 未同期のまま → 次回pullでretryされる
  });

  it('processes multiple pages independently, reporting a mixed partial-failure summary', async () => {
    const localRepo = new InMemoryIngressRecordRepository();
    const receive = new ReceiveIngressRecordUseCase(localRepo);
    const notion = new FakeNotionClient(
      [
        notionEntry({ pageId: 'ok-1' }),
        notionEntry({ pageId: 'ok-2' }),
        notionEntry({ pageId: 'bad-1', clientCreatedAt: 'not-a-date' }),
      ],
      { failSyncFor: 'ok-2' },
    );
    const pull = new PullNotionEntriesUseCase(notion, receive);

    const result = await pull.execute();

    expect(result.summary).toEqual({ pulled: 1, duplicate: 0, pulledSyncFailed: 1, failed: 1 });
  });
});
