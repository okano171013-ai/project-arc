import { describe, it, expect, beforeEach } from 'vitest';
import { WriteProposalGatewayUseCase } from './WriteProposalGateway.js';
import type { Reflection } from '../../../domain/entities/Reflection.js';
import type { MemoryEntry } from '../../../domain/entities/MemoryEntry.js';
import type { ExternalKnowledge } from '../../../domain/entities/ExternalKnowledge.js';
import type { AppearanceLog } from '../../../domain/entities/AppearanceLog.js';
import type { ManagementFeedback } from '../../../domain/entities/ManagementFeedback.js';
import type { AgentMessage } from '../../../domain/entities/AgentMessage.js';
import type { ExternalSource } from '../../../domain/entities/ExternalSource.js';
import type { ReflectionRepository } from '../../ports/ReflectionRepository.js';
import type { MemoryRepository } from '../../ports/MemoryRepository.js';
import type { ExternalKnowledgeRepository } from '../../ports/ExternalKnowledgeRepository.js';
import type { ExternalSourceRepository } from '../../ports/ExternalSourceRepository.js';
import type { AppearanceLogRepository } from '../../ports/AppearanceLogRepository.js';
import type { ManagementFeedbackRepository } from '../../ports/ManagementFeedbackRepository.js';
import type { AgentMessageRepository } from '../../ports/AgentMessageRepository.js';
import type { ApprovalDecision } from '../../../domain/entities/ApprovalDecision.js';
import type { ApprovalDecisionRepository } from '../../ports/ApprovalDecisionRepository.js';
import type { ChallengeLog } from '../../../domain/entities/ChallengeLog.js';
import type { ChallengeLogRepository } from '../../ports/ChallengeLogRepository.js';
import { AgentDelegationGrant } from '../../../domain/entities/AgentDelegationGrant.js';
import type { AgentDelegationGrantRepository } from '../../ports/AgentDelegationGrantRepository.js';
import type { MealLog } from '../../../domain/entities/MealLog.js';
import type { MealLogRepository } from '../../ports/MealLogRepository.js';
import type { NutritionLog } from '../../../domain/entities/NutritionLog.js';
import type { NutritionLogRepository } from '../../ports/NutritionLogRepository.js';
import type { WeightLog } from '../../../domain/entities/WeightLog.js';
import type { WeightLogRepository } from '../../ports/WeightLogRepository.js';
import type { FinanceLog } from '../../../domain/entities/FinanceLog.js';
import type { FinanceLogRepository } from '../../ports/FinanceLogRepository.js';

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

class FakeAgentMessageRepository implements AgentMessageRepository {
  store = new Map<string, AgentMessage>();
  async save(message: AgentMessage): Promise<void> {
    this.store.set(message.id, message);
  }
  async findById(id: string): Promise<AgentMessage | null> {
    return this.store.get(id) ?? null;
  }
  async findAll(): Promise<AgentMessage[]> {
    return [...this.store.values()];
  }
}

class FakeApprovalDecisionRepository implements ApprovalDecisionRepository {
  store: ApprovalDecision[] = [];
  async save(decision: ApprovalDecision): Promise<void> {
    this.store.push(decision);
  }
  async findAll(): Promise<ApprovalDecision[]> {
    return this.store;
  }
}

class FakeChallengeLogRepository implements ChallengeLogRepository {
  store: ChallengeLog[] = [];
  async save(log: ChallengeLog): Promise<void> {
    this.store.push(log);
  }
  async findAll(): Promise<ChallengeLog[]> {
    return this.store;
  }
}

class FakeAgentDelegationGrantRepository implements AgentDelegationGrantRepository {
  store = new Map<string, AgentDelegationGrant>();
  async save(grant: AgentDelegationGrant): Promise<void> {
    this.store.set(grant.id, grant);
  }
  async findById(id: string): Promise<AgentDelegationGrant | null> {
    return this.store.get(id) ?? null;
  }
  async findAll(): Promise<AgentDelegationGrant[]> {
    return [...this.store.values()];
  }
}

class FakeMealLogRepository implements MealLogRepository {
  store: MealLog[] = [];
  async save(log: MealLog): Promise<void> {
    this.store.push(log);
  }
  async findAll(): Promise<MealLog[]> {
    return this.store;
  }
}

class FakeNutritionLogRepository implements NutritionLogRepository {
  store: NutritionLog[] = [];
  async save(log: NutritionLog): Promise<void> {
    this.store.push(log);
  }
  async findAll(): Promise<NutritionLog[]> {
    return this.store;
  }
}

class FakeWeightLogRepository implements WeightLogRepository {
  store: WeightLog[] = [];
  async save(log: WeightLog): Promise<void> {
    this.store.push(log);
  }
  async findAll(): Promise<WeightLog[]> {
    return this.store;
  }
}

class FakeFinanceLogRepository implements FinanceLogRepository {
  store: FinanceLog[] = [];
  async save(log: FinanceLog): Promise<void> {
    this.store.push(log);
  }
  async findAll(): Promise<FinanceLog[]> {
    return this.store;
  }
}

function buildGateway() {
  const reflectionRepo = new FakeReflectionRepository();
  const memoryRepo = new FakeMemoryRepository();
  const knowledgeRepo = new FakeExternalKnowledgeRepository();
  const sourceRepo = new FakeExternalSourceRepository();
  const appearanceRepo = new FakeAppearanceLogRepository();
  const feedbackRepo = new FakeManagementFeedbackRepository();
  const agentMessageRepo = new FakeAgentMessageRepository();
  const approvalDecisionRepo = new FakeApprovalDecisionRepository();
  const challengeLogRepo = new FakeChallengeLogRepository();
  const agentDelegationGrantRepo = new FakeAgentDelegationGrantRepository();
  const mealLogRepo = new FakeMealLogRepository();
  const nutritionLogRepo = new FakeNutritionLogRepository();
  const weightLogRepo = new FakeWeightLogRepository();
  const financeLogRepo = new FakeFinanceLogRepository();
  const gateway = new WriteProposalGatewayUseCase(
    reflectionRepo,
    memoryRepo,
    knowledgeRepo,
    sourceRepo,
    appearanceRepo,
    feedbackRepo,
    agentMessageRepo,
    approvalDecisionRepo,
    challengeLogRepo,
    agentDelegationGrantRepo,
    mealLogRepo,
    nutritionLogRepo,
    weightLogRepo,
    financeLogRepo,
  );
  return {
    gateway,
    reflectionRepo,
    memoryRepo,
    knowledgeRepo,
    sourceRepo,
    appearanceRepo,
    feedbackRepo,
    agentMessageRepo,
    approvalDecisionRepo,
    challengeLogRepo,
    agentDelegationGrantRepo,
    mealLogRepo,
    nutritionLogRepo,
    weightLogRepo,
    financeLogRepo,
  };
}

describe('WriteProposalGatewayUseCase', () => {
  let ctx: ReturnType<typeof buildGateway>;

  beforeEach(() => {
    ctx = buildGateway();
  });

  it('createProposal stamps createdAt and never touches any repository (保存しない)', async () => {
    const proposal = await ctx.gateway.createProposal({
      type: 'Memory',
      target: '新しいMemory: シェーバー',
      payload: { record: { category: 'Assets', title: 'シェーバー', content: 'PHILIPS 5000' } },
      reason: '会話で言及されたため',
    });

    expect(proposal.createdAt).toBeTruthy();
    expect(ctx.memoryRepo.store.size).toBe(0);
  });

  it('createProposal rejects an invalid payload for the given type (構造検証)', async () => {
    await expect(
      ctx.gateway.createProposal({
        type: 'Memory',
        target: '不正な提案',
        payload: { record: { title: '見出しのみ' } },
        reason: '理由',
      }),
    ).rejects.toThrow(/Invalid proposal payload for type Memory/);
  });

  it('createProposal rejects an empty reason (理由必須)', async () => {
    await expect(
      ctx.gateway.createProposal({
        type: 'Memory',
        target: '対象',
        payload: { record: { category: 'Assets', title: 't', content: 'c' } },
        reason: '  ',
      }),
    ).rejects.toThrow('reason must not be empty');
  });

  it('createProposal classifies via signals and records a Proposed ApprovalDecision (Version21: 分類・監査記録)', async () => {
    const proposal = await ctx.gateway.createProposal({
      type: 'Memory',
      target: '対象',
      payload: { record: { category: 'Assets', title: 't', content: 'c' } },
      reason: '理由',
      signals: { costImpact: true },
    });

    expect(proposal.approvalLevel).toBe('Level2');
    expect(ctx.approvalDecisionRepo.store).toHaveLength(1);
    expect(ctx.approvalDecisionRepo.store[0]?.record).toMatchObject({
      stage: 'Proposed',
      level: 'Level2',
      triggeredSignals: ['costImpact'],
    });
  });

  it('createProposal escalates to Level1 when signals are omitted (未申告のエスカレーション)', async () => {
    const proposal = await ctx.gateway.createProposal({
      type: 'Memory',
      target: '対象',
      payload: { record: { category: 'Assets', title: 't', content: 'c' } },
      reason: '理由',
    });

    expect(proposal.approvalLevel).toBe('Level1');
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
    [
      'AgentMessage' as const,
      { record: { direction: 'ToClaudeCode', content: '指示書の内容' } },
      (ctx: ReturnType<typeof buildGateway>) => ctx.agentMessageRepo.store.size,
    ],
    [
      'MealLog' as const,
      { record: { occurredAt: '2026-07-17T12:00:00.000Z', items: ['味噌汁', 'ご飯'] } },
      (ctx: ReturnType<typeof buildGateway>) => ctx.mealLogRepo.store.length,
    ],
    [
      'NutritionLog' as const,
      {
        record: {
          mealLogId: 'm-1',
          calories: 600,
          estimated: true,
          basis: '写真からの推定',
          confidence: 'medium',
        },
      },
      (ctx: ReturnType<typeof buildGateway>) => ctx.nutritionLogRepo.store.length,
    ],
    [
      'WeightLog' as const,
      { record: { measuredAt: '2026-07-17T07:00:00.000Z', weightKg: 68.5 } },
      (ctx: ReturnType<typeof buildGateway>) => ctx.weightLogRepo.store.length,
    ],
    [
      'FinanceLog' as const,
      { record: { occurredAt: '2026-07-17T12:00:00.000Z', type: 'Expense', amount: 1200 } },
      (ctx: ReturnType<typeof buildGateway>) => ctx.financeLogRepo.store.length,
    ],
  ])('approveProposal persists a %s proposal via the corresponding UseCase (承認時の保存)', async (type, payload, countOf) => {
    const proposal = await ctx.gateway.createProposal({
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

  it('rejectProposal persists nothing (却下時は保存しない)', async () => {
    const proposal = await ctx.gateway.createProposal({
      type: 'Memory',
      target: '対象',
      payload: { record: { category: 'Assets', title: 't', content: 'c' } },
      reason: '理由',
    });

    const result = await ctx.gateway.rejectProposal(proposal);
    expect(result).toEqual({ rejected: true, type: 'Memory' });
    expect(ctx.memoryRepo.store.size).toBe(0);
  });

  it('approveProposal recomputes the level from signals server-side, ignoring a spoofed approvalLevel (Version21: level詐称の無効化)', async () => {
    const proposal = await ctx.gateway.createProposal({
      type: 'Memory',
      target: '対象',
      payload: { record: { category: 'Assets', title: 't', content: 'c' } },
      reason: '理由',
      signals: { destructive: true },
    });
    expect(proposal.approvalLevel).toBe('Level2');

    // クライアントが表示用フィールドだけをLevel0へ書き換えて再送しても、
    // 監査ログにはsignalsから再計算した本当のLevel2が記録される。
    const spoofed = { ...proposal, approvalLevel: 'Level0' as const };
    await ctx.gateway.approveProposal(spoofed);

    const approved = ctx.approvalDecisionRepo.store.find((d) => d.record.stage === 'Approved');
    expect(approved?.record.level).toBe('Level2');
  });

  it('approveProposal and rejectProposal each record an ApprovalDecision (承認・却下の監査記録)', async () => {
    const proposal = await ctx.gateway.createProposal({
      type: 'Memory',
      target: '承認される提案',
      payload: { record: { category: 'Assets', title: 't', content: 'c' } },
      reason: '理由',
    });
    await ctx.gateway.approveProposal(proposal);

    const rejected = await ctx.gateway.createProposal({
      type: 'Memory',
      target: '却下される提案',
      payload: { record: { category: 'Assets', title: 't', content: 'c' } },
      reason: '理由',
    });
    await ctx.gateway.rejectProposal(rejected);

    const stages = ctx.approvalDecisionRepo.store.map((d) => d.record.stage);
    expect(stages).toEqual(['Proposed', 'Approved', 'Proposed', 'Rejected']);
  });

  describe('AgentDelegationGrant auto-approval (Version24, Constitution第4条限定改定)', () => {
    async function seedGrant(
      ctx2: ReturnType<typeof buildGateway>,
      overrides: Partial<{
        usageLimit: number;
        scope: ('Reflection' | 'ChallengeLog' | 'MealLog' | 'NutritionLog' | 'WeightLog' | 'FinanceLog')[];
      }> = {},
    ) {
      const grant = AgentDelegationGrant.create({
        id: 'grant-1',
        record: {
          scope: overrides.scope ?? ['Reflection'],
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          usageLimit: overrides.usageLimit ?? 5,
          reason: 'テスト用委譲',
        },
      });
      await ctx2.agentDelegationGrantRepo.save(grant);
      return grant;
    }

    it('auto-approves a Reflection proposal when a valid grant covers it (有効なGrantでの自動承認)', async () => {
      await seedGrant(ctx);
      const proposal = await ctx.gateway.createProposal({
        type: 'Reflection',
        target: '今日の振り返り',
        payload: { date: '2026-07-16', record: { proudOf: '勉強した' } },
        reason: 'Owner本人の発言をそのまま書き写し',
      });

      expect(proposal.autoApproved).toBe(true);
      expect(proposal.result).toBeTruthy();
      expect(ctx.reflectionRepo.store.size).toBe(1);

      const decision = ctx.approvalDecisionRepo.store.find((d) => d.record.target === '今日の振り返り');
      expect(decision?.record.stage).toBe('Approved');
      expect(decision?.record.approver).toBe('auto-save');
    });

    it('does not auto-approve when no grant exists (Grant不在時は従来通りOwner do待ち)', async () => {
      const proposal = await ctx.gateway.createProposal({
        type: 'Reflection',
        target: '今日の振り返り',
        payload: { date: '2026-07-16', record: { proudOf: '勉強した' } },
        reason: '理由',
      });

      expect(proposal.autoApproved).toBeUndefined();
      expect(ctx.reflectionRepo.store.size).toBe(0);
    });

    it('does not auto-approve a Level2-classified proposal even with a valid grant (Level2はGrantより優先)', async () => {
      await seedGrant(ctx);
      const proposal = await ctx.gateway.createProposal({
        type: 'Reflection',
        target: '今日の振り返り',
        payload: { date: '2026-07-16', record: { proudOf: '勉強した' } },
        reason: '理由',
        signals: { personalDataExternalTransfer: true },
      });

      expect(proposal.autoApproved).toBeUndefined();
      expect(ctx.reflectionRepo.store.size).toBe(0);
    });

    it('never auto-approves an AgentDelegationGrant proposal itself, even if an (irrelevant) grant exists (Grant自身の自動承認は不可)', async () => {
      await seedGrant(ctx);
      const proposal = await ctx.gateway.createProposal({
        type: 'AgentDelegationGrant',
        target: '新しい委譲',
        payload: {
          action: 'create',
          record: { scope: ['Reflection'], expiresAt: new Date(Date.now() + 1000).toISOString(), usageLimit: 1, reason: 'テスト' },
        },
        reason: '理由',
      });

      expect(proposal.autoApproved).toBeUndefined();
      expect(proposal.approvalLevel).toBe('Level2');
    });

    it('stops auto-approving once usageLimit is reached (上限到達後はOwner do待ちへフォールバック)', async () => {
      await seedGrant(ctx, { usageLimit: 1 });

      const first = await ctx.gateway.createProposal({
        type: 'Reflection',
        target: '1件目',
        payload: { date: '2026-07-16', record: { proudOf: 'A' } },
        reason: '理由',
      });
      expect(first.autoApproved).toBe(true);

      const second = await ctx.gateway.createProposal({
        type: 'Reflection',
        target: '2件目',
        payload: { date: '2026-07-17', record: { proudOf: 'B' } },
        reason: '理由',
      });
      expect(second.autoApproved).toBeUndefined();
      expect(ctx.reflectionRepo.store.size).toBe(1);
    });

    it('rejects a second approveProposal call on an already auto-approved proposal (重複防止)', async () => {
      await seedGrant(ctx);
      const proposal = await ctx.gateway.createProposal({
        type: 'Reflection',
        target: '今日の振り返り',
        payload: { date: '2026-07-16', record: { proudOf: '勉強した' } },
        reason: '理由',
      });
      expect(proposal.autoApproved).toBe(true);

      await expect(ctx.gateway.approveProposal(proposal)).rejects.toThrow(
        'This proposal was already auto-approved',
      );
      expect(ctx.reflectionRepo.store.size).toBe(1);
    });

    it('does not auto-approve ChallengeLog when the grant scope excludes it (scope外は対象外)', async () => {
      // scopeをReflectionのみに限定した委譲では、ChallengeLogは対象外のまま。
      await seedGrant(ctx, { scope: ['Reflection'] });
      const proposal = await ctx.gateway.createProposal({
        type: 'ChallengeLog',
        target: '初めての体験',
        payload: { record: { date: '2026-07-16', title: '初めての体験' } },
        reason: '理由',
      });

      expect(proposal.autoApproved).toBeUndefined();
      expect(ctx.challengeLogRepo.store).toHaveLength(0);
    });

    it.each([
      [
        'MealLog' as const,
        { record: { occurredAt: '2026-07-17T12:00:00.000Z', items: ['味噌汁'] } },
        (ctx2: ReturnType<typeof buildGateway>) => ctx2.mealLogRepo.store.length,
      ],
      [
        'NutritionLog' as const,
        {
          record: {
            mealLogId: 'm-1',
            calories: 600,
            estimated: true,
            basis: '写真からの推定',
            confidence: 'medium',
          },
        },
        (ctx2: ReturnType<typeof buildGateway>) => ctx2.nutritionLogRepo.store.length,
      ],
      [
        'WeightLog' as const,
        { record: { measuredAt: '2026-07-17T07:00:00.000Z', weightKg: 68.5 } },
        (ctx2: ReturnType<typeof buildGateway>) => ctx2.weightLogRepo.store.length,
      ],
      [
        'FinanceLog' as const,
        { record: { occurredAt: '2026-07-17T12:00:00.000Z', type: 'Expense', amount: 1200 } },
        (ctx2: ReturnType<typeof buildGateway>) => ctx2.financeLogRepo.store.length,
      ],
    ])(
      'auto-approves a %s proposal when a valid grant covers it (Version25: Life Log Phase 2の自動承認)',
      async (type, payload, countOf) => {
        await seedGrant(ctx, { scope: [type] });
        const proposal = await ctx.gateway.createProposal({
          type,
          target: `${type}の提案`,
          payload,
          reason: 'ARCによる記録',
        });

        expect(proposal.autoApproved).toBe(true);
        expect(countOf(ctx)).toBe(1);
      },
    );

    it.each([
      ['MealLog' as const, { record: { occurredAt: '2026-07-17T12:00:00.000Z', items: ['味噌汁'] } }],
      [
        'NutritionLog' as const,
        {
          record: {
            mealLogId: 'm-1',
            calories: 600,
            estimated: true,
            basis: '写真からの推定',
            confidence: 'medium',
          },
        },
      ],
      ['WeightLog' as const, { record: { measuredAt: '2026-07-17T07:00:00.000Z', weightKg: 68.5 } }],
      [
        'FinanceLog' as const,
        { record: { occurredAt: '2026-07-17T12:00:00.000Z', type: 'Expense', amount: 1200 } },
      ],
    ])(
      'does not auto-approve %s when the grant scope excludes it (scope外は対象外、Version25)',
      async (type, payload) => {
        await seedGrant(ctx, { scope: ['Reflection'] });
        const proposal = await ctx.gateway.createProposal({
          type,
          target: `${type}の提案`,
          payload,
          reason: 'ARCによる記録',
        });

        expect(proposal.autoApproved).toBeUndefined();
      },
    );
  });
});
