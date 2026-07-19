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
import type { ExternalSourceRepository } from '../../ports/ExternalSourceRepository.js';
import type { ExternalKnowledgeRepository } from '../../ports/ExternalKnowledgeRepository.js';
import type { MealLogRepository } from '../../ports/MealLogRepository.js';
import type { NutritionLogRepository } from '../../ports/NutritionLogRepository.js';
import type { WeightLogRepository } from '../../ports/WeightLogRepository.js';
import type { FinanceLogRepository } from '../../ports/FinanceLogRepository.js';
import type { StudySessionRepository } from '../../ports/StudySessionRepository.js';

import type { MemoryEntry } from '../../../domain/entities/MemoryEntry.js';
import type { InventoryItem } from '../../../domain/entities/InventoryItem.js';
import type { AppearanceLog } from '../../../domain/entities/AppearanceLog.js';
import type { SkinLog } from '../../../domain/entities/SkinLog.js';
import type { PurchaseLog } from '../../../domain/entities/PurchaseLog.js';
import type { ChallengeLog } from '../../../domain/entities/ChallengeLog.js';
import type { ThirdPersonEvaluation } from '../../../domain/entities/ThirdPersonEvaluation.js';
import type { ExternalSource } from '../../../domain/entities/ExternalSource.js';
import type { ExternalKnowledge } from '../../../domain/entities/ExternalKnowledge.js';
import type { MealLog } from '../../../domain/entities/MealLog.js';
import type { NutritionLog } from '../../../domain/entities/NutritionLog.js';
import type { WeightLog } from '../../../domain/entities/WeightLog.js';
import type { FinanceLog } from '../../../domain/entities/FinanceLog.js';
import type { StudySession } from '../../../domain/entities/StudySession.js';

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

class FakeExternalSourceRepository implements ExternalSourceRepository {
  store = new Map<string, ExternalSource>();
  async save(s: ExternalSource): Promise<void> {
    this.store.set(s.id, s);
  }
  async findById(id: string): Promise<ExternalSource | null> {
    return this.store.get(id) ?? null;
  }
  async findAll(): Promise<ExternalSource[]> {
    return [...this.store.values()];
  }
  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
  async findByUrl(url: string): Promise<ExternalSource[]> {
    return [...this.store.values()].filter((s) => s.url === url);
  }
  async findByIdentifier(identifier: string): Promise<ExternalSource[]> {
    return [...this.store.values()].filter((s) => s.identifier === identifier);
  }
}

class FakeExternalKnowledgeRepository implements ExternalKnowledgeRepository {
  store = new Map<string, ExternalKnowledge>();
  async save(k: ExternalKnowledge): Promise<void> {
    this.store.set(k.id, k);
  }
  async findById(id: string): Promise<ExternalKnowledge | null> {
    return this.store.get(id) ?? null;
  }
  async findAll(): Promise<ExternalKnowledge[]> {
    return [...this.store.values()];
  }
  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}

class FakeMealLogRepository implements MealLogRepository {
  store = new Map<string, MealLog>();
  async save(l: MealLog): Promise<void> {
    this.store.set(l.id, l);
  }
  async findAll(): Promise<MealLog[]> {
    return [...this.store.values()];
  }
}

class FakeNutritionLogRepository implements NutritionLogRepository {
  store = new Map<string, NutritionLog>();
  async save(l: NutritionLog): Promise<void> {
    this.store.set(l.id, l);
  }
  async findAll(): Promise<NutritionLog[]> {
    return [...this.store.values()];
  }
}

class FakeWeightLogRepository implements WeightLogRepository {
  store = new Map<string, WeightLog>();
  async save(l: WeightLog): Promise<void> {
    this.store.set(l.id, l);
  }
  async findAll(): Promise<WeightLog[]> {
    return [...this.store.values()];
  }
}

class FakeFinanceLogRepository implements FinanceLogRepository {
  store = new Map<string, FinanceLog>();
  async save(l: FinanceLog): Promise<void> {
    this.store.set(l.id, l);
  }
  async findAll(): Promise<FinanceLog[]> {
    return [...this.store.values()];
  }
}

class FakeStudySessionRepository implements StudySessionRepository {
  store = new Map<string, StudySession>();
  async save(s: StudySession): Promise<void> {
    this.store.set(s.id, s);
  }
  async findAll(): Promise<StudySession[]> {
    return [...this.store.values()];
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
  const sourceRepo = new FakeExternalSourceRepository();
  const knowledgeRepo = new FakeExternalKnowledgeRepository();
  const mealRepo = new FakeMealLogRepository();
  const nutritionRepo = new FakeNutritionLogRepository();
  const weightRepo = new FakeWeightLogRepository();
  const financeRepo = new FakeFinanceLogRepository();
  const studySessionRepo = new FakeStudySessionRepository();

  const importLogs = new ImportLogsUseCase(
    reflectionRepo,
    memoryRepo,
    inventoryRepo,
    appearanceRepo,
    skinRepo,
    purchaseRepo,
    challengeRepo,
    evaluationRepo,
    sourceRepo,
    knowledgeRepo,
    mealRepo,
    nutritionRepo,
    weightRepo,
    financeRepo,
    studySessionRepo,
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
    sourceRepo,
    knowledgeRepo,
    mealRepo,
    nutritionRepo,
    weightRepo,
    financeRepo,
    studySessionRepo,
  );

  return {
    importLogs,
    exportLogs,
    repos: { memoryRepo, skinRepo, purchaseRepo, sourceRepo, knowledgeRepo, mealRepo, nutritionRepo, weightRepo, financeRepo, studySessionRepo },
  };
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

  it('ExternalSourceとExternalKnowledgeをtype経由でインポートできる', async () => {
    const { results } = await useCases.importLogs.execute({
      logs: [
        { type: 'ExternalSource', data: { record: { sourceType: 'web', title: '記事A' } } },
        {
          type: 'ExternalKnowledge',
          data: { record: { title: '知識A', content: '本文A', capturedAt: '2026-07-13' } },
        },
      ],
    });
    expect(results.every((r) => r.ok)).toBe(true);
    expect(useCases.repos.sourceRepo.store.size).toBe(1);
    expect(useCases.repos.knowledgeRepo.store.size).toBe(1);
  });

  it('同一バッチ内で新規SourceのIDをKnowledgeが前方参照することはできない（ADR 0016）', async () => {
    const { results } = await useCases.importLogs.execute({
      logs: [
        {
          type: 'ExternalKnowledge',
          data: {
            record: {
              sourceId: 'まだ存在しないID',
              title: '知識A',
              content: '本文A',
              capturedAt: '2026-07-13',
            },
          },
        },
      ],
    });
    expect(results[0]?.ok).toBe(false);
    expect(results[0]?.error).toMatch(/ExternalSource not found/);
  });

  it('Version35で追加したMealLog/NutritionLog/WeightLog/FinanceLog/StudySessionをtype経由でインポートできる', async () => {
    const { results } = await useCases.importLogs.execute({
      logs: [
        { type: 'MealLog', data: { record: { occurredAt: '2026-07-19T12:00:00.000Z', items: ['米', '味噌汁'] } } },
        {
          type: 'NutritionLog',
          data: {
            record: {
              mealLogId: 'meal-1',
              calories: 500,
              proteinG: 20,
              fatG: 10,
              carbohydrateG: 60,
              fiberG: 3,
              saltG: 2,
              estimated: true,
              basis: 'ARCによる推定',
              confidence: 'medium',
            },
          },
        },
        { type: 'WeightLog', data: { record: { measuredAt: '2026-07-19T07:00:00.000Z', weightKg: 65 } } },
        { type: 'FinanceLog', data: { record: { occurredAt: '2026-07-19', type: 'Expense', category: '食費', amount: 1000 } } },
        {
          type: 'StudySession',
          data: {
            record: {
              sessionId: 'bridge-test-session-1',
              subject: '行政法',
              startedAt: '2026-07-19T09:00:00.000Z',
              endedAt: '2026-07-19T09:30:00.000Z',
              durationMs: 30 * 60 * 1000,
              source: 'bridge-import-test',
              clientCreatedAt: '2026-07-19T09:30:05.000Z',
            },
          },
        },
      ],
    });
    expect(results.every((r) => r.ok)).toBe(true);
    expect(useCases.repos.mealRepo.store.size).toBe(1);
    expect(useCases.repos.nutritionRepo.store.size).toBe(1);
    expect(useCases.repos.weightRepo.store.size).toBe(1);
    expect(useCases.repos.financeRepo.store.size).toBe(1);
    expect(useCases.repos.studySessionRepo.store.size).toBe(1);
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

  it('件数上限を超える場合はtruncatedがtrueになり、limitで切り詰められる（Version9の技術的負債への対応）', async () => {
    for (let i = 0; i < 5; i++) {
      await useCases.importLogs.execute({
        logs: [{ type: 'ChallengeLog', data: { record: { date: '2026-07-13', title: `#${i}` } } }],
      });
    }
    const { logs, truncated } = await useCases.exportLogs.execute({
      type: 'ChallengeLog',
      limit: 3,
    });
    expect(logs).toHaveLength(3);
    expect(truncated).toBe(true);
  });

  it('all: trueを指定すると件数上限を無視する', async () => {
    for (let i = 0; i < 5; i++) {
      await useCases.importLogs.execute({
        logs: [{ type: 'ChallengeLog', data: { record: { date: '2026-07-13', title: `#${i}` } } }],
      });
    }
    const { logs, truncated } = await useCases.exportLogs.execute({
      type: 'ChallengeLog',
      limit: 3,
      all: true,
    });
    expect(logs).toHaveLength(5);
    expect(truncated).toBe(false);
  });

  it('ExternalKnowledgeをstatus/topic/期間で絞り込める', async () => {
    await useCases.importLogs.execute({
      logs: [
        {
          type: 'ExternalKnowledge',
          data: {
            record: {
              title: 'A',
              content: '本文',
              capturedAt: '2026-07-01',
              topics: ['法律'],
              status: 'reviewed',
            },
          },
        },
        {
          type: 'ExternalKnowledge',
          data: { record: { title: 'B', content: '本文', capturedAt: '2026-07-10' } },
        },
      ],
    });

    const { logs } = await useCases.exportLogs.execute({
      type: 'ExternalKnowledge',
      status: 'reviewed',
    });
    expect(logs).toHaveLength(1);
  });

  it('ExternalSourceをsourceTypeで絞り込める', async () => {
    await useCases.importLogs.execute({
      logs: [
        { type: 'ExternalSource', data: { record: { sourceType: 'web', title: 'Web記事' } } },
        { type: 'ExternalSource', data: { record: { sourceType: 'book', title: '書籍' } } },
      ],
    });
    const { logs } = await useCases.exportLogs.execute({
      type: 'ExternalSource',
      sourceType: 'book',
    });
    expect(logs).toHaveLength(1);
  });

  it('Version35で追加したMealLog等をExportできる（インポートしたものがそのまま出力される）', async () => {
    await useCases.importLogs.execute({
      logs: [
        { type: 'WeightLog', data: { record: { measuredAt: '2026-07-19T07:00:00.000Z', weightKg: 65 } } },
        {
          type: 'StudySession',
          data: {
            record: {
              sessionId: 'bridge-export-test-session-1',
              subject: '民法',
              startedAt: '2026-07-19T10:00:00.000Z',
              endedAt: '2026-07-19T10:45:00.000Z',
              durationMs: 45 * 60 * 1000,
              source: 'bridge-export-test',
              clientCreatedAt: '2026-07-19T10:45:05.000Z',
            },
          },
        },
      ],
    });

    const weightExport = await useCases.exportLogs.execute({ type: 'WeightLog' });
    expect(weightExport.logs).toHaveLength(1);
    expect((weightExport.logs[0]?.data as { record: { weightKg: number } }).record.weightKg).toBe(65);

    const studySessionExport = await useCases.exportLogs.execute({ type: 'StudySession' });
    expect(studySessionExport.logs).toHaveLength(1);
  });
});
