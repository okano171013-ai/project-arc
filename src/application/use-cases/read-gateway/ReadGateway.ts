import type { Reflection } from '../../../domain/entities/Reflection.js';
import type { TimelineSource } from '../../../domain/value-objects/TimelineEntry.js';
import type { ReflectionRepository } from '../../ports/ReflectionRepository.js';
import type { AppearanceLogRepository } from '../../ports/AppearanceLogRepository.js';
import type { SkinLogRepository } from '../../ports/SkinLogRepository.js';
import type { PurchaseLogRepository } from '../../ports/PurchaseLogRepository.js';
import type { ChallengeLogRepository } from '../../ports/ChallengeLogRepository.js';
import type { CaptureRepository } from '../../ports/CaptureRepository.js';
import type { ThirdPersonEvaluationRepository } from '../../ports/ThirdPersonEvaluationRepository.js';
import type { ExternalKnowledgeRepository } from '../../ports/ExternalKnowledgeRepository.js';
import type { ExternalSourceRepository } from '../../ports/ExternalSourceRepository.js';
import { GetTimelineUseCase, type GetTimelineOutput } from '../timeline/GetTimeline.js';
import { RetrieveKnowledgeUseCase, type RetrieveKnowledgeOutput } from '../knowledge-retrieval/RetrieveKnowledge.js';
import { DecisionEngineUseCase, type DecisionSupportOutput } from '../decision-support/DecisionEngine.js';

/**
 * ARCが一度に取得できる件数の上限。「全件取得禁止」（Owner指示、
 * Version14）を`limit`必須にするだけでなく実効的にするための安全弁。
 * 将来これでは不足する用途が具体的に確認できた時点で見直す（Principle 9）。
 */
const MAX_READ_LIMIT = 100;

export interface ReadReflectionInput {
  limit: number;
}

export interface ReadReflectionOutput {
  reflections: Reflection[];
}

export interface ReadTimelineInput {
  limit: number;
  since?: string;
  source?: TimelineSource;
}

export interface ReadExternalInput {
  limit: number;
  query?: string;
  tags?: string[];
  topics?: string[];
}

export interface ReadDecisionInput {
  question: string;
  limit: number;
  candidates?: string[];
  tags?: string[];
  topics?: string[];
}

/**
 * ReadGatewayUseCase（Version14、Read Layer）
 *
 * ARC → ReadGateway → UseCase → Repository という読み取り専用の入口
 * （指示書2章）。`ConversationGatewayUseCase`（Version13、ADR 0026）と
 * 同じく、既存のGetTimeline/RetrieveKnowledge/DecisionEngineUseCaseへ
 * 委譲するだけの薄いディスパッチャであり、新しい判断ロジックは持たない。
 *
 * 追加する制約は「`limit`必須・上限あり」のみ（指示書13章
 * 「ARCは必要最小限だけ取得する。全件取得禁止。limit必須」）。
 */
export class ReadGatewayUseCase {
  private readonly getTimeline: GetTimelineUseCase;
  private readonly retrieveKnowledge: RetrieveKnowledgeUseCase;
  private readonly decisionEngine: DecisionEngineUseCase;

  constructor(
    private readonly reflectionRepository: ReflectionRepository,
    appearanceLogRepository: AppearanceLogRepository,
    skinLogRepository: SkinLogRepository,
    purchaseLogRepository: PurchaseLogRepository,
    challengeLogRepository: ChallengeLogRepository,
    captureRepository: CaptureRepository,
    thirdPersonEvaluationRepository: ThirdPersonEvaluationRepository,
    externalKnowledgeRepository: ExternalKnowledgeRepository,
    externalSourceRepository: ExternalSourceRepository,
  ) {
    this.getTimeline = new GetTimelineUseCase(
      reflectionRepository,
      appearanceLogRepository,
      skinLogRepository,
      purchaseLogRepository,
      challengeLogRepository,
      captureRepository,
      thirdPersonEvaluationRepository,
      externalKnowledgeRepository,
      externalSourceRepository,
    );
    this.retrieveKnowledge = new RetrieveKnowledgeUseCase(
      externalKnowledgeRepository,
      externalSourceRepository,
    );
    this.decisionEngine = new DecisionEngineUseCase(
      externalKnowledgeRepository,
      externalSourceRepository,
    );
  }

  async readReflection(input: ReadReflectionInput): Promise<ReadReflectionOutput> {
    this.assertValidLimit(input.limit);
    const reflections = await this.reflectionRepository.findRecent(input.limit);
    return { reflections };
  }

  async readTimeline(input: ReadTimelineInput): Promise<GetTimelineOutput> {
    this.assertValidLimit(input.limit);
    return this.getTimeline.execute({
      since: input.since,
      source: input.source,
      limit: input.limit,
    });
  }

  async readExternal(input: ReadExternalInput): Promise<RetrieveKnowledgeOutput> {
    this.assertValidLimit(input.limit);
    return this.retrieveKnowledge.execute({
      query: input.query,
      tags: input.tags,
      topics: input.topics,
      limit: input.limit,
    });
  }

  async readDecision(input: ReadDecisionInput): Promise<DecisionSupportOutput> {
    this.assertValidLimit(input.limit);
    const result = await this.decisionEngine.execute({
      question: input.question,
      candidates: input.candidates,
      tags: input.tags,
      topics: input.topics,
    });
    // DecisionEngineUseCase自体はlimitを持たないため、ReadGateway側で
    // 「必要最小限だけ取得する」制約を追加適用する。
    return {
      ...result,
      retrievedKnowledge: result.retrievedKnowledge.slice(0, input.limit),
    };
  }

  private assertValidLimit(limit: number): void {
    if (!Number.isInteger(limit) || limit <= 0) {
      throw new Error('limit must be a positive integer');
    }
    if (limit > MAX_READ_LIMIT) {
      throw new Error(`limit must not exceed ${MAX_READ_LIMIT}`);
    }
  }
}
