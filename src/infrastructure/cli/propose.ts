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
      const scopeRaw = await rl.question('scope (カンマ区切り、Reflection/ChallengeLog): ');
      const scope = scopeRaw
        .split(',')
        .map((s) => s.trim())
        .filter((s): s is AgentDelegationGrantScope => s === 'Reflection' || s === 'ChallengeLog');
      const expiresAtDays = await rl.question('有効期限 (今日から何日後): ');
      const usageLimitRaw = await rl.question('上限回数: ');
      const reason = await rl.question('理由: ');
      const expiresAt = new Date(Date.now() + Number(expiresAtDays) * 24 * 60 * 60 * 1000).toISOString();
      return {
        action: 'create',
        record: { scope, expiresAt, usageLimit: Number(usageLimitRaw), reason },
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
