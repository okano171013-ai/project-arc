import { describe, it, expect, beforeEach } from 'vitest';
import { ReadGatewayUseCase } from './ReadGateway.js';
import { Reflection } from '../../../domain/entities/Reflection.js';
import type { AppearanceLog } from '../../../domain/entities/AppearanceLog.js';
import type { SkinLog } from '../../../domain/entities/SkinLog.js';
import type { ChallengeLog } from '../../../domain/entities/ChallengeLog.js';
import type { Capture } from '../../../domain/entities/Capture.js';
import type { ThirdPersonEvaluation } from '../../../domain/entities/ThirdPersonEvaluation.js';
import { ExternalKnowledge } from '../../../domain/entities/ExternalKnowledge.js';
import type { ExternalSource } from '../../../domain/entities/ExternalSource.js';
import type { ReflectionRepository } from '../../ports/ReflectionRepository.js';
import type { AppearanceLogRepository } from '../../ports/AppearanceLogRepository.js';
import type { SkinLogRepository } from '../../ports/SkinLogRepository.js';
import type { PurchaseLogRepository } from '../../ports/PurchaseLogRepository.js';
import type { ChallengeLogRepository } from '../../ports/ChallengeLogRepository.js';
import type { CaptureRepository } from '../../ports/CaptureRepository.js';
import type { ThirdPersonEvaluationRepository } from '../../ports/ThirdPersonEvaluationRepository.js';
import type { ExternalKnowledgeRepository } from '../../ports/ExternalKnowledgeRepository.js';
import type { ExternalSourceRepository } from '../../ports/ExternalSourceRepository.js';

class FakeReflectionRepository implements ReflectionRepository {
  store = new Map<string, Reflection>();
  async save(reflection: Reflection): Promise<void> {
    this.store.set(reflection.date, reflection);
  }
  async findByDate(date: string): Promise<Reflection | null> {
    return this.store.get(date) ?? null;
  }
  async findRecent(limit: number): Promise<Reflection[]> {
    return [...this.store.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
  }
}

class FakeEmptyLogRepository<T> {
  store: T[] = [];
  async save(item: T): Promise<void> {
    this.store.push(item);
  }
  async findAll(): Promise<T[]> {
    return this.store;
  }
}

class FakeExternalKnowledgeRepository implements ExternalKnowledgeRepository {
  store = new Map<string, ExternalKnowledge>();
  async save(knowledge: ExternalKnowledge): Promise<void> {
    this.store.set(knowledge.id, knowledge);
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

class FakeExternalSourceRepository implements ExternalSourceRepository {
  store = new Map<string, ExternalSource>();
  async save(source: ExternalSource): Promise<void> {
    this.store.set(source.id, source);
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
  async findByUrl(): Promise<ExternalSource[]> {
    return [];
  }
  async findByIdentifier(): Promise<ExternalSource[]> {
    return [];
  }
}

function buildGateway(reflectionRepo: FakeReflectionRepository, knowledgeRepo: FakeExternalKnowledgeRepository, sourceRepo: FakeExternalSourceRepository) {
  return new ReadGatewayUseCase(
    reflectionRepo,
    new FakeEmptyLogRepository<AppearanceLog>() as unknown as AppearanceLogRepository,
    new FakeEmptyLogRepository<SkinLog>() as unknown as SkinLogRepository,
    { save: async () => {}, findAll: async () => [], findById: async () => null } as unknown as PurchaseLogRepository,
    new FakeEmptyLogRepository<ChallengeLog>() as unknown as ChallengeLogRepository,
    new FakeEmptyLogRepository<Capture>() as unknown as CaptureRepository,
    new FakeEmptyLogRepository<ThirdPersonEvaluation>() as unknown as ThirdPersonEvaluationRepository,
    knowledgeRepo,
    sourceRepo,
  );
}

describe('ReadGatewayUseCase', () => {
  let reflectionRepo: FakeReflectionRepository;
  let knowledgeRepo: FakeExternalKnowledgeRepository;
  let sourceRepo: FakeExternalSourceRepository;

  beforeEach(() => {
    reflectionRepo = new FakeReflectionRepository();
    knowledgeRepo = new FakeExternalKnowledgeRepository();
    sourceRepo = new FakeExternalSourceRepository();
  });

  it('rejects missing/invalid limit (limit必須)', async () => {
    const gateway = buildGateway(reflectionRepo, knowledgeRepo, sourceRepo);
    await expect(gateway.readReflection({ limit: 0 })).rejects.toThrow(
      'limit must be a positive integer',
    );
    await expect(gateway.readReflection({ limit: 1.5 })).rejects.toThrow(
      'limit must be a positive integer',
    );
  });

  it('rejects a limit above the max (全件取得禁止の上限)', async () => {
    const gateway = buildGateway(reflectionRepo, knowledgeRepo, sourceRepo);
    await expect(gateway.readReflection({ limit: 101 })).rejects.toThrow(
      'limit must not exceed 100',
    );
  });

  it('readReflection delegates to ReflectionRepository.findRecent (委譲確認)', async () => {
    await reflectionRepo.save(Reflection.create({ id: 'r1', date: '2026-07-10', record: {} }));
    await reflectionRepo.save(Reflection.create({ id: 'r2', date: '2026-07-11', record: {} }));

    const gateway = buildGateway(reflectionRepo, knowledgeRepo, sourceRepo);
    const { reflections } = await gateway.readReflection({ limit: 1 });
    expect(reflections).toHaveLength(1);
    expect(reflections[0]?.date).toBe('2026-07-11');
  });

  it('readTimeline delegates to GetTimelineUseCase and applies limit (Timeline委譲)', async () => {
    await reflectionRepo.save(Reflection.create({ id: 'r1', date: '2026-07-10', record: {} }));
    await reflectionRepo.save(Reflection.create({ id: 'r2', date: '2026-07-11', record: {} }));

    const gateway = buildGateway(reflectionRepo, knowledgeRepo, sourceRepo);
    const { entries } = await gateway.readTimeline({ limit: 1 });
    expect(entries).toHaveLength(1);
    expect(entries[0]?.date).toBe('2026-07-11');
  });

  it('readExternal delegates to RetrieveKnowledgeUseCase (External委譲)', async () => {
    knowledgeRepo.store.set(
      'k1',
      ExternalKnowledge.create({
        id: 'k1',
        record: { title: 'タイトル', content: '内容', capturedAt: '2026-07-01' },
      }),
    );

    const gateway = buildGateway(reflectionRepo, knowledgeRepo, sourceRepo);
    const { results } = await gateway.readExternal({ limit: 10 });
    expect(results).toHaveLength(1);
  });

  it('readDecision delegates to DecisionEngineUseCase and slices to limit (Decision委譲・limit適用)', async () => {
    knowledgeRepo.store.set(
      'k1',
      ExternalKnowledge.create({
        id: 'k1',
        record: { title: '行政法メモ', content: '内容', capturedAt: '2026-07-01', topics: ['行政法'] },
      }),
    );
    knowledgeRepo.store.set(
      'k2',
      ExternalKnowledge.create({
        id: 'k2',
        record: { title: '民訴法メモ', content: '内容', capturedAt: '2026-07-02', topics: ['民訴法'] },
      }),
    );

    const gateway = buildGateway(reflectionRepo, knowledgeRepo, sourceRepo);
    const { decisionContext, retrievedKnowledge } = await gateway.readDecision({
      question: '行政法と民訴法どっち？',
      limit: 1,
    });
    expect(decisionContext.candidates.sort()).toEqual(['民訴法', '行政法'].sort());
    expect(retrievedKnowledge.length).toBeLessThanOrEqual(1);
  });
});
