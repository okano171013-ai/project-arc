import { describe, it, expect, beforeEach } from 'vitest';
import { ImportLogsUseCase } from './ImportLogs.js';
import { ExportLogsUseCase } from './ExportLogs.js';
import { InMemoryReflectionRepository } from '../../../adapters/repositories/InMemoryReflectionRepository.js';

import type { MemoryRepository } from '../../ports/MemoryRepository.js';
import type { InventoryRepository } from '../../ports/InventoryRepository.js';
import type { AppearanceLogRepository } from '../../ports/AppearanceLogRepository.js';
import type { SkinLogRepository } from '../../ports/SkinLogRepository.js';
import type { PurchaseLogRepository } from '../../ports/PurchaseLogRepository.js';
import type { ChallengeLogRepository } from '../../ports/ChallengeLogRepository.js';
import type { ThirdPersonEvaluationRepository } from '../../ports/ThirdPersonEvaluationRepository.js';

import type { MemoryEntry } from '../../../domain/entities/MemoryEntry.js';
import type { InventoryItem } from '../../../domain/entities/InventoryItem.js';
import type { AppearanceLog } from '../../../domain/entities/AppearanceLog.js';
import type { SkinLog } from '../../../domain/entities/SkinLog.js';
import type { PurchaseLog } from '../../../domain/entities/PurchaseLog.js';
import type { ChallengeLog } from '../../../domain/entities/ChallengeLog.js';
import type { ThirdPersonEvaluation } from '../../../domain/entities/ThirdPersonEvaluation.js';

class FakeMemoryRepository implements MemoryRepository {
  store = new Map<string, MemoryEntry>();
  async save(e: MemoryEntry): Promise<void> {
    this.store.set(e.id, e);
  }
  async findAll(): Promise<MemoryEntry[]> {
    return [...this.store.values()];
  }
  async findById(id: string): Promise<MemoryEntry | null> {
    return this.store.get(id) ?? null;
  }
  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}

class FakeInventoryRepository implements InventoryRepository {
  store = new Map<string, InventoryItem>();
  async save(i: InventoryItem): Promise<void> {
    this.store.set(i.id, i);
  }
  async findAll(): Promise<InventoryItem[]> {
    return [...this.store.values()];
  }
  async findById(id: string): Promise<InventoryItem | null> {
    return this.store.get(id) ?? null;
  }
}

class FakeAppearanceLogRepository implements AppearanceLogRepository {
  store: AppearanceLog[] = [];
  async save(log: AppearanceLog): Promise<void> {
    this.store.push(log);
  }
  async findAll(): Promise<AppearanceLog[]> {
    return [...this.store];
  }
}

class FakeSkinLogRepository implements SkinLogRepository {
  store: SkinLog[] = [];
  async save(log: SkinLog): Promise<void> {
    this.store.push(log);
  }
  async findAll(): Promise<SkinLog[]> {
    return [...this.store];
  }
}

class FakePurchaseLogRepository implements PurchaseLogRepository {
  store = new Map<string, PurchaseLog>();
  async save(log: PurchaseLog): Promise<void> {
    this.store.set(log.id, log);
  }
  async findAll(): Promise<PurchaseLog[]> {
    return [...this.store.values()];
  }
  async findById(id: string): Promise<PurchaseLog | null> {
    return this.store.get(id) ?? null;
  }
}

class FakeChallengeLogRepository implements ChallengeLogRepository {
  store: ChallengeLog[] = [];
  async save(log: ChallengeLog): Promise<void> {
    this.store.push(log);
  }
  async findAll(): Promise<ChallengeLog[]> {
    return [...this.store];
  }
}

class FakeThirdPersonEvaluationRepository implements ThirdPersonEvaluationRepository {
  store: ThirdPersonEvaluation[] = [];
  async save(e: ThirdPersonEvaluation): Promise<void> {
    this.store.push(e);
  }
  async findAll(): Promise<ThirdPersonEvaluation[]> {
    return [...this.store];
  }
}

function buildUseCases() {
  const reflectionRepo = new InMemoryReflectionRepository();
  const memoryRepo = new FakeMemoryRepository();
  const inventoryRepo = new FakeInventoryRepository();
  const appearanceRepo = new FakeAppearanceLogRepository();
  const skinRepo = new FakeSkinLogRepository();
  const purchaseRepo = new FakePurchaseLogRepository();
  const challengeRepo = new FakeChallengeLogRepository();
  const evaluationRepo = new FakeThirdPersonEvaluationRepository();

  const importLogs = new ImportLogsUseCase(
    reflectionRepo,
    memoryRepo,
    inventoryRepo,
    appearanceRepo,
    skinRepo,
    purchaseRepo,
    challengeRepo,
    evaluationRepo,
  );
  const exportLogs = new ExportLogsUseCase(
    reflectionRepo,
    memoryRepo,
    inventoryRepo,
    appearanceRepo,
    skinRepo,
    purchaseRepo,
    challengeRepo,
    evaluationRepo,
  );

  return { importLogs, exportLogs, repos: { memoryRepo, skinRepo, purchaseRepo } };
}

describe('ImportLogs', () => {
  let useCases: ReturnType<typeof buildUseCases>;

  beforeEach(() => {
    useCases = buildUseCases();
  });

  it('複数typeを一括登録し、それぞれ既存UseCaseに委譲する', async () => {
    const { results, successCount, failureCount } = await useCases.importLogs.execute({
      logs: [
        { type: 'PurchaseLog', data: { record: { productName: 'メラノCC', purchaseDate: '2026-07-13' } } },
        { type: 'SkinLog', data: { record: { date: '2026-07-13', redness: 2 } } },
      ],
    });

    expect(successCount).toBe(2);
    expect(failureCount).toBe(0);
    expect(results.every((r) => r.ok)).toBe(true);
    expect(useCases.repos.purchaseRepo.store.size).toBe(1);
    expect(useCases.repos.skinRepo.store).toHaveLength(1);
  });

  it('1件の失敗が他の項目に影響しない（部分成功）', async () => {
    const { results, successCount, failureCount } = await useCases.importLogs.execute({
      logs: [
        { type: 'PurchaseLog', data: { record: {} } }, // productName欠如で失敗するはず
        { type: 'SkinLog', data: { record: { date: '2026-07-13', redness: 2 } } },
      ],
    });

    expect(successCount).toBe(1);
    expect(failureCount).toBe(1);
    expect(results[0]?.ok).toBe(false);
    expect(results[1]?.ok).toBe(true);
    expect(useCases.repos.skinRepo.store).toHaveLength(1);
  });

  it('Memoryをtype経由でインポートできる', async () => {
    const { results } = await useCases.importLogs.execute({
      logs: [
        {
          type: 'Memory',
          data: { record: { category: 'Assets', title: 'シェーバー', content: 'PHILIPS 5000' } },
        },
      ],
    });
    expect(results[0]?.ok).toBe(true);
    expect(useCases.repos.memoryRepo.store.size).toBe(1);
  });
});

describe('ExportLogs', () => {
  let useCases: ReturnType<typeof buildUseCases>;

  beforeEach(() => {
    useCases = buildUseCases();
  });

  it('指定typeのみエクスポートする', async () => {
    await useCases.importLogs.execute({
      logs: [
        { type: 'SkinLog', data: { record: { date: '2026-07-13', redness: 2 } } },
        { type: 'PurchaseLog', data: { record: { productName: 'メラノCC', purchaseDate: '2026-07-13' } } },
      ],
    });

    const { logs } = await useCases.exportLogs.execute({ type: 'SkinLog' });
    expect(logs).toHaveLength(1);
    expect(logs[0]?.type).toBe('SkinLog');
  });

  it('type省略時は全種別をエクスポートする', async () => {
    await useCases.importLogs.execute({
      logs: [
        { type: 'SkinLog', data: { record: { date: '2026-07-13', redness: 2 } } },
        { type: 'ChallengeLog', data: { record: { date: '2026-07-13', title: '赤福' } } },
      ],
    });

    const { logs } = await useCases.exportLogs.execute();
    expect(logs.some((l) => l.type === 'SkinLog')).toBe(true);
    expect(logs.some((l) => l.type === 'ChallengeLog')).toBe(true);
  });

  it('エクスポートされたデータはprivateフィールド名(_id等)を含まない', async () => {
    await useCases.importLogs.execute({
      logs: [{ type: 'SkinLog', data: { record: { date: '2026-07-13', redness: 2 } } }],
    });

    const { logs } = await useCases.exportLogs.execute({ type: 'SkinLog' });
    const data = logs[0]?.data as Record<string, unknown>;
    expect(data).toHaveProperty('id');
    expect(data).not.toHaveProperty('_id');
  });
});
