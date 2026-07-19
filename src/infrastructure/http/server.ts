#!/usr/bin/env node
/**
 * ARC Connector（Version7、Version9でBridge Layerのimport/exportを追加）
 *
 * Project ARCのApplication層を、CLI以外からも呼び出せるようにする
 * HTTP API。ADR 0008・ADR 0010参照。重要な制約：
 *
 * - このServer自身は「何を記録すべきか」を判断しない（ai-roles.md、
 *   ADR 0007の方針を継承）。`/capture`は確定済みdestinationsを
 *   受け取って書き込むだけ。`/capture/suggest`が返すのは機械的な
 *   下書き提案のみ。`/bridge/import`も`type`が確定済みの入力のみを
 *   受け付ける。
 * - ローカル専用（127.0.0.1のみ）。Version15で`ARC_API_KEY`が設定
 *   されている場合のみAPI Key認証を強制する（opt-in、ADR 0036）。
 *   未設定ならVersion7〜14と同じく認証なしで動作する。
 * - 新規の外部依存は追加せず、Node.js標準の`http`モジュールのみで
 *   実装する（Principle 9: 段階的拡張／YAGNI）。
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { pathToFileURL } from 'node:url';

import { RecordDailyReflectionUseCase } from '../../application/use-cases/reflection/RecordDailyReflection.js';
import { AddSkinLogUseCase } from '../../application/use-cases/skin/AddSkinLog.js';
import { RecordPurchaseUseCase } from '../../application/use-cases/purchase/RecordPurchase.js';
import { StartUsingPurchaseUseCase } from '../../application/use-cases/purchase/StartUsingPurchase.js';
import { FinishPurchaseUseCase } from '../../application/use-cases/purchase/FinishPurchase.js';
import { AddAppearanceLogUseCase } from '../../application/use-cases/appearance/AddAppearanceLog.js';
import { SuggestCaptureDestinationsUseCase } from '../../application/use-cases/capture/SuggestCaptureDestinations.js';
import { RecordCaptureUseCase } from '../../application/use-cases/capture/RecordCapture.js';
import { GetTimelineUseCase } from '../../application/use-cases/timeline/GetTimeline.js';
import { AddThirdPersonEvaluationUseCase } from '../../application/use-cases/evaluation/AddThirdPersonEvaluation.js';
import { ImportLogsUseCase } from '../../application/use-cases/bridge/ImportLogs.js';
import { ExportLogsUseCase } from '../../application/use-cases/bridge/ExportLogs.js';
import type { BridgeLogType } from '../../domain/value-objects/BridgeLogType.js';
import type { TimelineSource } from '../../domain/value-objects/TimelineEntry.js';
import { AddExternalSourceUseCase } from '../../application/use-cases/external-source/AddExternalSource.js';
import { ListExternalSourcesUseCase } from '../../application/use-cases/external-source/ListExternalSources.js';
import { GetExternalSourceUseCase } from '../../application/use-cases/external-source/GetExternalSource.js';
import { UpdateExternalSourceUseCase } from '../../application/use-cases/external-source/UpdateExternalSource.js';
import { DeleteExternalSourceUseCase } from '../../application/use-cases/external-source/DeleteExternalSource.js';
import { AddExternalKnowledgeUseCase } from '../../application/use-cases/external-knowledge/AddExternalKnowledge.js';
import { ListExternalKnowledgeUseCase } from '../../application/use-cases/external-knowledge/ListExternalKnowledge.js';
import { GetExternalKnowledgeUseCase } from '../../application/use-cases/external-knowledge/GetExternalKnowledge.js';
import { UpdateExternalKnowledgeUseCase } from '../../application/use-cases/external-knowledge/UpdateExternalKnowledge.js';
import { DeleteExternalKnowledgeUseCase } from '../../application/use-cases/external-knowledge/DeleteExternalKnowledge.js';
import { SearchExternalKnowledgeUseCase } from '../../application/use-cases/external-knowledge/SearchExternalKnowledge.js';
import { RetrieveKnowledgeUseCase } from '../../application/use-cases/knowledge-retrieval/RetrieveKnowledge.js';
import { buildRetrievalContext } from '../../application/use-cases/knowledge-retrieval/BuildRetrievalContext.js';
import { DecisionEngineUseCase } from '../../application/use-cases/decision-support/DecisionEngine.js';
import { ConversationGatewayUseCase } from '../../application/use-cases/conversation-gateway/ConversationGateway.js';
import { ReadGatewayUseCase } from '../../application/use-cases/read-gateway/ReadGateway.js';
import { WriteProposalGatewayUseCase } from '../../application/use-cases/write-proposal-gateway/WriteProposalGateway.js';
import { AddManagementFeedbackUseCase } from '../../application/use-cases/management-feedback/AddManagementFeedback.js';
import { ListManagementFeedbackUseCase } from '../../application/use-cases/management-feedback/ListManagementFeedback.js';
import { ResolveManagementFeedbackUseCase } from '../../application/use-cases/management-feedback/ResolveManagementFeedback.js';
import { AddAgentMessageUseCase } from '../../application/use-cases/agent-message/AddAgentMessage.js';
import { ListAgentMessagesUseCase } from '../../application/use-cases/agent-message/ListAgentMessages.js';
import { ListApprovalDecisionsUseCase } from '../../application/use-cases/approval-policy/ListApprovalDecisions.js';
import { ListAgentDelegationGrantsUseCase } from '../../application/use-cases/agent-delegation-grant/ListAgentDelegationGrants.js';
import { ListDevelopmentGrantsUseCase } from '../../application/use-cases/development-grant/ListDevelopmentGrants.js';
import { ListAgentTasksUseCase } from '../../application/use-cases/agent-task/ListAgentTasks.js';
import { ListMealLogsUseCase } from '../../application/use-cases/meal/ListMealLogs.js';
import { ListNutritionLogsUseCase } from '../../application/use-cases/nutrition/ListNutritionLogs.js';
import { SummarizeNutritionByDateUseCase } from '../../application/use-cases/nutrition/SummarizeNutritionByDate.js';
import { ListWeightLogsUseCase } from '../../application/use-cases/weight/ListWeightLogs.js';
import { ListFinanceLogsUseCase } from '../../application/use-cases/finance/ListFinanceLogs.js';
import { ListCheckInsUseCase } from '../../application/use-cases/check-in/ListCheckIns.js';
import { ListDistractionSignalsUseCase } from '../../application/use-cases/distraction-signal/ListDistractionSignals.js';
import { ListInterventionsUseCase } from '../../application/use-cases/intervention/ListInterventions.js';
import { MeasureInterventionEffectivenessUseCase } from '../../application/use-cases/intervention/MeasureInterventionEffectiveness.js';
import { GetInterventionPolicySettingsUseCase } from '../../application/use-cases/intervention-policy/GetInterventionPolicySettings.js';
import { GetDailyBehaviorScoreUseCase } from '../../application/use-cases/behavior-score/GetDailyBehaviorScore.js';
import { RecordStudySessionUseCase } from '../../application/use-cases/study-session/RecordStudySession.js';
import { SummarizeStudySessionsUseCase } from '../../application/use-cases/study-session/SummarizeStudySessions.js';
import type { ExternalKnowledgeStatus } from '../../domain/entities/ExternalKnowledge.js';
import type { AgentDelegationGrantStatus } from '../../domain/entities/AgentDelegationGrant.js';
import type { DevelopmentGrantStatus } from '../../domain/entities/DevelopmentGrant.js';
import type { AgentTaskStatus } from '../../domain/entities/AgentTask.js';
import type { MealType } from '../../domain/entities/MealLog.js';
import type { FinanceLogType } from '../../domain/entities/FinanceLog.js';
import type { DistractionSignalKind } from '../../domain/entities/DistractionSignal.js';
import type { InterventionStatus } from '../../domain/entities/Intervention.js';
import type { ProposalType, Proposal } from '../../domain/value-objects/Proposal.js';
import type { ApprovalLevel, ApprovalSignals } from '../../domain/value-objects/ApprovalLevel.js';

import { JsonFileReflectionRepository } from '../../adapters/repositories/JsonFileReflectionRepository.js';
import { JsonFileMemoryRepository } from '../../adapters/repositories/JsonFileMemoryRepository.js';
import { JsonFileInventoryRepository } from '../../adapters/repositories/JsonFileInventoryRepository.js';
import { JsonFileSkinLogRepository } from '../../adapters/repositories/JsonFileSkinLogRepository.js';
import { JsonFilePurchaseLogRepository } from '../../adapters/repositories/JsonFilePurchaseLogRepository.js';
import { JsonFileChallengeLogRepository } from '../../adapters/repositories/JsonFileChallengeLogRepository.js';
import { JsonFileAppearanceLogRepository } from '../../adapters/repositories/JsonFileAppearanceLogRepository.js';
import { JsonFileCaptureRepository } from '../../adapters/repositories/JsonFileCaptureRepository.js';
import { JsonFileThirdPersonEvaluationRepository } from '../../adapters/repositories/JsonFileThirdPersonEvaluationRepository.js';
import { JsonFileExternalSourceRepository } from '../../adapters/repositories/JsonFileExternalSourceRepository.js';
import { JsonFileExternalKnowledgeRepository } from '../../adapters/repositories/JsonFileExternalKnowledgeRepository.js';
import { JsonFileManagementFeedbackRepository } from '../../adapters/repositories/JsonFileManagementFeedbackRepository.js';
import { JsonFileAgentMessageRepository } from '../../adapters/repositories/JsonFileAgentMessageRepository.js';
import { JsonFileApprovalDecisionRepository } from '../../adapters/repositories/JsonFileApprovalDecisionRepository.js';
import { JsonFileAgentDelegationGrantRepository } from '../../adapters/repositories/JsonFileAgentDelegationGrantRepository.js';
import { JsonFileDevelopmentGrantRepository } from '../../adapters/repositories/JsonFileDevelopmentGrantRepository.js';
import { JsonFileAgentTaskRepository } from '../../adapters/repositories/JsonFileAgentTaskRepository.js';
import { JsonFileMealLogRepository } from '../../adapters/repositories/JsonFileMealLogRepository.js';
import { JsonFileNutritionLogRepository } from '../../adapters/repositories/JsonFileNutritionLogRepository.js';
import { JsonFileWeightLogRepository } from '../../adapters/repositories/JsonFileWeightLogRepository.js';
import { JsonFileFinanceLogRepository } from '../../adapters/repositories/JsonFileFinanceLogRepository.js';
import { JsonFileCheckInRepository } from '../../adapters/repositories/JsonFileCheckInRepository.js';
import { JsonFileDistractionSignalRepository } from '../../adapters/repositories/JsonFileDistractionSignalRepository.js';
import { JsonFileInterventionRepository } from '../../adapters/repositories/JsonFileInterventionRepository.js';
import { JsonFileInterventionPolicySettingsRepository } from '../../adapters/repositories/JsonFileInterventionPolicySettingsRepository.js';
import { JsonFileStudySessionRepository } from '../../adapters/repositories/JsonFileStudySessionRepository.js';
import { RuleBasedCaptureClassifier } from '../../adapters/providers/RuleBasedCaptureClassifier.js';
import { isAuthorized } from '../security/apiKeyAuth.js';
import { loadEnv } from '../config/env.js';

import {
  serializeReflection,
  serializeSkinLog,
  serializePurchaseLog,
  serializeAppearanceLog,
  serializeCapture,
  serializeThirdPersonEvaluation,
  serializeExternalSource,
  serializeExternalKnowledge,
  serializeDecisionContext,
  serializeConversationContext,
  serializeProposal,
  serializeMemoryEntry,
  serializeManagementFeedback,
  serializeAgentMessage,
  serializeApprovalDecision,
  serializeAgentDelegationGrant,
  serializeDevelopmentGrant,
  serializeAgentTask,
  serializeChallengeLog,
  serializeMealLog,
  serializeNutritionLog,
  serializeWeightLog,
  serializeFinanceLog,
  serializeCheckIn,
  serializeDistractionSignal,
  serializeIntervention,
  serializeInterventionPolicySettings,
} from '../../application/serializers.js';
import type { Reflection } from '../../domain/entities/Reflection.js';
import type { MemoryEntry } from '../../domain/entities/MemoryEntry.js';
import type { ChallengeLog } from '../../domain/entities/ChallengeLog.js';
import type { AgentDelegationGrant } from '../../domain/entities/AgentDelegationGrant.js';
import type { ExternalKnowledge } from '../../domain/entities/ExternalKnowledge.js';
import type { AppearanceLog } from '../../domain/entities/AppearanceLog.js';
import type {
  ManagementFeedback,
  ManagementFeedbackResolution,
} from '../../domain/entities/ManagementFeedback.js';
import type { AgentMessage, AgentMessageDirection } from '../../domain/entities/AgentMessage.js';
import type { MealLog } from '../../domain/entities/MealLog.js';
import type { NutritionLog } from '../../domain/entities/NutritionLog.js';
import type { WeightLog } from '../../domain/entities/WeightLog.js';
import type { FinanceLog } from '../../domain/entities/FinanceLog.js';
import type { CheckIn } from '../../domain/entities/CheckIn.js';
import type { DistractionSignal } from '../../domain/entities/DistractionSignal.js';
import type { Intervention } from '../../domain/entities/Intervention.js';
import type { InterventionPolicySettings } from '../../domain/entities/InterventionPolicySettings.js';

export interface BuildAppOptions {
  /** テスト時に本番の`data/`と隔離するためのディレクトリ差し替え。 */
  dataDir?: string;
  /**
   * Version15: ARC Connector（Connector層からの呼び出し）向けの
   * API Key認証。未設定なら認証を強制しない（opt-in、ADR 0036、
   * Version7〜14と同じ挙動を維持する）。設定した場合、`GET /health`
   * 以外の全ルートで`Authorization: Bearer <apiKey>`を要求する。
   */
  apiKey?: string;
}

function repoPath(dataDir: string | undefined, filename: string): string | undefined {
  return dataDir ? `${dataDir}/${filename}` : undefined;
}

/** UseCase/Repositoryの組み立て。 */
export function buildUseCases(options: BuildAppOptions = {}) {
  const { dataDir } = options;

  const reflectionRepository = new JsonFileReflectionRepository(
    repoPath(dataDir, 'reflections.json'),
  );
  const memoryRepository = new JsonFileMemoryRepository(repoPath(dataDir, 'memory.json'));
  const inventoryRepository = new JsonFileInventoryRepository(repoPath(dataDir, 'inventory.json'));
  const skinLogRepository = new JsonFileSkinLogRepository(repoPath(dataDir, 'skin-log.json'));
  const purchaseLogRepository = new JsonFilePurchaseLogRepository(
    repoPath(dataDir, 'purchase-log.json'),
  );
  const challengeLogRepository = new JsonFileChallengeLogRepository(
    repoPath(dataDir, 'challenge-log.json'),
  );
  const appearanceLogRepository = new JsonFileAppearanceLogRepository(
    repoPath(dataDir, 'appearance-log.json'),
  );
  const captureRepository = new JsonFileCaptureRepository(repoPath(dataDir, 'capture-log.json'));
  const thirdPersonEvaluationRepository = new JsonFileThirdPersonEvaluationRepository(
    repoPath(dataDir, 'third-person-evaluation.json'),
  );
  const externalSourceRepository = new JsonFileExternalSourceRepository(
    repoPath(dataDir, 'external-sources.json'),
  );
  const externalKnowledgeRepository = new JsonFileExternalKnowledgeRepository(
    repoPath(dataDir, 'external-knowledge.json'),
  );
  const managementFeedbackRepository = new JsonFileManagementFeedbackRepository(
    repoPath(dataDir, 'management-feedback.json'),
  );
  const agentMessageRepository = new JsonFileAgentMessageRepository(
    repoPath(dataDir, 'agent-messages.json'),
  );
  const approvalDecisionRepository = new JsonFileApprovalDecisionRepository(
    repoPath(dataDir, 'approval-decisions.json'),
  );
  const agentDelegationGrantRepository = new JsonFileAgentDelegationGrantRepository(
    repoPath(dataDir, 'agent-delegation-grants.json'),
  );
  const developmentGrantRepository = new JsonFileDevelopmentGrantRepository(
    repoPath(dataDir, 'development-grants.json'),
  );
  const agentTaskRepository = new JsonFileAgentTaskRepository(repoPath(dataDir, 'agent-tasks.json'));
  const mealLogRepository = new JsonFileMealLogRepository(repoPath(dataDir, 'meal-log.json'));
  const nutritionLogRepository = new JsonFileNutritionLogRepository(
    repoPath(dataDir, 'nutrition-log.json'),
  );
  const weightLogRepository = new JsonFileWeightLogRepository(repoPath(dataDir, 'weight-log.json'));
  const financeLogRepository = new JsonFileFinanceLogRepository(repoPath(dataDir, 'finance-log.json'));
  const checkInRepository = new JsonFileCheckInRepository(repoPath(dataDir, 'check-ins.json'));
  const distractionSignalRepository = new JsonFileDistractionSignalRepository(
    repoPath(dataDir, 'distraction-signals.json'),
  );
  const interventionRepository = new JsonFileInterventionRepository(repoPath(dataDir, 'interventions.json'));
  const interventionPolicySettingsRepository = new JsonFileInterventionPolicySettingsRepository(
    repoPath(dataDir, 'intervention-policy-settings.json'),
  );
  const studySessionRepository = new JsonFileStudySessionRepository(repoPath(dataDir, 'study-sessions.json'));
  const classifier = new RuleBasedCaptureClassifier();

  return {
    recordDailyReflection: new RecordDailyReflectionUseCase(reflectionRepository),
    addSkinLog: new AddSkinLogUseCase(skinLogRepository),
    recordPurchase: new RecordPurchaseUseCase(purchaseLogRepository),
    startUsingPurchase: new StartUsingPurchaseUseCase(purchaseLogRepository),
    finishPurchase: new FinishPurchaseUseCase(purchaseLogRepository),
    addAppearanceLog: new AddAppearanceLogUseCase(appearanceLogRepository),
    addThirdPersonEvaluation: new AddThirdPersonEvaluationUseCase(thirdPersonEvaluationRepository),
    suggestCaptureDestinations: new SuggestCaptureDestinationsUseCase(classifier),
    recordCapture: new RecordCaptureUseCase(
      captureRepository,
      skinLogRepository,
      purchaseLogRepository,
      challengeLogRepository,
      appearanceLogRepository,
      thirdPersonEvaluationRepository,
    ),
    getTimeline: new GetTimelineUseCase(
      reflectionRepository,
      appearanceLogRepository,
      skinLogRepository,
      purchaseLogRepository,
      challengeLogRepository,
      captureRepository,
      thirdPersonEvaluationRepository,
      externalKnowledgeRepository,
      externalSourceRepository,
    ),
    importLogs: new ImportLogsUseCase(
      reflectionRepository,
      memoryRepository,
      inventoryRepository,
      appearanceLogRepository,
      skinLogRepository,
      purchaseLogRepository,
      challengeLogRepository,
      thirdPersonEvaluationRepository,
      externalSourceRepository,
      externalKnowledgeRepository,
      mealLogRepository,
      nutritionLogRepository,
      weightLogRepository,
      financeLogRepository,
      studySessionRepository,
    ),
    exportLogs: new ExportLogsUseCase(
      reflectionRepository,
      memoryRepository,
      inventoryRepository,
      appearanceLogRepository,
      skinLogRepository,
      purchaseLogRepository,
      challengeLogRepository,
      thirdPersonEvaluationRepository,
      externalSourceRepository,
      externalKnowledgeRepository,
      mealLogRepository,
      nutritionLogRepository,
      weightLogRepository,
      financeLogRepository,
      studySessionRepository,
    ),
    addExternalSource: new AddExternalSourceUseCase(externalSourceRepository),
    listExternalSources: new ListExternalSourcesUseCase(externalSourceRepository),
    getExternalSource: new GetExternalSourceUseCase(externalSourceRepository),
    updateExternalSource: new UpdateExternalSourceUseCase(externalSourceRepository),
    deleteExternalSource: new DeleteExternalSourceUseCase(externalSourceRepository),
    addExternalKnowledge: new AddExternalKnowledgeUseCase(
      externalKnowledgeRepository,
      externalSourceRepository,
    ),
    listExternalKnowledge: new ListExternalKnowledgeUseCase(externalKnowledgeRepository),
    getExternalKnowledge: new GetExternalKnowledgeUseCase(externalKnowledgeRepository),
    updateExternalKnowledge: new UpdateExternalKnowledgeUseCase(
      externalKnowledgeRepository,
      externalSourceRepository,
    ),
    deleteExternalKnowledge: new DeleteExternalKnowledgeUseCase(externalKnowledgeRepository),
    searchExternalKnowledge: new SearchExternalKnowledgeUseCase(
      externalKnowledgeRepository,
      externalSourceRepository,
    ),
    retrieveKnowledge: new RetrieveKnowledgeUseCase(
      externalKnowledgeRepository,
      externalSourceRepository,
    ),
    decisionSupport: new DecisionEngineUseCase(externalKnowledgeRepository, externalSourceRepository),
    conversationGateway: new ConversationGatewayUseCase(
      externalKnowledgeRepository,
      externalSourceRepository,
    ),
    addManagementFeedback: new AddManagementFeedbackUseCase(managementFeedbackRepository),
    listManagementFeedback: new ListManagementFeedbackUseCase(managementFeedbackRepository),
    resolveManagementFeedback: new ResolveManagementFeedbackUseCase(managementFeedbackRepository),
    addAgentMessage: new AddAgentMessageUseCase(agentMessageRepository),
    listAgentMessages: new ListAgentMessagesUseCase(agentMessageRepository),
    listApprovalDecisions: new ListApprovalDecisionsUseCase(approvalDecisionRepository),
    listAgentDelegationGrants: new ListAgentDelegationGrantsUseCase(agentDelegationGrantRepository),
    listDevelopmentGrants: new ListDevelopmentGrantsUseCase(developmentGrantRepository),
    listAgentTasks: new ListAgentTasksUseCase(agentTaskRepository),
    listMealLogs: new ListMealLogsUseCase(mealLogRepository),
    listNutritionLogs: new ListNutritionLogsUseCase(nutritionLogRepository),
    summarizeNutritionByDate: new SummarizeNutritionByDateUseCase(mealLogRepository, nutritionLogRepository),
    listWeightLogs: new ListWeightLogsUseCase(weightLogRepository),
    listFinanceLogs: new ListFinanceLogsUseCase(financeLogRepository),
    listCheckIns: new ListCheckInsUseCase(checkInRepository),
    listDistractionSignals: new ListDistractionSignalsUseCase(distractionSignalRepository),
    listInterventions: new ListInterventionsUseCase(interventionRepository),
    measureInterventionEffectiveness: new MeasureInterventionEffectivenessUseCase(interventionRepository),
    getInterventionPolicySettings: new GetInterventionPolicySettingsUseCase(interventionPolicySettingsRepository),
    getDailyBehaviorScore: new GetDailyBehaviorScoreUseCase(
      reflectionRepository,
      checkInRepository,
      interventionRepository,
      interventionPolicySettingsRepository,
    ),
    recordStudySession: new RecordStudySessionUseCase(studySessionRepository),
    summarizeStudySessions: new SummarizeStudySessionsUseCase(studySessionRepository),
    readGateway: new ReadGatewayUseCase(
      reflectionRepository,
      appearanceLogRepository,
      skinLogRepository,
      purchaseLogRepository,
      challengeLogRepository,
      captureRepository,
      thirdPersonEvaluationRepository,
      externalKnowledgeRepository,
      externalSourceRepository,
    ),
    writeProposalGateway: new WriteProposalGatewayUseCase(
      reflectionRepository,
      memoryRepository,
      externalKnowledgeRepository,
      externalSourceRepository,
      appearanceLogRepository,
      managementFeedbackRepository,
      agentMessageRepository,
      approvalDecisionRepository,
      challengeLogRepository,
      agentDelegationGrantRepository,
      mealLogRepository,
      nutritionLogRepository,
      weightLogRepository,
      financeLogRepository,
      checkInRepository,
      distractionSignalRepository,
      interventionRepository,
      interventionPolicySettingsRepository,
    ),
  };
}

export type UseCases = ReturnType<typeof buildUseCases>;

interface JsonResult {
  status: number;
  body: unknown;
}

function ok(body: unknown, status = 200): JsonResult {
  return { status, body: { ok: true, data: body } };
}

function fail(error: unknown, status = 400): JsonResult {
  const message = error instanceof Error ? error.message : String(error);
  return { status, body: { ok: false, error: message } };
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const raw = Buffer.concat(chunks).toString('utf-8');
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error('invalid JSON body');
  }
}

/**
 * Read Layer（Version14）専用。`limit`は必須クエリパラメータとし、
 * 未指定・数値でない場合は400にする（`ReadGatewayUseCase`自体も
 * 上限超過を検証するが、ここでは「そもそも指定されているか」を
 * HTTP層のバリデーションとして先に弾く）。
 */
function requireLimit(url: URL): number {
  const raw = url.searchParams.get('limit');
  if (!raw) {
    throw new Error('limit is required');
  }
  const limit = Number(raw);
  if (!Number.isInteger(limit)) {
    throw new Error('limit must be an integer');
  }
  return limit;
}

/**
 * `WriteProposalGatewayUseCase.approveProposal()`が返す`result`は、
 * 対応する既存UseCaseの生の出力（Entityインスタンスを含む）である。
 * 他のルート同様、Entityの`private`フィールドをそのまま
 * `JSON.stringify`に漏らさないよう、必ずここでpublicなgetter経由の
 * シリアライズ関数を通す（`serializers.ts`冒頭のコメント参照）。
 */
function serializeApproveResult(type: ProposalType, result: unknown): unknown {
  switch (type) {
    case 'Reflection': {
      const r = result as { reflection: Reflection; hasMinimumRoutine: boolean; score: number; previousScore: number | undefined; scoreDelta: number | undefined };
      return {
        reflection: serializeReflection(r.reflection),
        hasMinimumRoutine: r.hasMinimumRoutine,
        score: r.score,
        previousScore: r.previousScore,
        scoreDelta: r.scoreDelta,
      };
    }
    case 'Memory':
      return { entry: serializeMemoryEntry((result as { entry: MemoryEntry }).entry) };
    case 'ExternalKnowledge':
      return { knowledge: serializeExternalKnowledge((result as { knowledge: ExternalKnowledge }).knowledge) };
    case 'Appearance':
      return { log: serializeAppearanceLog((result as { log: AppearanceLog }).log) };
    case 'ManagementFeedback':
      return { feedback: serializeManagementFeedback((result as { feedback: ManagementFeedback }).feedback) };
    case 'AgentMessage':
      return { message: serializeAgentMessage((result as { message: AgentMessage }).message) };
    case 'ChallengeLog':
      return { log: serializeChallengeLog((result as { log: ChallengeLog }).log) };
    case 'AgentDelegationGrant':
      return { grant: serializeAgentDelegationGrant((result as { grant: AgentDelegationGrant }).grant) };
    case 'MealLog': {
      const r = result as { log: MealLog; deduped: boolean };
      return { log: serializeMealLog(r.log), deduped: r.deduped };
    }
    case 'NutritionLog': {
      const r = result as { log: NutritionLog; deduped: boolean };
      return { log: serializeNutritionLog(r.log), deduped: r.deduped };
    }
    case 'WeightLog': {
      const r = result as { log: WeightLog; deduped: boolean };
      return { log: serializeWeightLog(r.log), deduped: r.deduped };
    }
    case 'FinanceLog': {
      const r = result as { log: FinanceLog; deduped: boolean };
      return { log: serializeFinanceLog(r.log), deduped: r.deduped };
    }
    case 'CheckIn': {
      const r = result as { checkIn: CheckIn; deduped: boolean };
      return { checkIn: serializeCheckIn(r.checkIn), deduped: r.deduped };
    }
    case 'DistractionSignal': {
      const r = result as { signal: DistractionSignal; deduped: boolean };
      return { signal: serializeDistractionSignal(r.signal), deduped: r.deduped };
    }
    case 'InterventionResponse': {
      const r = result as { intervention: Intervention };
      return { intervention: serializeIntervention(r.intervention) };
    }
    case 'InterventionPolicySettings': {
      const r = result as { settings: InterventionPolicySettings };
      return { settings: serializeInterventionPolicySettings(r.settings) };
    }
  }
}

type Handler = (req: IncomingMessage, params: Record<string, string>) => Promise<JsonResult>;

interface Route {
  method: string;
  pattern: RegExp;
  paramNames: string[];
  handler: Handler;
}

function route(method: string, path: string, handler: Handler): Route {
  const paramNames: string[] = [];
  const patternSource = path
    .split('/')
    .map((segment) => {
      if (segment.startsWith(':')) {
        paramNames.push(segment.slice(1));
        return '([^/]+)';
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return { method, pattern: new RegExp(`^${patternSource}$`), paramNames, handler };
}

/**
 * ARC ConnectorのHTTPアプリを組み立てる。UseCases自体は分類・解釈を
 * 一切行わない（`/capture`は確定済みdestinations必須、
 * `/capture/suggest`はキーワード一致の下書き提案を返すのみ）。
 */
export function createApp(options: BuildAppOptions = {}) {
  const useCases = buildUseCases(options);

  const routes: Route[] = [
    route('GET', '/health', async () => ok({ service: 'project-arc', status: 'ok' })),

    route('GET', '/timeline', async (req) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const since = url.searchParams.get('since') ?? undefined;
      const source = (url.searchParams.get('source') ?? undefined) as TimelineSource | undefined;
      const limitRaw = url.searchParams.get('limit');
      const limit = limitRaw ? Number(limitRaw) : undefined;
      const result = await useCases.getTimeline.execute({ since, source, limit });
      return ok({ entries: result.entries });
    }),

    route('POST', '/reflection', async (req) => {
      const body = await readJsonBody(req);
      const date = body.date as string;
      const record = body.record as Parameters<
        typeof useCases.recordDailyReflection.execute
      >[0]['record'];
      const result = await useCases.recordDailyReflection.execute({ date, record });
      return ok({
        reflection: serializeReflection(result.reflection),
        hasMinimumRoutine: result.hasMinimumRoutine,
        score: result.score,
        previousScore: result.previousScore,
        scoreDelta: result.scoreDelta,
      });
    }),

    route('POST', '/skin', async (req) => {
      const body = await readJsonBody(req);
      const record = body.record as Parameters<typeof useCases.addSkinLog.execute>[0]['record'];
      const result = await useCases.addSkinLog.execute({ record });
      return ok({ log: serializeSkinLog(result.log) }, 201);
    }),

    route('POST', '/appearance', async (req) => {
      const body = await readJsonBody(req);
      const record = body.record as Parameters<
        typeof useCases.addAppearanceLog.execute
      >[0]['record'];
      const result = await useCases.addAppearanceLog.execute({ record });
      return ok({ log: serializeAppearanceLog(result.log) }, 201);
    }),

    route('POST', '/purchase', async (req) => {
      const body = await readJsonBody(req);
      const record = body.record as Parameters<
        typeof useCases.recordPurchase.execute
      >[0]['record'];
      const result = await useCases.recordPurchase.execute({ record });
      return ok({ purchase: serializePurchaseLog(result.purchase) }, 201);
    }),

    route('POST', '/purchase/:id/start', async (req, params) => {
      const body = await readJsonBody(req);
      const result = await useCases.startUsingPurchase.execute({
        id: params.id!,
        date: body.date as string,
      });
      return ok({ purchase: serializePurchaseLog(result.purchase) });
    }),

    route('POST', '/purchase/:id/finish', async (req, params) => {
      const body = await readJsonBody(req);
      const result = await useCases.finishPurchase.execute({
        id: params.id!,
        date: body.date as string,
      });
      return ok({ purchase: serializePurchaseLog(result.purchase) });
    }),

    route('POST', '/capture/suggest', async (req) => {
      const body = await readJsonBody(req);
      const result = await useCases.suggestCaptureDestinations.execute({
        text: body.text as string | undefined,
        photoPath: body.photoPath as string | undefined,
      });
      return ok({ suggestions: result.suggestions });
    }),

    route('POST', '/capture', async (req) => {
      const body = await readJsonBody(req);
      const result = await useCases.recordCapture.execute({
        text: body.text as string | undefined,
        photoPath: body.photoPath as string | undefined,
        capturedAt: body.capturedAt as string,
        suggestions: body.suggestions as Parameters<
          typeof useCases.recordCapture.execute
        >[0]['suggestions'],
        destinations: body.destinations as Parameters<
          typeof useCases.recordCapture.execute
        >[0]['destinations'],
      });
      return ok(
        { capture: serializeCapture(result.capture), applied: result.applied },
        201,
      );
    }),

    route('POST', '/evaluation', async (req) => {
      const body = await readJsonBody(req);
      const record = body.record as Parameters<
        typeof useCases.addThirdPersonEvaluation.execute
      >[0]['record'];
      const result = await useCases.addThirdPersonEvaluation.execute({ record });
      return ok({ evaluation: serializeThirdPersonEvaluation(result.evaluation) }, 201);
    }),

    route('POST', '/bridge/import', async (req) => {
      const body = await readJsonBody(req);
      const logs = body.logs as Parameters<typeof useCases.importLogs.execute>[0]['logs'];
      const result = await useCases.importLogs.execute({ logs });
      return ok(result);
    }),

    route('GET', '/bridge/export', async (req) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const type = (url.searchParams.get('type') ?? undefined) as BridgeLogType | undefined;
      const result = await useCases.exportLogs.execute({ type });
      return ok(result);
    }),

    // --- External Brain（Version10） ---
    // `/external-knowledge/search`は`/external-knowledge/:id`より前に
    // 置く必要がある（先勝ちルーティングで"search"がidと誤認識されないため）。
    route('GET', '/external-knowledge/search', async (req) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const query = url.searchParams.get('q') ?? undefined;
      const status = (url.searchParams.get('status') ?? undefined) as
        | ExternalKnowledgeStatus
        | undefined;
      const result = await useCases.searchExternalKnowledge.execute({ query, status });
      return ok({
        results: result.results.map((r) => ({
          knowledge: serializeExternalKnowledge(r.knowledge),
          source: r.source ? serializeExternalSource(r.source) : null,
          matchedIn: r.matchedIn,
        })),
      });
    }),

    route('GET', '/external-knowledge', async (req) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const status = (url.searchParams.get('status') ?? undefined) as
        | ExternalKnowledgeStatus
        | undefined;
      const result = await useCases.listExternalKnowledge.execute({ status });
      return ok({ knowledge: result.knowledge.map(serializeExternalKnowledge) });
    }),

    route('GET', '/external-knowledge/:id', async (_req, params) => {
      const result = await useCases.getExternalKnowledge.execute({ id: params.id! });
      if (!result.knowledge) return fail(new Error('not found'), 404);
      return ok({ knowledge: serializeExternalKnowledge(result.knowledge) });
    }),

    route('POST', '/external-knowledge', async (req) => {
      const body = await readJsonBody(req);
      const record = body.record as Parameters<
        typeof useCases.addExternalKnowledge.execute
      >[0]['record'];
      const result = await useCases.addExternalKnowledge.execute({ record });
      return ok({ knowledge: serializeExternalKnowledge(result.knowledge) }, 201);
    }),

    route('PATCH', '/external-knowledge/:id', async (req, params) => {
      const body = await readJsonBody(req);
      const changes = body.changes as Parameters<
        typeof useCases.updateExternalKnowledge.execute
      >[0]['changes'];
      const result = await useCases.updateExternalKnowledge.execute({
        id: params.id!,
        changes,
      });
      return ok({ knowledge: serializeExternalKnowledge(result.knowledge) });
    }),

    route('DELETE', '/external-knowledge/:id', async (_req, params) => {
      await useCases.deleteExternalKnowledge.execute({ id: params.id! });
      return ok({ deleted: true });
    }),

    // --- Knowledge Retrieval（Version11） ---
    // ARCが会話に必要な知識だけを取得するための入口。スコア順に
    // ランキングしたKnowledge/Sourceに加え、Context Builderが組んだ
    // 引用ブロック（contextフィールド）を返す。AIの呼び出しは行わない
    // （ADR 0019・0021）。
    route('POST', '/knowledge/retrieve', async (req) => {
      const body = await readJsonBody(req);
      const result = await useCases.retrieveKnowledge.execute({
        query: body.query as string | undefined,
        tags: body.tags as string[] | undefined,
        topics: body.topics as string[] | undefined,
        limit: body.limit as number | undefined,
      });
      return ok({
        results: result.results.map((r) => ({
          knowledge: serializeExternalKnowledge(r.knowledge),
          source: r.source ? serializeExternalSource(r.source) : null,
          score: r.score,
          matchedIn: r.matchedIn,
        })),
        sources: result.sources.map(serializeExternalSource),
        context: buildRetrievalContext(result.results),
      });
    }),

    // --- Decision Support（Version12） ---
    // 比較材料の整理まで（DecisionContext）を返すのみ。ARCの解釈・
    // 優先順位提案はここでは生成しない（ADR 0023）。
    route('POST', '/decision/support', async (req) => {
      const body = await readJsonBody(req);
      const result = await useCases.decisionSupport.execute({
        question: body.question as string,
        candidates: body.candidates as string[] | undefined,
        tags: body.tags as string[] | undefined,
        topics: body.topics as string[] | undefined,
      });
      return ok({
        decisionContext: serializeDecisionContext(result.decisionContext),
        retrievedKnowledge: result.retrievedKnowledge.map(serializeExternalKnowledge),
        sources: result.sources.map(serializeExternalSource),
      });
    }),

    // --- Conversational Integration（Version13） ---
    // ARC Connectorのうち、ARCとの日常会話から呼び出すことを想定した
    // 唯一の入口。Intent判定に応じてRetrieve/Decisionへ振り分けるのみで、
    // 回答文は生成しない（ADR 0028）。認証方式はVersion8から変更なし
    // （127.0.0.1限定）。
    route('POST', '/conversation/context', async (req) => {
      const body = await readJsonBody(req);
      const result = await useCases.conversationGateway.execute({
        question: body.question as string,
        conversation: body.conversation as string | undefined,
        limit: body.limit as number | undefined,
      });
      return ok({ conversationContext: serializeConversationContext(result.conversationContext) });
    }),

    // --- Read Layer（Version14） ---
    // ARCが会話の中で必要最小限のデータだけを取得するための入口。
    // `limit`未指定・不正値は400にする（指示書13章「limit必須」）。
    route('GET', '/read/reflection', async (req) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const limit = requireLimit(url);
      const result = await useCases.readGateway.readReflection({ limit });
      return ok({ reflections: result.reflections.map(serializeReflection) });
    }),

    route('GET', '/read/timeline', async (req) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const limit = requireLimit(url);
      const since = url.searchParams.get('since') ?? undefined;
      const source = (url.searchParams.get('source') ?? undefined) as TimelineSource | undefined;
      const result = await useCases.readGateway.readTimeline({ limit, since, source });
      return ok({ entries: result.entries });
    }),

    route('GET', '/read/external', async (req) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const limit = requireLimit(url);
      const query = url.searchParams.get('q') ?? undefined;
      const tags = url.searchParams.getAll('tags');
      const topics = url.searchParams.getAll('topics');
      const result = await useCases.readGateway.readExternal({
        limit,
        query,
        tags: tags.length > 0 ? tags : undefined,
        topics: topics.length > 0 ? topics : undefined,
      });
      return ok({
        results: result.results.map((r) => ({
          knowledge: serializeExternalKnowledge(r.knowledge),
          source: r.source ? serializeExternalSource(r.source) : null,
          score: r.score,
          matchedIn: r.matchedIn,
        })),
        sources: result.sources.map(serializeExternalSource),
      });
    }),

    route('GET', '/read/decision', async (req) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const limit = requireLimit(url);
      const question = url.searchParams.get('question');
      if (!question) throw new Error('question is required');
      const candidates = url.searchParams.getAll('candidates');
      const tags = url.searchParams.getAll('tags');
      const topics = url.searchParams.getAll('topics');
      const result = await useCases.readGateway.readDecision({
        question,
        limit,
        candidates: candidates.length > 0 ? candidates : undefined,
        tags: tags.length > 0 ? tags : undefined,
        topics: topics.length > 0 ? topics : undefined,
      });
      return ok({
        decisionContext: serializeDecisionContext(result.decisionContext),
        retrievedKnowledge: result.retrievedKnowledge.map(serializeExternalKnowledge),
        sources: result.sources.map(serializeExternalSource),
      });
    }),

    // --- Write Proposal Layer（Version14） ---
    // ARCは/proposal/createで提案を組み立てるだけで、保存は一切行わない。
    // Ownerが承認した場合のみ、同じProposalを/proposal/approveへ再送する
    // ことで初めてRepositoryへ書き込まれる（Constitution第2条・第4条）。
    route('POST', '/proposal/create', async (req) => {
      const body = await readJsonBody(req);
      const proposal = await useCases.writeProposalGateway.createProposal({
        type: body.type as ProposalType,
        target: body.target as string,
        payload: body.payload as Record<string, unknown>,
        reason: body.reason as string,
        signals: body.signals as ApprovalSignals | undefined,
      });
      const serialized = serializeProposal(proposal);
      return ok(
        {
          proposal: proposal.autoApproved
            ? { ...serialized, result: serializeApproveResult(proposal.type, proposal.result) }
            : serialized,
        },
        201,
      );
    }),

    route('POST', '/proposal/approve', async (req) => {
      const body = await readJsonBody(req);
      const proposal = body as unknown as Proposal;
      const { type, result } = await useCases.writeProposalGateway.approveProposal(proposal);
      return ok({ type, result: serializeApproveResult(type, result) });
    }),

    route('POST', '/proposal/reject', async (req) => {
      const body = await readJsonBody(req);
      const proposal = body as unknown as Proposal;
      const result = await useCases.writeProposalGateway.rejectProposal(proposal);
      return ok(result);
    }),

    route('GET', '/approval-decisions', async (req) => {
      const url = new URL(req.url ?? '', 'http://localhost');
      const level = (url.searchParams.get('level') ?? undefined) as ApprovalLevel | undefined;
      const result = await useCases.listApprovalDecisions.execute({ level });
      return ok({ decisions: result.decisions.map(serializeApprovalDecision) });
    }),

    route('GET', '/external-sources', async () => {
      const result = await useCases.listExternalSources.execute();
      return ok({ sources: result.sources.map(serializeExternalSource) });
    }),

    route('GET', '/external-sources/:id', async (_req, params) => {
      const result = await useCases.getExternalSource.execute({ id: params.id! });
      if (!result.source) return fail(new Error('not found'), 404);
      return ok({ source: serializeExternalSource(result.source) });
    }),

    route('POST', '/external-sources', async (req) => {
      const body = await readJsonBody(req);
      const record = body.record as Parameters<
        typeof useCases.addExternalSource.execute
      >[0]['record'];
      const result = await useCases.addExternalSource.execute({ record });
      return ok({ source: serializeExternalSource(result.source) }, 201);
    }),

    route('PATCH', '/external-sources/:id', async (req, params) => {
      const body = await readJsonBody(req);
      const changes = body.changes as Parameters<
        typeof useCases.updateExternalSource.execute
      >[0]['changes'];
      const result = await useCases.updateExternalSource.execute({ id: params.id!, changes });
      return ok({ source: serializeExternalSource(result.source) });
    }),

    route('DELETE', '/external-sources/:id', async (_req, params) => {
      await useCases.deleteExternalSource.execute({ id: params.id! });
      return ok({ deleted: true });
    }),

    // --- ManagementFeedback（Version15、Connector Deployment） ---
    // Version14ではCLIのみで完結させていたが（ADR 0033）、Connectorが
    // 「HTTP APIのみを利用する」制約（指示書2章）を持つため、Connector
    // 経由でlist-feedback/resolveを呼べるようHTTPエンドポイントを追加した
    // （ADR 0035）。
    route('GET', '/management-feedback', async (req) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const resolution = (url.searchParams.get('resolution') ?? undefined) as
        | ManagementFeedbackResolution
        | undefined;
      const result = await useCases.listManagementFeedback.execute({ resolution });
      return ok({ feedback: result.feedback.map(serializeManagementFeedback) });
    }),

    route('POST', '/management-feedback/:id/resolve', async (req, params) => {
      const body = await readJsonBody(req);
      const result = await useCases.resolveManagementFeedback.execute({
        id: params.id!,
        resolution: body.resolution as ManagementFeedbackResolution,
      });
      return ok({ feedback: serializeManagementFeedback(result.feedback) });
    }),

    // --- AgentMessage（Version17、Agent Collaboration Layer） ---
    // ARC↔Claude Code間の指示書・Feedbackの往復記録。書き込みは
    // 既存のPOST /proposal/*（type: 'AgentMessage'）をそのまま使う
    // ——management-feedbackと同様、一覧取得のみ専用ルートを持つ。
    route('GET', '/agent-messages', async (req) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const direction = (url.searchParams.get('direction') ?? undefined) as
        | AgentMessageDirection
        | undefined;
      const relatedVersion = url.searchParams.get('relatedVersion') ?? undefined;
      const result = await useCases.listAgentMessages.execute({ direction, relatedVersion });
      return ok({ messages: result.messages.map(serializeAgentMessage) });
    }),

    // --- AgentDelegationGrant（Version24、Constitution第4条限定改定） ---
    // 書き込みは既存のPOST /proposal/*（type: 'AgentDelegationGrant'）を
    // そのまま使う——一覧取得のみ専用ルートを持つ（agent-messagesと同型）。
    route('GET', '/agent-delegation-grants', async (req) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const status = (url.searchParams.get('status') ?? undefined) as AgentDelegationGrantStatus | undefined;
      const result = await useCases.listAgentDelegationGrants.execute({ status });
      return ok({ grants: result.grants.map(serializeAgentDelegationGrant) });
    }),

    // --- DevelopmentGrant（Version34、ADR 0060） ---
    // 読み取り専用公開のみ。create/pause/resume/revokeはOwner専権
    // 事項のため、write route は意図的に追加しない（別工程）。
    route('GET', '/development-grants', async (req) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const status = (url.searchParams.get('status') ?? undefined) as DevelopmentGrantStatus | undefined;
      const result = await useCases.listDevelopmentGrants.execute({ status });
      return ok({ grants: result.grants.map(serializeDevelopmentGrant) });
    }),

    // --- AgentTask（Version34、ADR 0061） ---
    // 読み取り専用公開のみ。claim/heartbeat/状態遷移等のwrite route
    // は意図的に追加しない（別工程、脅威モデル再確認後に着手）。
    route('GET', '/agent-tasks', async (req) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const status = (url.searchParams.get('status') ?? undefined) as AgentTaskStatus | undefined;
      const relatedVersion = url.searchParams.get('relatedVersion') ?? undefined;
      const result = await useCases.listAgentTasks.execute({ status, relatedVersion });
      return ok({ tasks: result.tasks.map(serializeAgentTask) });
    }),

    // --- Life Log Phase 2（Version25） ---
    // 書き込みは既存のPOST /proposal/*（type: 'MealLog'等）をそのまま
    // 使う——一覧取得のみ専用ルートを持つ（agent-messagesと同型）。
    route('GET', '/meal-logs', async (req) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const limit = requireLimit(url);
      const date = url.searchParams.get('date') ?? undefined;
      const mealType = (url.searchParams.get('mealType') ?? undefined) as MealType | undefined;
      const result = await useCases.listMealLogs.execute({ limit, date, mealType });
      return ok({ logs: result.logs.map(serializeMealLog) });
    }),

    route('GET', '/nutrition-logs', async (req) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const limit = requireLimit(url);
      const mealLogId = url.searchParams.get('mealLogId') ?? undefined;
      const result = await useCases.listNutritionLogs.execute({ limit, mealLogId });
      return ok({ logs: result.logs.map(serializeNutritionLog) });
    }),

    route('GET', '/nutrition-logs/summary', async (req) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const date = url.searchParams.get('date');
      if (!date) {
        throw new Error('date is required');
      }
      const result = await useCases.summarizeNutritionByDate.execute({ date });
      return ok(result);
    }),

    route('GET', '/weight-logs', async (req) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const limit = requireLimit(url);
      const date = url.searchParams.get('date') ?? undefined;
      const result = await useCases.listWeightLogs.execute({ limit, date });
      return ok({ logs: result.logs.map(serializeWeightLog) });
    }),

    route('GET', '/finance-logs', async (req) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const limit = requireLimit(url);
      const date = url.searchParams.get('date') ?? undefined;
      const category = url.searchParams.get('category') ?? undefined;
      const type = (url.searchParams.get('type') ?? undefined) as FinanceLogType | undefined;
      const result = await useCases.listFinanceLogs.execute({ limit, date, category, type });
      return ok({ logs: result.logs.map(serializeFinanceLog) });
    }),

    // --- 行動介入レイヤー（Version26） ---
    // 書き込みは既存のPOST /proposal/*（type: 'CheckIn'等）をそのまま
    // 使う——一覧取得のみ専用ルートを持つ（Life Log Phase 2と同型）。
    // Interventionの生成（GenerateInterventionsUseCase）は意図的に
    // HTTP Route化しない——ローカルスケジューラ（checkInPrompter.ts）
    // のみが直接importして呼ぶ（Remote MCPが無認証のまま新規の書き込み
    // 経路を増やさないため、ADR 0053参照）。
    route('GET', '/check-ins', async (req) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const limit = requireLimit(url);
      const date = url.searchParams.get('date') ?? undefined;
      const result = await useCases.listCheckIns.execute({ limit, date });
      return ok({ checkIns: result.checkIns.map(serializeCheckIn) });
    }),

    route('GET', '/distraction-signals', async (req) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const limit = requireLimit(url);
      const date = url.searchParams.get('date') ?? undefined;
      const kind = (url.searchParams.get('kind') ?? undefined) as DistractionSignalKind | undefined;
      const result = await useCases.listDistractionSignals.execute({ limit, date, kind });
      return ok({ signals: result.signals.map(serializeDistractionSignal) });
    }),

    route('GET', '/interventions', async (req) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const limit = requireLimit(url);
      const status = (url.searchParams.get('status') ?? undefined) as InterventionStatus | undefined;
      const result = await useCases.listInterventions.execute({ limit, status });
      return ok({ interventions: result.interventions.map(serializeIntervention) });
    }),

    route('GET', '/intervention-policy-settings', async () => {
      const result = await useCases.getInterventionPolicySettings.execute();
      return ok(result);
    }),

    route('GET', '/daily-behavior-score', async (req) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const date = url.searchParams.get('date');
      if (!date) {
        throw new Error('date is required');
      }
      const result = await useCases.getDailyBehaviorScore.execute({ date });
      return ok(result);
    }),

    route('GET', '/intervention-effectiveness', async (req) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');
      if (!from || !to) {
        throw new Error('from and to are required');
      }
      const result = await useCases.measureInterventionEffectiveness.execute({ from, to });
      return ok(result);
    }),

    // --- Study Session Ingestion（Version27） ---
    // 既存のProposal承認経路（/proposal/*）とは独立した経路。ここは
    // 既存の`ARC_API_KEY`ゲート（handleRequest冒頭）でのみ保護される
    // ——`remoteServer.ts`（公開トンネル側）が、専用のStudy Timer token
    // で認証した後にConnector経由でここへ内部転送する構成（ADR 0054）。
    // MCP Toolは意図的に用意しない——ARC自身はこの経路を呼べない。
    route('POST', '/api/study-sessions', async (req) => {
      const body = await readJsonBody(req);
      const result = await useCases.recordStudySession.execute({
        record: {
          sessionId: body.sessionId as string,
          subject: body.subject as string,
          task: body.task as string | undefined,
          startedAt: body.startedAt as string,
          endedAt: body.endedAt as string,
          durationMs: body.durationMs as number,
          source: body.source as string,
          clientCreatedAt: body.clientCreatedAt as string,
        },
      });
      if (result.duplicate) {
        return ok({ duplicate: true, sessionId: result.session.record.sessionId });
      }
      return ok({ sessionId: result.session.record.sessionId, storedAt: result.session.storedAt.toISOString() }, 201);
    }),

    route('GET', '/api/study-sessions/summary', async (req) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');
      if (!from || !to) {
        throw new Error('from and to are required');
      }
      const result = await useCases.summarizeStudySessions.execute({ from, to });
      return ok(result);
    }),
  ];

  return createServer((req, res) => {
    void handleRequest(req, res, routes, options.apiKey);
  });
}

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  routes: Route[],
  apiKey: string | undefined,
): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const method = req.method ?? 'GET';

  if (apiKey && url.pathname !== '/health') {
    if (!isAuthorized(req.headers.authorization, apiKey)) {
      res.writeHead(401, {
        'Content-Type': 'application/json; charset=utf-8',
        'WWW-Authenticate': 'Bearer',
      });
      res.end(JSON.stringify({ ok: false, error: 'unauthorized' }));
      return;
    }
  }

  for (const r of routes) {
    if (r.method !== method) continue;
    const match = r.pattern.exec(url.pathname);
    if (!match) continue;

    const params: Record<string, string> = {};
    r.paramNames.forEach((name, i) => {
      params[name] = decodeURIComponent(match[i + 1] ?? '');
    });

    let result: JsonResult;
    try {
      result = await r.handler(req, params);
    } catch (error) {
      result = fail(error, 400);
    }
    res.writeHead(result.status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(result.body));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ ok: false, error: 'not found' }));
}

const DEFAULT_PORT = 3939;

function isMainModule(): boolean {
  return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]!).href;
}

if (isMainModule()) {
  const port = Number(process.env.PORT) || DEFAULT_PORT;
  const apiKey = loadEnv().ARC_API_KEY;
  const app = createApp({ apiKey });
  // ローカル専用（127.0.0.1のみ）。Version15で`ARC_API_KEY`が設定されて
  // いれば`Authorization: Bearer`によるAPI Key認証を強制する（ADR 0036、
  // ADR 0008の「再検討条件」に対応）。未設定ならVersion7〜14と同じく
  // 認証なしで動作する。
  app.listen(port, '127.0.0.1', () => {
    console.log(
      `ARC Connector listening on http://127.0.0.1:${port}${apiKey ? ' (API key required)' : ''}`,
    );
  });
}
