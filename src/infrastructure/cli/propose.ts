#!/usr/bin/env node
/**
 * pnpm propose — Write Proposal Layer（Version14）
 *
 * ARC → Proposal → Owner承認 → Project ARC という流れを手元で再現する
 * CLI。System（このCLI自身）はProposalを保存しない。y/nでOwnerが
 * 承認したときのみ、対応する既存UseCase経由でRepositoryへ書き込む
 * （Constitution第2条・第4条、`docs/adr/0031-write-proposal-layer.md`）。
 *
 * 引数なし: 対話式でProposalを作成→表示→Approve確認
 * `pnpm propose list-feedback`: ManagementFeedback一覧表示
 * `pnpm propose resolve <id> <Accepted|Implemented|Closed|Rejected>`:
 *   ManagementFeedbackのresolutionを遷移させる
 * `pnpm propose list-messages`: AgentMessage一覧表示（Version17）
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout, argv } from 'node:process';
import { WriteProposalGatewayUseCase } from '../../application/use-cases/write-proposal-gateway/WriteProposalGateway.js';
import { ListManagementFeedbackUseCase } from '../../application/use-cases/management-feedback/ListManagementFeedback.js';
import { ResolveManagementFeedbackUseCase } from '../../application/use-cases/management-feedback/ResolveManagementFeedback.js';
import { ListAgentMessagesUseCase } from '../../application/use-cases/agent-message/ListAgentMessages.js';
import { JsonFileReflectionRepository } from '../../adapters/repositories/JsonFileReflectionRepository.js';
import { JsonFileMemoryRepository } from '../../adapters/repositories/JsonFileMemoryRepository.js';
import { JsonFileExternalKnowledgeRepository } from '../../adapters/repositories/JsonFileExternalKnowledgeRepository.js';
import { JsonFileExternalSourceRepository } from '../../adapters/repositories/JsonFileExternalSourceRepository.js';
import { JsonFileAppearanceLogRepository } from '../../adapters/repositories/JsonFileAppearanceLogRepository.js';
import { JsonFileManagementFeedbackRepository } from '../../adapters/repositories/JsonFileManagementFeedbackRepository.js';
import { JsonFileAgentMessageRepository } from '../../adapters/repositories/JsonFileAgentMessageRepository.js';
import { JsonFileApprovalDecisionRepository } from '../../adapters/repositories/JsonFileApprovalDecisionRepository.js';
import { JsonFileChallengeLogRepository } from '../../adapters/repositories/JsonFileChallengeLogRepository.js';
import { JsonFileAgentDelegationGrantRepository } from '../../adapters/repositories/JsonFileAgentDelegationGrantRepository.js';
import { JsonFileMealLogRepository } from '../../adapters/repositories/JsonFileMealLogRepository.js';
import { JsonFileNutritionLogRepository } from '../../adapters/repositories/JsonFileNutritionLogRepository.js';
import { JsonFileWeightLogRepository } from '../../adapters/repositories/JsonFileWeightLogRepository.js';
import { JsonFileFinanceLogRepository } from '../../adapters/repositories/JsonFileFinanceLogRepository.js';
import { JsonFileCheckInRepository } from '../../adapters/repositories/JsonFileCheckInRepository.js';
import { JsonFileDistractionSignalRepository } from '../../adapters/repositories/JsonFileDistractionSignalRepository.js';
import { JsonFileInterventionRepository } from '../../adapters/repositories/JsonFileInterventionRepository.js';
import { JsonFileInterventionPolicySettingsRepository } from '../../adapters/repositories/JsonFileInterventionPolicySettingsRepository.js';
import type { ProposalType, Proposal } from '../../domain/value-objects/Proposal.js';
import type { ManagementFeedbackResolution } from '../../domain/entities/ManagementFeedback.js';
import type { MemoryCategory } from '../../domain/entities/MemoryEntry.js';
import type { AgentDelegationGrantScope } from '../../domain/entities/AgentDelegationGrant.js';

const TYPES: ProposalType[] = [
  'Reflection',
  'Memory',
  'ExternalKnowledge',
  'Appearance',
  'ManagementFeedback',
  'AgentMessage',
  'ChallengeLog',
  'AgentDelegationGrant',
  'MealLog',
  'NutritionLog',
  'WeightLog',
  'FinanceLog',
  'CheckIn',
  'DistractionSignal',
  'InterventionResponse',
  'InterventionPolicySettings',
];
const AGENT_DELEGATION_GRANT_SCOPES: AgentDelegationGrantScope[] = [
  'Reflection',
  'ChallengeLog',
  'MealLog',
  'NutritionLog',
  'WeightLog',
  'CheckIn',
  'DistractionSignal',
  'Appearance',
  'ManagementFeedback',
  'Memory',
];
const MEMORY_CATEGORIES: MemoryCategory[] = [
  'Assets', 'Appearance', 'Goals', 'Preferences', 'Education',
  'Career', 'Health', 'Finance', 'Relationships', 'Misc',
];
const RESOLUTIONS: ManagementFeedbackResolution[] = ['Accepted', 'Implemented', 'Closed', 'Rejected'];

function line(char = '─', length = 44): string {
  return char.repeat(length);
}

function buildGateway(): WriteProposalGatewayUseCase {
  return new WriteProposalGatewayUseCase(
    new JsonFileReflectionRepository(),
    new JsonFileMemoryRepository(),
    new JsonFileExternalKnowledgeRepository(),
    new JsonFileExternalSourceRepository(),
    new JsonFileAppearanceLogRepository(),
    new JsonFileManagementFeedbackRepository(),
    new JsonFileAgentMessageRepository(),
    new JsonFileApprovalDecisionRepository(),
    new JsonFileChallengeLogRepository(),
    new JsonFileAgentDelegationGrantRepository(),
    new JsonFileMealLogRepository(),
    new JsonFileNutritionLogRepository(),
    new JsonFileWeightLogRepository(),
    new JsonFileFinanceLogRepository(),
    new JsonFileCheckInRepository(),
    new JsonFileDistractionSignalRepository(),
    new JsonFileInterventionRepository(),
    new JsonFileInterventionPolicySettingsRepository(),
  );
}

type Rl = ReturnType<typeof createInterface>;

async function promptPayload(rl: Rl, type: ProposalType): Promise<Record<string, unknown>> {
  switch (type) {
    case 'Reflection': {
      const date = await rl.question('日付 (YYYY-MM-DD): ');
      const proudOf = await rl.question('今日頑張ったこと (任意): ');
      const todaysEvents = await rl.question('今日の出来事 (任意): ');
      return {
        date,
        record: {
          proudOf: proudOf || undefined,
          todaysEvents: todaysEvents || undefined,
        },
      };
    }
    case 'Memory': {
      console.log('カテゴリ: ' + MEMORY_CATEGORIES.map((c, i) => `${i + 1}=${c}`).join(' '));
      const categoryRaw = await rl.question('番号で選択 (未入力なら Misc): ');
      const category = MEMORY_CATEGORIES[Number(categoryRaw) - 1] ?? 'Misc';
      const title = await rl.question('見出し: ');
      const content = await rl.question('内容: ');
      const tagsRaw = await rl.question('タグ (カンマ区切り, 任意): ');
      return {
        record: {
          category,
          title,
          content,
          tags: tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
        },
      };
    }
    case 'ExternalKnowledge': {
      const title = await rl.question('タイトル: ');
      const content = await rl.question('内容: ');
      const capturedAt = await rl.question('知った日付 (YYYY-MM-DD): ');
      const ownerSummary = await rl.question('Ownerの要約 (任意): ');
      return {
        record: {
          title,
          content,
          capturedAt,
          ownerSummary: ownerSummary || undefined,
        },
      };
    }
    case 'Appearance': {
      const date = await rl.question('撮影日 (YYYY-MM-DD): ');
      const overallRatingRaw = await rl.question('総合評価 (1-5): ');
      const comment = await rl.question('コメント (任意): ');
      return {
        record: {
          date,
          overallRating: Number(overallRatingRaw),
          comment: comment || undefined,
        },
      };
    }
    case 'ManagementFeedback': {
      const category = await rl.question('カテゴリ: ');
      const content = await rl.question('内容: ');
      const reason = await rl.question('理由: ');
      const tagsRaw = await rl.question('タグ (カンマ区切り, 任意): ');
      return {
        record: {
          author: 'ARC',
          category,
          content,
          reason,
          tags: tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
        },
      };
    }
    case 'AgentMessage': {
      const direction = await rl.question('方向 (1=ToClaudeCode/ARC→クロコ, 2=ToARC/クロコ→ARC): ');
      const content = await rl.question('内容: ');
      const relatedVersion = await rl.question('関連Version (任意, 例: Version17): ');
      const tagsRaw = await rl.question('タグ (カンマ区切り, 任意): ');
      return {
        record: {
          direction: direction.trim() === '2' ? 'ToARC' : 'ToClaudeCode',
          content,
          relatedVersion: relatedVersion || undefined,
          tags: tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
        },
      };
    }
    case 'ChallengeLog': {
      const date = await rl.question('日付 (YYYY-MM-DD): ');
      const title = await rl.question('タイトル (例: 赤福): ');
      const category = await rl.question('カテゴリ (任意): ');
      const note = await rl.question('メモ (任意): ');
      return {
        record: {
          date,
          title,
          category: category || undefined,
          note: note || undefined,
        },
      };
    }
    case 'AgentDelegationGrant': {
      const action = await rl.question('操作 (1=create/2=pause/3=resume/4=revoke): ');
      const actionMap: Record<string, 'create' | 'pause' | 'resume' | 'revoke'> = {
        '1': 'create',
        '2': 'pause',
        '3': 'resume',
        '4': 'revoke',
      };
      const resolvedAction = actionMap[action.trim()] ?? 'create';
      if (resolvedAction !== 'create') {
        const id = await rl.question('対象GrantのID: ');
        return { action: resolvedAction, id };
      }
      const scopeRaw = await rl.question(
        `scope (カンマ区切り、${AGENT_DELEGATION_GRANT_SCOPES.join('/')}): `,
      );
      const scope = scopeRaw
        .split(',')
        .map((s) => s.trim())
        .filter((s): s is AgentDelegationGrantScope =>
          (AGENT_DELEGATION_GRANT_SCOPES as string[]).includes(s),
        );
      const expiresAtDays = await rl.question('有効期限 (今日から何日後): ');
      const usageLimitRaw = await rl.question('上限回数: ');
      const reason = await rl.question('理由: ');
      const expiresAt = new Date(Date.now() + Number(expiresAtDays) * 24 * 60 * 60 * 1000).toISOString();
      return {
        action: 'create',
        record: { scope, expiresAt, usageLimit: Number(usageLimitRaw), reason },
      };
    }
    case 'MealLog': {
      const occurredAt = await rl.question('日時 (ISO8601、例: 2026-07-17T12:00:00+09:00): ');
      const itemsRaw = await rl.question('食べたもの (カンマ区切り): ');
      const mealTypeRaw = await rl.question('食事区分 (1=breakfast/2=lunch/3=dinner/4=snack/5=other、任意): ');
      const mealTypeMap: Record<string, 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other'> = {
        '1': 'breakfast',
        '2': 'lunch',
        '3': 'dinner',
        '4': 'snack',
        '5': 'other',
      };
      const notes = await rl.question('メモ (任意): ');
      return {
        record: {
          occurredAt,
          items: itemsRaw.split(',').map((s) => s.trim()).filter(Boolean),
          mealType: mealTypeMap[mealTypeRaw.trim()],
          notes: notes || undefined,
        },
      };
    }
    case 'NutritionLog': {
      const mealLogId = await rl.question('対象MealLogのID: ');
      const caloriesRaw = await rl.question('カロリー kcal (任意): ');
      const basis = await rl.question('推定根拠 (例: 写真からの推定): ');
      const confidenceRaw = await rl.question('確信度 (1=low/2=medium/3=high、任意): ');
      const confidenceMap: Record<string, 'low' | 'medium' | 'high'> = { '1': 'low', '2': 'medium', '3': 'high' };
      const uncertaintyNote = await rl.question('確信度未入力の場合は不確実性の説明: ');
      return {
        record: {
          mealLogId,
          calories: caloriesRaw ? Number(caloriesRaw) : undefined,
          estimated: true,
          basis,
          confidence: confidenceMap[confidenceRaw.trim()],
          uncertaintyNote: uncertaintyNote || undefined,
        },
      };
    }
    case 'WeightLog': {
      const measuredAt = await rl.question('計測日時 (ISO8601、例: 2026-07-17T07:00:00+09:00): ');
      const weightKgRaw = await rl.question('体重 kg: ');
      const measurementContext = await rl.question('状況 (例: 起床後、任意): ');
      return {
        record: {
          measuredAt,
          weightKg: Number(weightKgRaw),
          measurementContext: measurementContext || undefined,
        },
      };
    }
    case 'FinanceLog': {
      const occurredAt = await rl.question('日時 (ISO8601、例: 2026-07-17T12:00:00+09:00): ');
      const typeRaw = await rl.question('種別 (1=Income/2=Expense): ');
      const amountRaw = await rl.question('金額: ');
      const category = await rl.question('カテゴリ (任意): ');
      return {
        record: {
          occurredAt,
          type: typeRaw.trim() === '1' ? 'Income' : 'Expense',
          amount: Number(amountRaw),
          category: category || undefined,
        },
      };
    }
    case 'CheckIn': {
      const occurredAt = await rl.question('日時 (ISO8601、例: 2026-07-18T14:00:00+09:00): ');
      const currentActivity = await rl.question('今何をしているか: ');
      const nextTwoHourGoal = await rl.question('次の2時間で終える成果: ');
      const statusRaw = await rl.question('前回の目標結果 (1=achieved/2=partial/3=missed、任意): ');
      const statusMap: Record<string, 'achieved' | 'partial' | 'missed'> = {
        '1': 'achieved',
        '2': 'partial',
        '3': 'missed',
      };
      const previousGoalStatus = statusMap[statusRaw.trim()];
      let missedReason: string | undefined;
      let correctiveAction: string | undefined;
      let resumeAt: string | undefined;
      if (previousGoalStatus === 'partial' || previousGoalStatus === 'missed') {
        missedReason = await rl.question('未達の原因: ');
        correctiveAction = await rl.question('修正行動: ');
        resumeAt = await rl.question('再開時刻 (ISO8601): ');
      }
      return {
        record: {
          occurredAt,
          currentActivity,
          nextTwoHourGoal,
          previousGoalStatus,
          missedReason,
          correctiveAction,
          resumeAt,
        },
      };
    }
    case 'DistractionSignal': {
      const occurredAt = await rl.question('日時 (ISO8601、例: 2026-07-18T14:00:00+09:00): ');
      const kindRaw = await rl.question(
        '種類 (1=YouTube/2=SNS/3=AimlessSearch/4=LongBreak/5=EasyTaskEscape/6=NoTimerAtLibrary/7=ScheduledTaskNotStarted/8=Other): ',
      );
      const kindMap: Record<string, string> = {
        '1': 'YouTube',
        '2': 'SNS',
        '3': 'AimlessSearch',
        '4': 'LongBreak',
        '5': 'EasyTaskEscape',
        '6': 'NoTimerAtLibrary',
        '7': 'ScheduledTaskNotStarted',
        '8': 'Other',
      };
      const basis = await rl.question('根拠: ');
      const confidenceRaw = await rl.question('確信度 (1=low/2=medium/3=high): ');
      const confidenceMap: Record<string, 'low' | 'medium' | 'high'> = { '1': 'low', '2': 'medium', '3': 'high' };
      return {
        record: {
          occurredAt,
          kind: kindMap[kindRaw.trim()] ?? 'Other',
          source: 'OwnerReported',
          basis,
          confidence: confidenceMap[confidenceRaw.trim()] ?? 'low',
        },
      };
    }
    case 'InterventionResponse': {
      const id = await rl.question('対象InterventionのID: ');
      const actionRaw = await rl.question('操作 (1=acknowledge/2=dismiss/3=snooze): ');
      const actionMap: Record<string, 'acknowledge' | 'dismiss' | 'snooze'> = {
        '1': 'acknowledge',
        '2': 'dismiss',
        '3': 'snooze',
      };
      const action = actionMap[actionRaw.trim()] ?? 'acknowledge';
      const note = action === 'dismiss' ? await rl.question('却下理由: ') : undefined;
      const snoozeUntil = action === 'snooze' ? await rl.question('スヌーズ先時刻 (ISO8601): ') : undefined;
      return { action, id, note, snoozeUntil };
    }
    case 'InterventionPolicySettings': {
      console.log('InterventionPolicySettingsはMCP/HTTP経由での設定を推奨します（CLIでは既定値を提案）。');
      return {
        record: {
          checkInIntervalMinutes: 120,
          activeHoursStart: '07:00',
          activeHoursEnd: '23:00',
          quietHoursStart: '23:00',
          quietHoursEnd: '07:00',
          dailyNotificationLimit: 6,
          minDistractionConfidenceForWarning: 'medium',
          dedupWindowMinutes: 120,
          dismissCooldownHours: 4,
          exclusionWindows: [],
        },
      };
    }
  }
}

function printProposal(proposal: Proposal): void {
  console.log('');
  console.log(line('='));
  console.log(`  保存候補 [${proposal.type}]`);
  console.log(line('='));
  console.log(`  対象: ${proposal.target}`);
  console.log(`  理由: ${proposal.reason}`);
  console.log(`  内容: ${JSON.stringify(proposal.payload, null, 2)}`);
  console.log('');
}

async function runCreate(): Promise<void> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    console.log('\n=== Proposalを作成 ===');
    console.log(TYPES.map((t, i) => `${i + 1}=${t}`).join(' '));
    const typeRaw = await rl.question('種類を番号で選択: ');
    const type = TYPES[Number(typeRaw) - 1];
    if (!type) {
      console.log('番号が不正です。中止しました。');
      return;
    }

    const target = await rl.question('対象ラベル (例:「新しいMemory: シェーバー」): ');
    const payload = await promptPayload(rl, type);
    const reason =
      type === 'ManagementFeedback'
        ? ((payload.record as { reason: string }).reason)
        : await rl.question('この提案の理由: ');

    const gateway = buildGateway();
    const proposal = await gateway.createProposal({ type, target, payload, reason });
    printProposal(proposal);

    const approveRaw = await rl.question('Approve? (y/n): ');
    if (approveRaw.trim().toLowerCase() === 'y') {
      const result = await gateway.approveProposal(proposal);
      console.log(`\n承認・保存しました。 (${result.type})`);
    } else {
      const result = await gateway.rejectProposal(proposal);
      console.log(`\n却下しました。何も保存していません。 (${result.type})`);
    }
  } finally {
    rl.close();
  }
}

async function runListFeedback(): Promise<void> {
  const useCase = new ListManagementFeedbackUseCase(new JsonFileManagementFeedbackRepository());
  const { feedback } = await useCase.execute();

  console.log('');
  console.log(line('='));
  console.log('  Management Feedback');
  console.log(line('='));

  if (feedback.length === 0) {
    console.log('\nまだフィードバックはありません。');
    return;
  }
  for (const f of feedback) {
    console.log(`\n  [${f.id}] (${f.resolution}) ${f.record.category}: ${f.record.content}`);
  }
  console.log('');
}

async function runListMessages(): Promise<void> {
  const useCase = new ListAgentMessagesUseCase(new JsonFileAgentMessageRepository());
  const { messages } = await useCase.execute();

  console.log('');
  console.log(line('='));
  console.log('  Agent Messages');
  console.log(line('='));

  if (messages.length === 0) {
    console.log('\nまだメッセージはありません。');
    return;
  }
  for (const m of messages) {
    console.log(
      `\n  [${m.id}] (${m.record.direction}) ${m.record.relatedVersion ?? ''}: ${m.record.content}`,
    );
  }
  console.log('');
}

async function runResolve(id: string, resolutionRaw: string): Promise<void> {
  const resolution = resolutionRaw as ManagementFeedbackResolution;
  if (!RESOLUTIONS.includes(resolution)) {
    console.log(`resolutionは次のいずれかを指定してください: ${RESOLUTIONS.join(', ')}`);
    process.exitCode = 1;
    return;
  }
  const useCase = new ResolveManagementFeedbackUseCase(new JsonFileManagementFeedbackRepository());
  const result = await useCase.execute({ id, resolution });
  console.log(`\n遷移しました: [${result.feedback.id}] -> ${result.feedback.resolution}`);
}

async function main(): Promise<void> {
  const args = argv.slice(2).filter((a) => a !== '--');
  const subcommand = args[0];

  switch (subcommand) {
    case undefined:
    case 'create':
      await runCreate();
      break;
    case 'list-feedback':
      await runListFeedback();
      break;
    case 'list-messages':
      await runListMessages();
      break;
    case 'resolve': {
      const [, id, resolution] = args;
      if (!id || !resolution) {
        console.log('使い方: pnpm propose resolve <id> <Accepted|Implemented|Closed|Rejected>');
        process.exitCode = 1;
        break;
      }
      await runResolve(id, resolution);
      break;
    }
    default:
      console.log('使い方: pnpm propose [create|list-feedback|resolve <id> <resolution>|list-messages]');
      process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error('エラーが発生しました:', error);
  process.exitCode = 1;
});
