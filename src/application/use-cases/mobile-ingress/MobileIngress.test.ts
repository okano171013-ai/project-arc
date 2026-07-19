import { describe, it, expect, beforeEach } from 'vitest';
import { ReceiveIngressRecordUseCase } from './ReceiveIngressRecord.js';
import { SyncIngressRecordsUseCase } from './SyncIngressRecords.js';
import { ResolveIngressRecordUseCase } from './ResolveIngressRecord.js';
import { RetryFailedIngressRecordUseCase } from './RetryFailedIngressRecord.js';
import { ListIngressRecordsUseCase } from './ListIngressRecords.js';
import { ImportLogsUseCase } from '../bridge/ImportLogs.js';
import { InMemoryReflectionRepository } from '../../../adapters/repositories/InMemoryReflectionRepository.js';
import type { IngressRecord } from '../../../domain/entities/IngressRecord.js';
import type { IngressRecordRepository } from '../../ports/IngressRecordRepository.js';

import type { MemoryRepository } from '../../ports/MemoryRepository.js';
import type { InventoryRepository } from '../../ports/InventoryRepository.js';
import type { AppearanceLogRepository } from '../../ports/AppearanceLogRepository.js';
import type { SkinLogRepository } from '../../ports/SkinLogRepository.js';
import type { PurchaseLogRepository } from '../../ports/PurchaseLogRepository.js';
import type { ChallengeLogRepository } from '../../ports/ChallengeLogRepository.js';
import type { ThirdPersonEvaluationRepository } from '../../ports/ThirdPersonEvaluationRepository.js';
import type { ExternalSourceRepository } from '../../ports/ExternalSourceRepository.js';
import type { ExternalKnowledgeRepository } from '../../ports/ExternalKnowledgeRepository.js';
import type { MealLogRepository } from '../../ports/MealLogRepository.js';
import type { NutritionLogRepository } from '../../ports/NutritionLogRepository.js';
import type { WeightLogRepository } from '../../ports/WeightLogRepository.js';
import type { FinanceLogRepository } from '../../ports/FinanceLogRepository.js';
import type { StudySessionRepository } from '../../ports/StudySessionRepository.js';

/** 空のFake（このテストでは使わないBridge Log種別を埋めるためだけの存在）。 */
function emptyFake<T>(): T {
  return { save: async () => undefined, findAll: async () => [] } as unknown as T;
}

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

function buildEnv() {
  const ingressRepo = new InMemoryIngressRecordRepository();
  const reflectionRepo = new InMemoryReflectionRepository();

  const importLogs = new ImportLogsUseCase(
    reflectionRepo,
    emptyFake<MemoryRepository>(),
    emptyFake<InventoryRepository>(),
    emptyFake<AppearanceLogRepository>(),
    emptyFake<SkinLogRepository>(),
    emptyFake<PurchaseLogRepository>(),
    emptyFake<ChallengeLogRepository>(),
    emptyFake<ThirdPersonEvaluationRepository>(),
    emptyFake<ExternalSourceRepository>(),
    emptyFake<ExternalKnowledgeRepository>(),
    emptyFake<MealLogRepository>(),
    emptyFake<NutritionLogRepository>(),
    emptyFake<WeightLogRepository>(),
    emptyFake<FinanceLogRepository>(),
    emptyFake<StudySessionRepository>(),
  );

  return {
    ingressRepo,
    reflectionRepo,
    receive: new ReceiveIngressRecordUseCase(ingressRepo),
    sync: new SyncIngressRecordsUseCase(ingressRepo, reflectionRepo, importLogs),
    resolve: new ResolveIngressRecordUseCase(ingressRepo, reflectionRepo),
    retry: new RetryFailedIngressRecordUseCase(ingressRepo),
    list: new ListIngressRecordsUseCase(ingressRepo),
  };
}

function reflectionPayload(date: string, proudOf: string) {
  return { date, record: { proudOf, didAttendClass: false, planAchieved: false } };
}

describe('Mobile Ingress (Version35, ADR 0065)', () => {
  let env: ReturnType<typeof buildEnv>;

  beforeEach(() => {
    env = buildEnv();
  });

  it('receive is idempotent — resubmitting the same key returns the existing record (offline再送対応)', async () => {
    const first = await env.receive.execute({
      idempotencyKey: 'idem-1',
      payloadType: 'Reflection',
      payload: reflectionPayload('2026-07-19', '一日頑張った'),
      clientCreatedAt: '2026-07-19T21:00:00.000Z',
    });
    expect(first.duplicate).toBe(false);

    const second = await env.receive.execute({
      idempotencyKey: 'idem-1',
      payloadType: 'Reflection',
      payload: reflectionPayload('2026-07-19', '別の内容（無視されるはず）'),
      clientCreatedAt: '2026-07-19T21:05:00.000Z',
    });
    expect(second.duplicate).toBe(true);
    expect(second.record.id).toBe(first.record.id);

    const all = await env.list.execute();
    expect(all.records).toHaveLength(1);
  });

  it('happy path: receive -> sync -> Canonicalized, and the reflection is actually saved', async () => {
    await env.receive.execute({
      idempotencyKey: 'idem-2',
      payloadType: 'Reflection',
      payload: reflectionPayload('2026-07-19', '一日頑張った'),
      clientCreatedAt: '2026-07-19T21:00:00.000Z',
    });

    const syncResult = await env.sync.execute();
    expect(syncResult).toEqual({ canonicalized: 1, pending: 0, failed: 0 });

    const saved = await env.reflectionRepo.findByDate('2026-07-19');
    expect(saved?.record.proudOf).toBe('一日頑張った');

    const records = await env.list.execute({ status: 'Canonicalized' });
    expect(records.records).toHaveLength(1);
    expect(records.records[0]?.canonicalizedAs).toBe(saved!.id);
  });

  it('conflict path: a second Reflection for the same date goes to Pending, not silently overwritten', async () => {
    // 1件目：PC側で直接記録済みという想定（既存データ）。
    await env.reflectionRepo.save(
      (await import('../../../domain/entities/Reflection.js')).Reflection.create({
        id: 'existing-1',
        date: '2026-07-19',
        record: { proudOf: '既存の記録', didAttendClass: false, planAchieved: false },
      }),
    );

    // 2件目：スマートフォンから同じ日付のReflectionが届く。
    await env.receive.execute({
      idempotencyKey: 'idem-3',
      payloadType: 'Reflection',
      payload: reflectionPayload('2026-07-19', 'スマホからの記録'),
      clientCreatedAt: '2026-07-19T21:00:00.000Z',
    });

    const syncResult = await env.sync.execute();
    expect(syncResult).toEqual({ canonicalized: 0, pending: 1, failed: 0 });

    const pending = await env.list.execute({ status: 'Pending' });
    expect(pending.records).toHaveLength(1);
    expect(pending.records[0]?.failureReason).toContain('既に存在します');

    // 既存のlocalデータはSystemによって自動上書きされていない。
    const stillExisting = await env.reflectionRepo.findByDate('2026-07-19');
    expect(stillExisting?.record.proudOf).toBe('既存の記録');
  });

  it('resolving a pending record with accept overwrites the local Reflection (Owner確認による採用)', async () => {
    await env.reflectionRepo.save(
      (await import('../../../domain/entities/Reflection.js')).Reflection.create({
        id: 'existing-2',
        date: '2026-07-19',
        record: { proudOf: '既存の記録', didAttendClass: false, planAchieved: false },
      }),
    );
    const { record } = await env.receive.execute({
      idempotencyKey: 'idem-4',
      payloadType: 'Reflection',
      payload: reflectionPayload('2026-07-19', 'スマホからの記録（採用する）'),
      clientCreatedAt: '2026-07-19T21:00:00.000Z',
    });
    await env.sync.execute();

    const resolved = await env.resolve.execute({ id: record.id, action: 'accept' });
    expect(resolved.record.status).toBe('Canonicalized');

    const updated = await env.reflectionRepo.findByDate('2026-07-19');
    expect(updated?.record.proudOf).toBe('スマホからの記録（採用する）');
  });

  it('resolving a pending record with discard keeps the existing local data (Owner確認による破棄)', async () => {
    await env.reflectionRepo.save(
      (await import('../../../domain/entities/Reflection.js')).Reflection.create({
        id: 'existing-3',
        date: '2026-07-19',
        record: { proudOf: '既存の記録（保持される）', didAttendClass: false, planAchieved: false },
      }),
    );
    const { record } = await env.receive.execute({
      idempotencyKey: 'idem-5',
      payloadType: 'Reflection',
      payload: reflectionPayload('2026-07-19', '破棄されるはずの内容'),
      clientCreatedAt: '2026-07-19T21:00:00.000Z',
    });
    await env.sync.execute();

    const resolved = await env.resolve.execute({ id: record.id, action: 'discard' });
    expect(resolved.record.status).toBe('Discarded');

    const untouched = await env.reflectionRepo.findByDate('2026-07-19');
    expect(untouched?.record.proudOf).toBe('既存の記録（保持される）');
  });

  it('failure path: a malformed payload goes to Failed and can be retried', async () => {
    await env.receive.execute({
      idempotencyKey: 'idem-6',
      payloadType: 'Reflection',
      payload: { date: 'not-a-valid-date', record: {} },
      clientCreatedAt: '2026-07-19T21:00:00.000Z',
    });

    const syncResult = await env.sync.execute();
    expect(syncResult).toEqual({ canonicalized: 0, pending: 0, failed: 1 });

    const failed = await env.list.execute({ status: 'Failed' });
    expect(failed.records).toHaveLength(1);

    const retried = await env.retry.execute({ id: failed.records[0]!.id });
    expect(retried.record.status).toBe('Accepted');
  });

  it('gives up after MAX_RETRY and can be discarded', async () => {
    const { record } = await env.receive.execute({
      idempotencyKey: 'idem-7',
      payloadType: 'Reflection',
      payload: { date: 'not-a-valid-date', record: {} },
      clientCreatedAt: '2026-07-19T21:00:00.000Z',
    });

    await env.sync.execute();
    await env.retry.execute({ id: record.id });
    await env.sync.execute();
    await env.retry.execute({ id: record.id });
    await env.sync.execute(); // 3回目のFailedでMAX_RETRY到達

    const failed = await env.ingressRepo.findById(record.id);
    expect(failed!.hasExceededRetries()).toBe(true);
    expect(() => failed!.retry()).toThrow(/exceeded MAX_RETRY/);

    const resolved = await env.resolve.execute({ id: record.id, action: 'discard' });
    expect(resolved.record.status).toBe('Discarded');
  });
});
