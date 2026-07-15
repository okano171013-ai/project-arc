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
import { RecordDailyReflectionUseCase } from '../reflection/RecordDailyReflection.js';
import { AddMemoryEntryUseCase } from '../memory/AddMemoryEntry.js';
import { AddExternalKnowledgeUseCase } from '../external-knowledge/AddExternalKnowledge.js';
import { AddAppearanceLogUseCase } from '../appearance/AddAppearanceLog.js';
import { AddManagementFeedbackUseCase } from '../management-feedback/AddManagementFeedback.js';
import { AddAgentMessageUseCase } from '../agent-message/AddAgentMessage.js';
import { ClassifyApprovalLevelUseCase } from '../approval-policy/ClassifyApprovalLevel.js';
import { RecordApprovalDecisionUseCase } from '../approval-policy/RecordApprovalDecision.js';

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
    this.validatePayload(input.type, input.payload);

    const classification = this.classifyApprovalLevel.execute(input.signals);
    const proposal: Proposal = {
      type: input.type,
      target: input.target,
      payload: input.payload,
      reason: input.reason,
      createdAt: new Date().toISOString(),
      signals: input.signals,
      approvalLevel: classification.level,
    };

    await this.recordApprovalDecision.execute({
      record: {
        stage: 'Proposed',
        proposalType: proposal.type,
        target: proposal.target,
        level: classification.level,
        reason: classification.reason,
        triggeredSignals: classification.triggeredSignals,
        signals: input.signals ?? {},
      },
    });

    return proposal;
  }

  async approveProposal(proposal: Proposal): Promise<ApproveProposalOutput> {
    const payload = this.validatePayload(proposal.type, proposal.payload);
    // クライアントが返した`proposal.approvalLevel`は表示用であり信用しない
    // ——`signals`からサーバー側で必ず再計算する（ADR 0048、迂回対策）。
    const classification = this.classifyApprovalLevel.execute(proposal.signals);

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
      },
    });

    return output;
  }

  async rejectProposal(proposal: Proposal): Promise<RejectProposalOutput> {
    const classification = this.classifyApprovalLevel.execute(proposal.signals);

    await this.recordApprovalDecision.execute({
      record: {
        stage: 'Rejected',
        proposalType: proposal.type,
        target: proposal.target,
        level: classification.level,
        reason: classification.reason,
        triggeredSignals: classification.triggeredSignals,
        signals: proposal.signals ?? {},
      },
    });

    return { rejected: true, type: proposal.type };
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
