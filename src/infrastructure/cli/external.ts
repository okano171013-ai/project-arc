#!/usr/bin/env node
/**
 * pnpm external -- add|list|show|update|delete|search|retrieve|review|archive
 * External Brain（Version10）／Knowledge Retrieval（Version11）
 *
 * 出典（ExternalSource）と知識（ExternalKnowledge）はDomain/
 * Application層では分離されているが（ADR 0013）、CLIは日常利用の
 * しやすさを優先し一体型の入力フローとする（指示書5.1）。
 *
 * Systemは情報の正しさを断定しない（ADR 0012）。confidenceは
 * Ownerが設定する補助的な属性であり、Systemが自動決定しない。
 *
 * `retrieve`はVersion11で追加。`search`（人間がCLIで一覧・一致箇所を
 * 見るためのコマンド）とは別に、ARCへ渡すことを想定したスコア順
 * ランキング＋Context Builder出力を行う（ADR 0019）。
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout, argv } from 'node:process';
import { AddExternalSourceUseCase } from '../../application/use-cases/external-source/AddExternalSource.js';
import { ListExternalSourcesUseCase } from '../../application/use-cases/external-source/ListExternalSources.js';
import { FindDuplicateExternalSourceUseCase } from '../../application/use-cases/external-source/FindDuplicateExternalSource.js';
import { AddExternalKnowledgeUseCase } from '../../application/use-cases/external-knowledge/AddExternalKnowledge.js';
import { ListExternalKnowledgeUseCase } from '../../application/use-cases/external-knowledge/ListExternalKnowledge.js';
import { GetExternalKnowledgeUseCase } from '../../application/use-cases/external-knowledge/GetExternalKnowledge.js';
import { UpdateExternalKnowledgeUseCase } from '../../application/use-cases/external-knowledge/UpdateExternalKnowledge.js';
import { DeleteExternalKnowledgeUseCase } from '../../application/use-cases/external-knowledge/DeleteExternalKnowledge.js';
import { SearchExternalKnowledgeUseCase } from '../../application/use-cases/external-knowledge/SearchExternalKnowledge.js';
import { RetrieveKnowledgeUseCase } from '../../application/use-cases/knowledge-retrieval/RetrieveKnowledge.js';
import { buildRetrievalContext } from '../../application/use-cases/knowledge-retrieval/BuildRetrievalContext.js';
import { JsonFileExternalSourceRepository } from '../../adapters/repositories/JsonFileExternalSourceRepository.js';
import { JsonFileExternalKnowledgeRepository } from '../../adapters/repositories/JsonFileExternalKnowledgeRepository.js';
import type { ExternalSourceType } from '../../domain/entities/ExternalSource.js';
import type {
  ExternalKnowledgeConfidence,
  ExternalKnowledgeStatus,
} from '../../domain/entities/ExternalKnowledge.js';

const SOURCE_TYPES: ExternalSourceType[] = [
  'web',
  'book',
  'paper',
  'video',
  'social',
  'news',
  'lecture',
  'conversation',
  'document',
  'email',
  'observation',
  'other',
];

const CONFIDENCES: ExternalKnowledgeConfidence[] = ['unassessed', 'low', 'medium', 'high'];
const CONFIDENCE_LABEL: Record<ExternalKnowledgeConfidence, string> = {
  unassessed: '未評価',
  low: '低（慎重に扱う）',
  medium: '中（一定の根拠がある）',
  high: '高（Ownerが比較的信頼している）',
};

function line(char = '─', length = 44): string {
  return char.repeat(length);
}

/**
 * サブコマンド以降の位置引数（フラグを除く）を返す。
 * pnpmが挟む"--"やサブコマンド名自体の位置がコマンド起動経路に
 * よってずれるため、固定インデックスを仮定しない（bridge.tsの
 * runImportで見つかったバグと同種、CLAUDE.md参照）。
 */
function positionalArgs(): string[] {
  const args = argv.slice(2).filter((a) => a !== '--');
  return args.slice(1).filter((a) => !a.startsWith('--'));
}

function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function buildRepositories() {
  return {
    sourceRepository: new JsonFileExternalSourceRepository(),
    knowledgeRepository: new JsonFileExternalKnowledgeRepository(),
  };
}

async function chooseSourceType(
  rl: ReturnType<typeof createInterface>,
): Promise<ExternalSourceType> {
  console.log('  出典の種類: ' + SOURCE_TYPES.map((t, i) => `${i + 1}=${t}`).join(' '));
  const raw = await rl.question('  番号で選択 (Enterで web): ');
  const index = Number(raw) - 1;
  return SOURCE_TYPES[index] ?? 'web';
}

async function chooseConfidence(
  rl: ReturnType<typeof createInterface>,
): Promise<ExternalKnowledgeConfidence> {
  console.log('  信頼度: ' + CONFIDENCES.map((c, i) => `${i + 1}=${CONFIDENCE_LABEL[c]}`).join(' / '));
  const raw = await rl.question('  番号で選択 (任意、Enterで未評価): ');
  const index = Number(raw) - 1;
  return CONFIDENCES[index] ?? 'unassessed';
}

/** 既存Sourceから検索して選ぶ。見つからない/選ばない場合はnull。 */
async function pickExistingSource(
  rl: ReturnType<typeof createInterface>,
  sourceRepository: JsonFileExternalSourceRepository,
): Promise<string | null> {
  const keyword = await rl.question('  検索キーワード (任意、Enterで全件表示): ');
  const { sources } = await new ListExternalSourcesUseCase(sourceRepository).execute();
  const filtered = keyword.trim()
    ? sources.filter((s) => s.title.toLowerCase().includes(keyword.trim().toLowerCase()))
    : sources;

  if (filtered.length === 0) {
    console.log('  該当する出典が見つかりませんでした。');
    return null;
  }
  filtered.forEach((s, i) => {
    console.log(`  ${i + 1}. [${s.record.sourceType}] ${s.title}${s.url ? ` (${s.url})` : ''}`);
  });
  const raw = await rl.question('  番号で選択 (Enterで中止): ');
  const index = Number(raw) - 1;
  const target = filtered[index];
  return target ? target.id : null;
}

/** 新規Sourceの入力。URL/identifierの重複があれば警告するが、登録自体は止めない（ADR 0012）。 */
async function inputNewSource(
  rl: ReturnType<typeof createInterface>,
  sourceRepository: JsonFileExternalSourceRepository,
  title: string,
): Promise<string> {
  const sourceType = await chooseSourceType(rl);
  const url = await rl.question('  URL (任意): ');
  const author = await rl.question('  著者 (任意): ');
  const publisher = await rl.question('  発行元 (任意): ');
  const publishedAt = await rl.question('  発行日 (任意, YYYY-MM-DD): ');
  const accessedAt = await rl.question(`  取得日 (任意, YYYY-MM-DD, Enterで今日=${today()}): `);
  const identifier = await rl.question('  識別子 (ISBN/DOI等, 任意): ');
  const notes = await rl.question('  出典メモ (任意): ');

  const duplicateCheck = new FindDuplicateExternalSourceUseCase(sourceRepository);
  const { duplicates } = await duplicateCheck.execute({
    url: url.trim() || undefined,
    identifier: identifier.trim() || undefined,
  });
  if (duplicates.length > 0) {
    console.log(
      `  ⚠ 同一URL/識別子の出典が既に${duplicates.length}件あります: ${duplicates
        .map((d) => d.title)
        .join(', ')}`,
    );
    console.log('  （そのまま新規登録します。既存を使いたい場合は中止して選び直してください）');
  }

  const useCase = new AddExternalSourceUseCase(sourceRepository);
  const { source } = await useCase.execute({
    record: {
      sourceType,
      title,
      author: author || undefined,
      publisher: publisher || undefined,
      url: url || undefined,
      publishedAt: publishedAt || undefined,
      accessedAt: accessedAt || (url.trim() ? today() : undefined),
      identifier: identifier || undefined,
      notes: notes || undefined,
    },
  });
  return source.id;
}

async function resolveSourceId(
  rl: ReturnType<typeof createInterface>,
  sourceRepository: JsonFileExternalSourceRepository,
): Promise<string | undefined> {
  console.log('\n--- 出典（任意、分かる範囲でOK） ---');
  const choice = await rl.question(
    '既存の出典を使いますか？ (y=既存から選ぶ / n=新規入力 / Enterで出典なし): ',
  );
  const normalized = choice.trim().toLowerCase();
  if (normalized === 'y') {
    const id = await pickExistingSource(rl, sourceRepository);
    return id ?? undefined;
  }
  if (normalized === 'n') {
    const title = await rl.question('  出典タイトル (必須、例: 記事名・書籍名): ');
    if (!title.trim()) {
      console.log('  タイトルが未入力のため出典なしで進めます。');
      return undefined;
    }
    return inputNewSource(rl, sourceRepository, title);
  }
  return undefined;
}

async function runAdd(): Promise<void> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    console.log('\n=== External Brainに追加 ===');
    const repos = buildRepositories();

    const sourceId = await resolveSourceId(rl, repos.sourceRepository);

    console.log('\n--- 知識（title, contentは必須） ---');
    const title = await rl.question('タイトル (必須): ');
    if (!title.trim()) {
      console.log('タイトルは必須です。中止しました。');
      return;
    }
    const content = await rl.question('内容 (必須、外部情報そのもの): ');
    if (!content.trim()) {
      console.log('内容は必須です。中止しました。');
      return;
    }
    const ownerSummary = await rl.question('自分なりの要約 (任意): ');
    const ownerComment = await rl.question('自分の考え・コメント (任意): ');
    const purpose = await rl.question('保存した理由 (任意): ');
    const topicsRaw = await rl.question('トピック (カンマ区切り、任意): ');
    const tagsRaw = await rl.question('タグ (カンマ区切り、任意): ');
    const confidence = await chooseConfidence(rl);
    const occurredAt = await rl.question('出来事の日付 (任意, YYYY-MM-DD): ');

    const useCase = new AddExternalKnowledgeUseCase(repos.knowledgeRepository, repos.sourceRepository);
    const result = await useCase.execute({
      record: {
        sourceId,
        title,
        content,
        ownerSummary: ownerSummary || undefined,
        ownerComment: ownerComment || undefined,
        topics: topicsRaw ? topicsRaw.split(',').map((t) => t.trim()) : undefined,
        tags: tagsRaw ? tagsRaw.split(',').map((t) => t.trim()) : undefined,
        purpose: purpose || undefined,
        confidence,
        capturedAt: today(),
        occurredAt: occurredAt || undefined,
      },
    });

    console.log(`\n記録しました: ${result.knowledge.title}`);
    console.log(`  ID: ${result.knowledge.id.slice(0, 8)}`);
  } finally {
    rl.close();
  }
}

async function runList(): Promise<void> {
  const statusArg = argv.find((a) => a.startsWith('--status='))?.split('=')[1] as
    | ExternalKnowledgeStatus
    | undefined;
  const repos = buildRepositories();
  const { knowledge } = await new ListExternalKnowledgeUseCase(repos.knowledgeRepository).execute({
    status: statusArg,
  });

  console.log('');
  console.log(line('='));
  console.log('  External Brain' + (statusArg ? `（${statusArg}）` : ''));
  console.log(line('='));

  if (knowledge.length === 0) {
    console.log('\n記録がありません。`pnpm external -- add` で追加できます。');
    return;
  }

  for (const k of knowledge) {
    const source = k.sourceId ? await repos.sourceRepository.findById(k.sourceId) : null;
    const sourceLabel = source ? `[${source.record.sourceType}] ${source.title}` : '(出典なし)';
    const labels = [...k.record.topics, ...k.record.tags];
    console.log(
      `\n■ [${k.id.slice(0, 8)}] ${k.title}  (${k.status})\n  出典: ${sourceLabel}\n  ${labels.length > 0 ? `#${labels.join(' #')}  ` : ''}${k.capturedAt}`,
    );
  }
  console.log('');
}

async function runShow(): Promise<void> {
  const id = positionalArgs()[0];
  if (!id) {
    console.log('使い方: pnpm run external -- show <id>');
    process.exitCode = 1;
    return;
  }
  const repos = buildRepositories();
  const { knowledge } = await new GetExternalKnowledgeUseCase(repos.knowledgeRepository).execute({
    id,
  });
  if (!knowledge) {
    console.log(`見つかりません: ${id}`);
    process.exitCode = 1;
    return;
  }
  const source = knowledge.sourceId ? await repos.sourceRepository.findById(knowledge.sourceId) : null;

  console.log('');
  console.log(line('='));
  console.log(`  ${knowledge.title}`);
  console.log(line('='));
  console.log(`  status      : ${knowledge.record.status}`);
  console.log(`  confidence  : ${CONFIDENCE_LABEL[knowledge.record.confidence]}`);
  console.log(`  capturedAt  : ${knowledge.capturedAt}`);
  if (knowledge.record.occurredAt) console.log(`  occurredAt  : ${knowledge.record.occurredAt}`);
  if (source) {
    console.log(`  出典        : [${source.record.sourceType}] ${source.title}`);
    if (source.url) console.log(`    URL       : ${source.url}`);
    if (source.record.author) console.log(`    著者      : ${source.record.author}`);
    if (source.record.publisher) console.log(`    発行元    : ${source.record.publisher}`);
    if (source.record.identifier) console.log(`    識別子    : ${source.record.identifier}`);
  } else {
    console.log('  出典        : (なし)');
  }
  console.log(`\n  内容:\n    ${knowledge.record.content}`);
  if (knowledge.record.ownerSummary) console.log(`\n  自分の要約:\n    ${knowledge.record.ownerSummary}`);
  if (knowledge.record.ownerComment) console.log(`\n  自分のコメント:\n    ${knowledge.record.ownerComment}`);
  if (knowledge.record.purpose) console.log(`\n  保存した理由: ${knowledge.record.purpose}`);
  if (knowledge.record.topics.length > 0) console.log(`  topics      : ${knowledge.record.topics.join(', ')}`);
  if (knowledge.record.tags.length > 0) console.log(`  tags        : ${knowledge.record.tags.join(', ')}`);
  console.log('');
}

async function runUpdate(): Promise<void> {
  const id = positionalArgs()[0];
  if (!id) {
    console.log('使い方: pnpm run external -- update <id>');
    process.exitCode = 1;
    return;
  }
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const repos = buildRepositories();
    const { knowledge: target } = await new GetExternalKnowledgeUseCase(
      repos.knowledgeRepository,
    ).execute({ id });
    if (!target) {
      console.log(`見つかりません: ${id}`);
      return;
    }

    console.log(`\n=== 更新: ${target.title} ===`);
    const newTitle = await rl.question(`タイトル (現在: ${target.title} / Enterで変更なし): `);
    const newContent = await rl.question('内容 (現在の内容あり / Enterで変更なし): ');
    const newOwnerSummary = await rl.question(
      `自分の要約 (現在: ${target.record.ownerSummary ?? 'なし'} / Enterで変更なし): `,
    );
    const newOwnerComment = await rl.question(
      `自分のコメント (現在: ${target.record.ownerComment ?? 'なし'} / Enterで変更なし): `,
    );
    const newTopicsRaw = await rl.question(
      `トピック (現在: ${target.record.topics.join(', ') || 'なし'} / カンマ区切り, Enterで変更なし): `,
    );
    const newTagsRaw = await rl.question(
      `タグ (現在: ${target.record.tags.join(', ') || 'なし'} / カンマ区切り, Enterで変更なし): `,
    );

    const useCase = new UpdateExternalKnowledgeUseCase(repos.knowledgeRepository, repos.sourceRepository);
    const result = await useCase.execute({
      id,
      changes: {
        title: newTitle || undefined,
        content: newContent || undefined,
        ownerSummary: newOwnerSummary || undefined,
        ownerComment: newOwnerComment || undefined,
        topics: newTopicsRaw ? newTopicsRaw.split(',').map((t) => t.trim()) : undefined,
        tags: newTagsRaw ? newTagsRaw.split(',').map((t) => t.trim()) : undefined,
      },
    });

    console.log(`\n更新しました: ${result.knowledge.title}`);
  } finally {
    rl.close();
  }
}

async function runDelete(): Promise<void> {
  const id = positionalArgs()[0];
  if (!id) {
    console.log('使い方: pnpm run external -- delete <id>');
    process.exitCode = 1;
    return;
  }
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const repos = buildRepositories();
    const { knowledge: target } = await new GetExternalKnowledgeUseCase(
      repos.knowledgeRepository,
    ).execute({ id });
    if (!target) {
      console.log(`見つかりません: ${id}`);
      return;
    }
    const confirm = await rl.question(`本当に削除しますか? ${target.title} (y/n): `);
    if (confirm.trim().toLowerCase() !== 'y') {
      console.log('中止しました。');
      return;
    }
    await new DeleteExternalKnowledgeUseCase(repos.knowledgeRepository).execute({ id });
    console.log('削除しました。');
  } finally {
    rl.close();
  }
}

async function runSearch(): Promise<void> {
  const query = positionalArgs().join(' ');
  const statusArg = argv.find((a) => a.startsWith('--status='))?.split('=')[1] as
    | ExternalKnowledgeStatus
    | undefined;

  const repos = buildRepositories();
  const { results } = await new SearchExternalKnowledgeUseCase(
    repos.knowledgeRepository,
    repos.sourceRepository,
  ).execute({ query, status: statusArg });

  console.log('');
  console.log(line('='));
  console.log(`  検索結果: 「${query || '(全件)'}」`);
  console.log(line('='));

  if (results.length === 0) {
    console.log('\n見つかりませんでした。');
    return;
  }

  for (const r of results) {
    console.log(`\n■ [${r.knowledge.id.slice(0, 8)}] ${r.knowledge.title}  (${r.knowledge.status})`);
    if (r.source) console.log(`  出典: ${r.source.title}`);
    if (r.matchedIn.length > 0) console.log(`  一致箇所: ${r.matchedIn.join(', ')}`);
  }
  console.log('');
}

/** ARCが会話に必要な知識だけを取得する想定のコマンド（Version11、Knowledge Retrieval）。 */
async function runRetrieve(): Promise<void> {
  const query = positionalArgs().join(' ');
  const tagsArg = argv.find((a) => a.startsWith('--tags='))?.split('=')[1];
  const topicsArg = argv.find((a) => a.startsWith('--topics='))?.split('=')[1];
  const limitArg = argv.find((a) => a.startsWith('--limit='))?.split('=')[1];

  const repos = buildRepositories();
  const { results, sources } = await new RetrieveKnowledgeUseCase(
    repos.knowledgeRepository,
    repos.sourceRepository,
  ).execute({
    query,
    tags: tagsArg ? tagsArg.split(',').map((t) => t.trim()) : undefined,
    topics: topicsArg ? topicsArg.split(',').map((t) => t.trim()) : undefined,
    limit: limitArg ? Number(limitArg) : undefined,
  });

  console.log('');
  console.log(line('='));
  console.log(`  Knowledge Retrieval: 「${query || '(全件)'}」`);
  console.log(line('='));

  if (results.length === 0) {
    console.log('\n該当するKnowledgeが見つかりませんでした。');
    return;
  }

  console.log(`\n${results.length}件ヒット（出典${sources.length}件）\n`);
  for (const r of results) {
    console.log(
      `■ [score:${r.score}] [${r.knowledge.id.slice(0, 8)}] ${r.knowledge.title}${r.source ? `  出典: ${r.source.title}` : ''}`,
    );
  }

  console.log(`\n${line('-')}\n  ARCへ渡す想定のcontext（Context Builder出力）\n${line('-')}\n`);
  console.log(buildRetrievalContext(results));
  console.log('');
}

async function updateStatus(newStatus: ExternalKnowledgeStatus): Promise<void> {
  const id = positionalArgs()[0];
  if (!id) {
    console.log(`使い方: pnpm run external -- ${newStatus === 'reviewed' ? 'review' : 'archive'} <id>`);
    process.exitCode = 1;
    return;
  }
  const repos = buildRepositories();
  const useCase = new UpdateExternalKnowledgeUseCase(repos.knowledgeRepository, repos.sourceRepository);
  const result = await useCase.execute({ id, changes: { status: newStatus } });
  console.log(`更新しました: ${result.knowledge.title} → ${newStatus}`);
}

async function main(): Promise<void> {
  const args = argv.slice(2).filter((a) => a !== '--');
  const subcommand = args[0];

  switch (subcommand) {
    case 'add':
      await runAdd();
      break;
    case 'list':
      await runList();
      break;
    case 'show':
      await runShow();
      break;
    case 'update':
      await runUpdate();
      break;
    case 'delete':
      await runDelete();
      break;
    case 'search':
      await runSearch();
      break;
    case 'retrieve':
      await runRetrieve();
      break;
    case 'review':
      await updateStatus('reviewed');
      break;
    case 'archive':
      await updateStatus('archived');
      break;
    default:
      console.log(
        '使い方: pnpm run external -- <add|list|show|update|delete|search|retrieve|review|archive>',
      );
      process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error('エラーが発生しました:', error);
  process.exitCode = 1;
});
