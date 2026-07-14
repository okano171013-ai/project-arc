import { describe, it, expect, beforeEach } from 'vitest';
import { WriteProposalGatewayUseCase } from './WriteProposalGateway.js';
import type { Reflection } from '../../../domain/entities/Reflection.js';
import type { MemoryEntry } from '../../../domain/entities/MemoryEntry.js';
import type { ExternalKnowledge } from '../../../domain/entities/ExternalKnowledge.js';
import type { AppearanceLog } from '../../../domain/entities/AppearanceLog.js';
import type { ManagementFeedback } from '../../../domain/entities/ManagementFeedback.js';
import type { ExternalSource } from '../../../domain/entities/ExternalSource.js';
import type { ReflectionRepository } from '../../ports/ReflectionRepository.js';
import type { MemoryRepository } from '../../ports/MemoryRepository.js';
import type { ExternalKnowledgeRepository } from '../../ports/ExternalKnowledgeRepository.js';
import type { ExternalSourceRepository } from '../../ports/ExternalSourceRepository.js';
import type { AppearanceLogRepository } from '../../ports/AppearanceLogRepository.js';
import type { ManagementFeedbackRepository } from '../../ports/ManagementFeedbackRepository.js';

class FakeReflectionRepository implements ReflectionRepository {
  store = new Map<string, Reflection>();
  async save(reflection: Reflection): Promise<void> {
    this.store.set(reflection.date, reflection);
  }
  async findByDate(date: string): Promise<Reflection | null> {
    return this.store.get(date) ?? null;
  }
  async findRecent(limit: number): Promise<Reflection[]> {
    return [...this.store.values()].slice(0, limit);
  }
}

class FakeMemoryRepository implements MemoryRepository {
  store = new Map<string, MemoryEntry>();
  async save(entry: MemoryEntry): Promise<void> {
    this.store.set(entry.id, entry);
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

class FakeAppearanceLogRepository implements AppearanceLogRepository {
  store: AppearanceLog[] = [];
  async save(log: AppearanceLog): Promise<void> {
    this.store.push(log);
  }
  async findAll(): Promise<AppearanceLog[]> {
    return this.store;
  }
}

class FakeManagementFeedbackRepository implements ManagementFeedbackRepository {
  store = new Map<string, ManagementFeedback>();
  async save(feedback: ManagementFeedback): Promise<void> {
    this.store.set(feedback.id, feedback);
  }
  async findById(id: string): Promise<ManagementFeedback | null> {
    return this.store.get(id) ?? null;
  }
  async findAll(): Promise<ManagementFeedback[]> {
    return [...this.store.values()];
  }
}

function buildGateway() {
  const reflectionRepo = new FakeReflectionRepository();
  const memoryRepo = new FakeMemoryRepository();
  const knowledgeRepo = new FakeExternalKnowledgeRepository();
  const sourceRepo = new FakeExternalSourceRepository();
  const appearanceRepo = new FakeAppearanceLogRepository();
  const feedbackRepo = new FakeManagementFeedbackRepository();
  const gateway = new WriteProposalGatewayUseCase(
    reflectionRepo,
    memoryRepo,
    knowledgeRepo,
    sourceRepo,
    appearanceRepo,
    feedbackRepo,
  );
  return { gateway, reflectionRepo, memoryRepo, knowledgeRepo, sourceRepo, appearanceRepo, feedbackRepo };
}

describe('WriteProposalGatewayUseCase', () => {
  let ctx: ReturnType<typeof buildGateway>;

  beforeEach(() => {
    ctx = buildGateway();
  });

  it('createProposal stamps createdAt and never touches any repository (保存しない)', () => {
    const proposal = ctx.gateway.createProposal({
      type: 'Memory',
      target: '新しいMemory: シェーバー',
      payload: { record: { category: 'Assets', title: 'シェーバー', content: 'PHILIPS 5000' } },
      reason: '会話で言及されたため',
    });

    expect(proposal.createdAt).toBeTruthy();
    expect(ctx.memoryRepo.store.size).toBe(0);
  });

  it('createProposal rejects an invalid payload for the given type (構造検証)', () => {
    expect(() =>
      ctx.gateway.createProposal({
        type: 'Memory',
        target: '不正な提案',
        payload: { record: { title: '見出しのみ' } },
        reason: '理由',
      }),
    ).toThrow(/Invalid proposal payload for type Memory/);
  });

  it('createProposal rejects an empty reason (理由必須)', () => {
    expect(() =>
      ctx.gateway.createProposal({
        type: 'Memory',
        target: '対象',
        payload: { record: { category: 'Assets', title: 't', content: 'c' } },
        reason: '  ',
      }),
    ).toThrow('reason must not be empty');
  });

  it.each([
    [
      'Reflection' as const,
      { date: '2026-07-14', record: { proudOf: '勉強した' } },
      (ctx: ReturnType<typeof buildGateway>) => ctx.reflectionRepo.store.size,
    ],
    [
      'Memory' as const,
      { record: { category: 'Assets', title: 'シェーバー', content: 'PHILIPS 5000' } },
      (ctx: ReturnType<typeof buildGateway>) => ctx.memoryRepo.store.size,
    ],
    [
      'ExternalKnowledge' as const,
      { record: { title: 'タイトル', content: '内容', capturedAt: '2026-07-14' } },
      (ctx: ReturnType<typeof buildGateway>) => ctx.knowledgeRepo.store.size,
    ],
    [
      'Appearance' as const,
      { record: { date: '2026-07-14', overallRating: 4 } },
      (ctx: ReturnType<typeof buildGateway>) => ctx.appearanceRepo.store.length,
    ],
    [
      'ManagementFeedback' as const,
      { record: { author: 'ARC', category: 'Process', content: '内容', reason: '理由' } },
      (ctx: ReturnType<typeof buildGateway>) => ctx.feedbackRepo.store.size,
    ],
  ])('approveProposal persists a %s proposal via the corresponding UseCase (承認時の保存)', async (type, payload, countOf) => {
    const proposal = ctx.gateway.createProposal({
      type,
      target: `${type}の提案`,
      payload,
      reason: '理由',
    });
    expect(countOf(ctx)).toBe(0);

    const result = await ctx.gateway.approveProposal(proposal);
    expect(result.type).toBe(type);
    expect(countOf(ctx)).toBe(1);
  });

  it('rejectProposal persists nothing (却下時は保存しない)', () => {
    const proposal = ctx.gateway.createProposal({
      type: 'Memory',
      target: '対象',
      payload: { record: { category: 'Assets', title: 't', content: 'c' } },
      reason: '理由',
    });

    const result = ctx.gateway.rejectProposal(proposal);
    expect(result).toEqual({ rejected: true, type: 'Memory' });
    expect(ctx.memoryRepo.store.size).toBe(0);
  });
});
