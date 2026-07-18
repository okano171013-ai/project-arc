import { z } from 'zod';
import type { Proposal, ProposalType } from '../../../domain/value-objects/Proposal.js';
import type { ApprovalSignals } from '../../../domain/value-objects/ApprovalLevel.js';
import type { ReflectionRepository } from '../../ports/ReflectionRepository.js';
import type { MemoryRepository } from '../../ports/MemoryRepository.js';
import type { ExternalKnowledgeRepository } from '../../ports/ExternalKnowledgeRepository.js';
import type { ExternalSourceRepository } from '../../ports/ExternalSourceRepository.js';
import type { AppearanceLogRepository } from '../../ports/AppearanceLogRepository.js';
import type { ManagementFeedbackRepository } from '../../ports/ManagementFeedbackRepository.js';
import type { AgentMessageRepository } from '../../ports/AgentMessageRepository.js';
import type { ApprovalDecisionRepository } from '../../ports/ApprovalDecisionRepository.js';
import type { ChallengeLogRepository } from '../../ports/ChallengeLogRepository.js';
import type { AgentDelegationGrantRepository } from '../../ports/AgentDelegationGrantRepository.js';
import type { MealLogRepository } from '../../ports/MealLogRepository.js';
import type { NutritionLogRepository } from '../../ports/NutritionLogRepository.js';
import type { WeightLogRepository } from '../../ports/WeightLogRepository.js';
import type { FinanceLogRepository } from '../../ports/FinanceLogRepository.js';
import type { CheckInRepository } from '../../ports/CheckInRepository.js';
import type { DistractionSignalRepository } from '../../ports/DistractionSignalRepository.js';
import type { InterventionRepository } from '../../ports/InterventionRepository.js';
import type { InterventionPolicySettingsRepository } from '../../ports/InterventionPolicySettingsRepository.js';
import { RecordDailyReflectionUseCase } from '../reflection/RecordDailyReflection.js';
import { AddMemoryEntryUseCase } from '../memory/AddMemoryEntry.js';
import { AddExternalKnowledgeUseCase } from '../external-knowledge/AddExternalKnowledge.js';
import { AddAppearanceLogUseCase } from '../appearance/AddAppearanceLog.js';
import { AddManagementFeedbackUseCase } from '../management-feedback/AddManagementFeedback.js';
import { AddAgentMessageUseCase } from '../agent-message/AddAgentMessage.js';
import { AddChallengeLogUseCase } from '../challenge/AddChallengeLog.js';
import { ManageAgentDelegationGrantUseCase } from '../agent-delegation-grant/ManageAgentDelegationGrant.js';
import { AddMealLogUseCase } from '../meal/AddMealLog.js';
import { AddNutritionLogUseCase } from '../nutrition/AddNutritionLog.js';
import { AddWeightLogUseCase } from '../weight/AddWeightLog.js';
import { AddFinanceLogUseCase } from '../finance/AddFinanceLog.js';
import { AddCheckInUseCase } from '../check-in/AddCheckIn.js';
import { AddDistractionSignalUseCase } from '../distraction-signal/AddDistractionSignal.js';
import { RespondToInterventionUseCase } from '../intervention/RespondToIntervention.js';
import { UpdateInterventionPolicySettingsUseCase } from '../intervention-policy/UpdateInterventionPolicySettings.js';
import { ClassifyApprovalLevelUseCase } from '../approval-policy/ClassifyApprovalLevel.js';
import { RecordApprovalDecisionUseCase } from '../approval-policy/RecordApprovalDecision.js';

/**
 * Version24で導入、Version25・Version26で拡張：この8型のみ、有効な
 * AgentDelegationGrantがあれば自動承認の対象になりうる。
 * `AgentDelegationGrant`自体・`InterventionPolicySettings`・
 * `InterventionResponse`は絶対に含めない（型固定Level2ルールと
 * 合わせた二重の安全装置、ADR 0051/0053）——`InterventionResponse`
 * （却下・スヌーズ等）の自動化はOwner確認前に広げない、という
 * Version26の明示的な判断（`docs/reports/Version26_Report.md`参照）。
 */
const AUTO_APPROVABLE_TYPES: readonly ProposalType[] = [
  'Reflection',
  'ChallengeLog',
  'MealLog',
  'NutritionLog',
  'WeightLog',
  'FinanceLog',
  'CheckIn',
  'DistractionSignal',
];

/**
 * typeごとのpayload構造だけを検証するzodスキーマ。ここでの検証は
 * 「必須フィールドの有無・型が正しいか」という構造チェックに留まり、
 * 「内容が正しいか・重要か」の判断は一切行わない（Constitution第2条）。
 * 業務ルール（例: Reflectionの日付重複チェック）は既存UseCase側の
 * ロジックにそのまま委ねる。
 */
const payloadSchemas: Record<ProposalType, z.ZodTypeAny> = {
  Reflection: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
    record: z.record(z.unknown()),
  }),
  Memory: z.object({
    record: z.object({
      category: z.enum([
        'Assets',
        'Appearance',
        'Goals',
        'Preferences',
        'Education',
        'Career',
        'Health',
        'Finance',
        'Relationships',
        'Misc',
      ]),
      title: z.string().min(1),
      content: z.string(),
      tags: z.array(z.string()).optional(),
    }),
  }),
  ExternalKnowledge: z.object({
    record: z.object({
      sourceId: z.string().optional(),
      title: z.string().min(1),
      content: z.string().min(1),
      ownerSummary: z.string().optional(),
      ownerComment: z.string().optional(),
      topics: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      purpose: z.string().optional(),
      confidence: z.enum(['unassessed', 'low', 'medium', 'high']).optional(),
      status: z.enum(['inbox', 'reviewed', 'archived']).optional(),
      capturedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'capturedAt must be YYYY-MM-DD'),
      occurredAt: z.string().optional(),
      relatedKnowledgeIds: z.array(z.string()).optional(),
    }),
  }),
  Appearance: z.object({
    record: z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
      overallRating: z.number().min(1).max(5),
      skin: z.string().optional(),
      hair: z.string().optional(),
      beard: z.string().optional(),
      outfit: z.string().optional(),
      physique: z.string().optional(),
      comment: z.string().optional(),
      improvementSuggestions: z.string().optional(),
      photoPath: z.string().optional(),
    }),
  }),
  ManagementFeedback: z.object({
    record: z.object({
      author: z.string().min(1),
      category: z.string().min(1),
      content: z.string().min(1),
      reason: z.string().min(1),
      tags: z.array(z.string()).optional(),
    }),
  }),
  AgentMessage: z.object({
    record: z.object({
      direction: z.enum(['ToClaudeCode', 'ToARC']),
      content: z.string().min(1),
      relatedVersion: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }),
  }),
  ChallengeLog: z.object({
    record: z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
      title: z.string().min(1),
      category: z.string().optional(),
      note: z.string().optional(),
      estimated: z.boolean().optional(),
      estimationBasis: z.string().optional(),
      confidence: z.enum(['low', 'medium', 'high']).optional(),
    }),
  }),
  AgentDelegationGrant: z.object({
    action: z.enum(['create', 'pause', 'resume', 'revoke']),
    record: z
      .object({
        scope: z
          .array(
            z.enum([
              'Reflection',
              'ChallengeLog',
              'MealLog',
              'NutritionLog',
              'WeightLog',
              'FinanceLog',
              'CheckIn',
              'DistractionSignal',
            ]),
          )
          .min(1),
        expiresAt: z.string(),
        usageLimit: z.number().positive(),
        reason: z.string().min(1),
      })
      .optional(),
    id: z.string().optional(),
  }),
  MealLog: z.object({
    record: z.object({
      occurredAt: z.string(),
      mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'other']).optional(),
      items: z.array(z.string()).min(1),
      portion: z.string().optional(),
      source: z.string().optional(),
      notes: z.string().optional(),
      photoPath: z.string().optional(),
      idempotencyKey: z.string().optional(),
      estimated: z.boolean().optional(),
      estimationBasis: z.string().optional(),
      confidence: z.enum(['low', 'medium', 'high']).optional(),
    }),
  }),
  NutritionLog: z.object({
    record: z.object({
      mealLogId: z.string().min(1),
      calories: z.number().optional(),
      proteinG: z.number().optional(),
      fatG: z.number().optional(),
      carbohydrateG: z.number().optional(),
      fiberG: z.number().optional(),
      saltG: z.number().optional(),
      estimated: z.boolean(),
      basis: z.string().min(1),
      confidence: z.enum(['low', 'medium', 'high']).optional(),
      uncertaintyNote: z.string().optional(),
      idempotencyKey: z.string().optional(),
    }),
  }),
  WeightLog: z.object({
    record: z.object({
      measuredAt: z.string(),
      weightKg: z.number(),
      measurementContext: z.string().optional(),
      source: z.string().optional(),
      notes: z.string().optional(),
      idempotencyKey: z.string().optional(),
    }),
  }),
  FinanceLog: z.object({
    record: z.object({
      occurredAt: z.string(),
      type: z.enum(['Income', 'Expense']),
      amount: z.number(),
      currency: z.string().optional(),
      category: z.string().optional(),
      paymentMethod: z.string().optional(),
      merchantOrSource: z.string().optional(),
      notes: z.string().optional(),
      idempotencyKey: z.string().optional(),
    }),
  }),
  CheckIn: z.object({
    record: z.object({
      occurredAt: z.string(),
      currentActivity: z.string().min(1),
      alignedWithTopPriority: z.boolean().optional(),
      nextTwoHourGoal: z.string().min(1),
      previousGoalStatus: z.enum(['achieved', 'partial', 'missed']).optional(),
      missedReason: z.string().optional(),
      correctiveAction: z.string().optional(),
      resumeAt: z.string().optional(),
      notes: z.string().optional(),
      idempotencyKey: z.string().optional(),
      estimated: z.boolean().optional(),
      estimationBasis: z.string().optional(),
      confidence: z.enum(['low', 'medium', 'high']).optional(),
    }),
  }),
  DistractionSignal: z.object({
    record: z.object({
      occurredAt: z.string(),
      kind: z.enum([
        'YouTube',
        'SNS',
        'AimlessSearch',
        'LongBreak',
        'EasyTaskEscape',
        'NoTimerAtLibrary',
        'ScheduledTaskNotStarted',
        'Other',
      ]),
      source: z.enum(['OwnerReported', 'ExternalMetric', 'ARCInference']),
      basis: z.string().min(1),
      confidence: z.enum(['low', 'medium', 'high']),
      metricValue: z.number().optional(),
      metricUnit: z.string().optional(),
      notes: z.string().optional(),
      idempotencyKey: z.string().optional(),
    }),
  }),
  InterventionResponse: z.object({
    action: z.enum(['acknowledge', 'dismiss', 'snooze']),
    id: z.string().min(1),
    note: z.string().optional(),
    snoozeUntil: z.string().optional(),
    resumedActivityAt: z.string().optional(),
  }),
  InterventionPolicySettings: z.object({
    record: z.object({
      checkInIntervalMinutes: z.number().int().positive(),
      activeHoursStart: z.string(),
      activeHoursEnd: z.string(),
      quietHoursStart: z.string(),
      quietHoursEnd: z.string(),
      dailyNotificationLimit: z.number().int().positive(),
      minDistractionConfidenceForWarning: z.enum(['low', 'medium', 'high']),
      dedupWindowMinutes: z.number().int().positive(),
      dismissCooldownHours: z.number().int().positive(),
      exclusionWindows: z.array(
        z.object({
          reason: z.enum(['class', 'commute', 'sleep', 'medical', 'other']),
          start: z.string(),
          end: z.string(),
          note: z.string().optional(),
        }),
      ),
    }),
  }),
};

export interface CreateProposalInput {
  type: ProposalType;
  target: string;
  payload: Record<string, unknown>;
  reason: string;
  /**
   * Version21（Approval Policy Engine）。省略可——省略時は
   * ClassifyApprovalLevelUseCaseがLevel1へエスカレーションする。
   */
  signals?: ApprovalSignals;
}

export interface ApproveProposalOutput {
  type: ProposalType;
  result: unknown;
}

export interface RejectProposalOutput {
  rejected: true;
  type: ProposalType;
}

/**
 * WriteProposalGatewayUseCase（Version14、Write Proposal Layer）
 *
 * ARC → Proposal → Owner承認 → Project ARC（書き込み） という指示書の
 * 流れをそのまま実装する。`createProposal`はProposalを組み立てて返す
 * だけで保存しない。`approveProposal`はOwnerが明示的に承認したProposal
 * （payload全体を再送されたもの）を受け取ったときのみ、対応する既存
 * UseCaseを1回呼び出す。それ以外の経路でRepositoryへ書き込む手段は
 * 持たない（Constitution第2条・第4条、ADR 0031）。
 */
export class WriteProposalGatewayUseCase {
  private readonly recordDailyReflection: RecordDailyReflectionUseCase;
  private readonly addMemoryEntry: AddMemoryEntryUseCase;
  private readonly addExternalKnowledge: AddExternalKnowledgeUseCase;
  private readonly addAppearanceLog: AddAppearanceLogUseCase;
  private readonly addManagementFeedback: AddManagementFeedbackUseCase;
  private readonly addAgentMessage: AddAgentMessageUseCase;
  private readonly addChallengeLog: AddChallengeLogUseCase;
  private readonly manageAgentDelegationGrant: ManageAgentDelegationGrantUseCase;
  private readonly addMealLog: AddMealLogUseCase;
  private readonly addNutritionLog: AddNutritionLogUseCase;
  private readonly addWeightLog: AddWeightLogUseCase;
  private readonly addFinanceLog: AddFinanceLogUseCase;
  private readonly addCheckIn: AddCheckInUseCase;
  private readonly addDistractionSignal: AddDistractionSignalUseCase;
  private readonly respondToIntervention: RespondToInterventionUseCase;
  private readonly updateInterventionPolicySettings: UpdateInterventionPolicySettingsUseCase;
  private readonly classifyApprovalLevel: ClassifyApprovalLevelUseCase;
  private readonly recordApprovalDecision: RecordApprovalDecisionUseCase;

  constructor(
    reflectionRepository: ReflectionRepository,
    memoryRepository: MemoryRepository,
    externalKnowledgeRepository: ExternalKnowledgeRepository,
    externalSourceRepository: ExternalSourceRepository,
    appearanceLogRepository: AppearanceLogRepository,
    managementFeedbackRepository: ManagementFeedbackRepository,
    agentMessageRepository: AgentMessageRepository,
    approvalDecisionRepository: ApprovalDecisionRepository,
    challengeLogRepository: ChallengeLogRepository,
    private readonly agentDelegationGrantRepository: AgentDelegationGrantRepository,
    mealLogRepository: MealLogRepository,
    nutritionLogRepository: NutritionLogRepository,
    weightLogRepository: WeightLogRepository,
    financeLogRepository: FinanceLogRepository,
    checkInRepository: CheckInRepository,
    distractionSignalRepository: DistractionSignalRepository,
    interventionRepository: InterventionRepository,
    interventionPolicySettingsRepository: InterventionPolicySettingsRepository,
  ) {
    this.recordDailyReflection = new RecordDailyReflectionUseCase(reflectionRepository);
    this.addMemoryEntry = new AddMemoryEntryUseCase(memoryRepository);
    this.addExternalKnowledge = new AddExternalKnowledgeUseCase(
      externalKnowledgeRepository,
      externalSourceRepository,
    );
    this.addAppearanceLog = new AddAppearanceLogUseCase(appearanceLogRepository);
    this.addManagementFeedback = new AddManagementFeedbackUseCase(managementFeedbackRepository);
    this.addAgentMessage = new AddAgentMessageUseCase(agentMessageRepository);
    this.addChallengeLog = new AddChallengeLogUseCase(challengeLogRepository);
    this.manageAgentDelegationGrant = new ManageAgentDelegationGrantUseCase(agentDelegationGrantRepository);
    this.addMealLog = new AddMealLogUseCase(mealLogRepository);
    this.addNutritionLog = new AddNutritionLogUseCase(nutritionLogRepository);
    this.addWeightLog = new AddWeightLogUseCase(weightLogRepository);
    this.addFinanceLog = new AddFinanceLogUseCase(financeLogRepository);
    this.addCheckIn = new AddCheckInUseCase(checkInRepository);
    this.addDistractionSignal = new AddDistractionSignalUseCase(distractionSignalRepository);
    this.respondToIntervention = new RespondToInterventionUseCase(interventionRepository);
    this.updateInterventionPolicySettings = new UpdateInterventionPolicySettingsUseCase(
      interventionPolicySettingsRepository,
    );
    this.classifyApprovalLevel = new ClassifyApprovalLevelUseCase();
    this.recordApprovalDecision = new RecordApprovalDecisionUseCase(approvalDecisionRepository);
  }

  /**
   * Version21（Approval Policy Engine、ADR 0048）：`signals`から
   * Levelを機械的に分類し、Proposalへ付与のうえApprovalDecisionを
   * 1件記録する（stage: 'Proposed'）。分類結果はここでは何も止めない
   * ——Proposalは引き続き保存されず、既存のOwner再送が承認の証という
   * 制約（ADR 0031）はそのまま維持される。
   */
  async createProposal(input: CreateProposalInput): Promise<Proposal> {
    if (!input.reason.trim()) {
      throw new Error('reason must not be empty');
    }
    if (!input.target.trim()) {
      throw new Error('target must not be empty');
    }
    const validatedPayload = this.validatePayload(input.type, input.payload);

    const classification = this.classifyApprovalLevel.execute(input.signals, input.type);

    // Version24（Constitution第4条限定改定）：Level2でなく、かつ
    // AUTO_APPROVABLE_TYPESに含まれる型のみ、有効なAgentDelegationGrant
    // があれば即時実行する。AgentDelegationGrant自身は
    // AUTO_APPROVABLE_TYPESに含まれないため、上のtype固定Level2
    // ルールと合わせて二重に自動承認の対象から除外される。
    let autoApproved = false;
    let autoApprovalResult: unknown;
    if (classification.level !== 'Level2' && AUTO_APPROVABLE_TYPES.includes(input.type)) {
      const grant = await this.findValidGrant(input.type);
      if (grant) {
        autoApprovalResult = await this.executeApproval(input.type, validatedPayload);
        grant.recordUsage();
        await this.agentDelegationGrantRepository.save(grant);
        autoApproved = true;
      }
    }

    const proposal: Proposal = {
      type: input.type,
      target: input.target,
      payload: input.payload,
      reason: input.reason,
      createdAt: new Date().toISOString(),
      signals: input.signals,
      approvalLevel: classification.level,
      ...(autoApproved ? { autoApproved: true, result: (autoApprovalResult as ApproveProposalOutput).result } : {}),
    };

    await this.recordApprovalDecision.execute({
      record: {
        stage: autoApproved ? 'Approved' : 'Proposed',
        proposalType: proposal.type,
        target: proposal.target,
        level: classification.level,
        reason: classification.reason,
        triggeredSignals: classification.triggeredSignals,
        signals: input.signals ?? {},
        approver: autoApproved ? 'auto-save' : 'Owner',
      },
    });

    return proposal;
  }

  async approveProposal(proposal: Proposal): Promise<ApproveProposalOutput> {
    if (proposal.autoApproved) {
      // Version24（重複防止）：createProposalが既に自動保存した
      // Proposalを再度approveProposalへ渡すと二重書き込みになる。
      // クライアント側の実装ミス・再送によるものを含め、機械的に拒否する。
      throw new Error('This proposal was already auto-approved; approveProposal must not be called again');
    }
    const payload = this.validatePayload(proposal.type, proposal.payload);
    // クライアントが返した`proposal.approvalLevel`は表示用であり信用しない
    // ——`signals`からサーバー側で必ず再計算する（ADR 0048、迂回対策）。
    const classification = this.classifyApprovalLevel.execute(proposal.signals, proposal.type);

    const output = await this.executeApproval(proposal.type, payload);

    await this.recordApprovalDecision.execute({
      record: {
        stage: 'Approved',
        proposalType: proposal.type,
        target: proposal.target,
        level: classification.level,
        reason: classification.reason,
        triggeredSignals: classification.triggeredSignals,
        signals: proposal.signals ?? {},
        approver: 'Owner',
      },
    });

    return output;
  }

  async rejectProposal(proposal: Proposal): Promise<RejectProposalOutput> {
    const classification = this.classifyApprovalLevel.execute(proposal.signals, proposal.type);

    await this.recordApprovalDecision.execute({
      record: {
        stage: 'Rejected',
        proposalType: proposal.type,
        target: proposal.target,
        level: classification.level,
        reason: classification.reason,
        triggeredSignals: classification.triggeredSignals,
        signals: proposal.signals ?? {},
        approver: 'Owner',
      },
    });

    return { rejected: true, type: proposal.type };
  }

  private async findValidGrant(type: ProposalType) {
    const grants = await this.agentDelegationGrantRepository.findAll();
    return grants.find((g) => g.isValidFor(type));
  }

  private async executeApproval(
    type: ProposalType,
    payload: unknown,
  ): Promise<ApproveProposalOutput> {
    switch (type) {
      case 'Reflection': {
        const result = await this.recordDailyReflection.execute(
          payload as unknown as Parameters<RecordDailyReflectionUseCase['execute']>[0],
        );
        return { type, result };
      }
      case 'Memory': {
        const result = await this.addMemoryEntry.execute(
          payload as unknown as Parameters<AddMemoryEntryUseCase['execute']>[0],
        );
        return { type, result };
      }
      case 'ExternalKnowledge': {
        const result = await this.addExternalKnowledge.execute(
          payload as unknown as Parameters<AddExternalKnowledgeUseCase['execute']>[0],
        );
        return { type, result };
      }
      case 'Appearance': {
        const result = await this.addAppearanceLog.execute(
          payload as unknown as Parameters<AddAppearanceLogUseCase['execute']>[0],
        );
        return { type, result };
      }
      case 'ManagementFeedback': {
        const result = await this.addManagementFeedback.execute(
          payload as unknown as Parameters<AddManagementFeedbackUseCase['execute']>[0],
        );
        return { type, result };
      }
      case 'AgentMessage': {
        const result = await this.addAgentMessage.execute(
          payload as unknown as Parameters<AddAgentMessageUseCase['execute']>[0],
        );
        return { type, result };
      }
      case 'ChallengeLog': {
        const result = await this.addChallengeLog.execute(
          payload as unknown as Parameters<AddChallengeLogUseCase['execute']>[0],
        );
        return { type, result };
      }
      case 'AgentDelegationGrant': {
        const result = await this.manageAgentDelegationGrant.execute(
          payload as unknown as Parameters<ManageAgentDelegationGrantUseCase['execute']>[0],
        );
        return { type, result };
      }
      case 'MealLog': {
        const result = await this.addMealLog.execute(
          payload as unknown as Parameters<AddMealLogUseCase['execute']>[0],
        );
        return { type, result };
      }
      case 'NutritionLog': {
        const result = await this.addNutritionLog.execute(
          payload as unknown as Parameters<AddNutritionLogUseCase['execute']>[0],
        );
        return { type, result };
      }
      case 'WeightLog': {
        const result = await this.addWeightLog.execute(
          payload as unknown as Parameters<AddWeightLogUseCase['execute']>[0],
        );
        return { type, result };
      }
      case 'FinanceLog': {
        const result = await this.addFinanceLog.execute(
          payload as unknown as Parameters<AddFinanceLogUseCase['execute']>[0],
        );
        return { type, result };
      }
      case 'CheckIn': {
        const result = await this.addCheckIn.execute(
          payload as unknown as Parameters<AddCheckInUseCase['execute']>[0],
        );
        return { type, result };
      }
      case 'DistractionSignal': {
        const result = await this.addDistractionSignal.execute(
          payload as unknown as Parameters<AddDistractionSignalUseCase['execute']>[0],
        );
        return { type, result };
      }
      case 'InterventionResponse': {
        const result = await this.respondToIntervention.execute(
          payload as unknown as Parameters<RespondToInterventionUseCase['execute']>[0],
        );
        return { type, result };
      }
      case 'InterventionPolicySettings': {
        const result = await this.updateInterventionPolicySettings.execute(
          payload as unknown as Parameters<UpdateInterventionPolicySettingsUseCase['execute']>[0],
        );
        return { type, result };
      }
    }
  }

  private validatePayload(type: ProposalType, payload: Record<string, unknown>): unknown {
    const schema = payloadSchemas[type];
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
        .join('\n');
      throw new Error(`Invalid proposal payload for type ${type}:\n${issues}`);
    }
    return parsed.data;
  }
}
