#!/usr/bin/env node
/**
 * pnpm memory -- add|list|update|delete — ARC Memory（Version4）
 *
 * Reflection（その日の記録）とは別物の、長期間保持する知識を管理する
 * （ADR 0005）。検索は横断検索 `pnpm find` を使う（Memory単体の
 * カテゴリ絞り込みは `list --category=` で可能）。
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout, argv } from 'node:process';
import { AddMemoryEntryUseCase } from '../../application/use-cases/memory/AddMemoryEntry.js';
import { ListMemoryEntriesUseCase } from '../../application/use-cases/memory/ListMemoryEntries.js';
import { UpdateMemoryEntryUseCase } from '../../application/use-cases/memory/UpdateMemoryEntry.js';
import { DeleteMemoryEntryUseCase } from '../../application/use-cases/memory/DeleteMemoryEntry.js';
import { JsonFileMemoryRepository } from '../../adapters/repositories/JsonFileMemoryRepository.js';
import type { MemoryCategory } from '../../domain/entities/MemoryEntry.js';

const CATEGORIES: MemoryCategory[] = [
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
];

function line(char = '─', length = 44): string {
  return char.repeat(length);
}

async function promptCategory(
  rl: ReturnType<typeof createInterface>,
): Promise<MemoryCategory> {
  console.log('カテゴリ: ' + CATEGORIES.map((c, i) => `${i + 1}=${c}`).join(' '));
  const raw = await rl.question('番号で選択 (未入力なら Misc): ');
  const index = Number(raw) - 1;
  return CATEGORIES[index] ?? 'Misc';
}

async function runAdd(): Promise<void> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    console.log('\n=== Memoryを追加 ===');
    const category = await promptCategory(rl);
    const title = await rl.question('見出し (例: シェーバー): ');
    if (!title.trim()) {
      console.log('見出しは必須です。中止しました。');
      return;
    }
    const content = await rl.question('内容 (例: PHILIPS 5000 Series): ');
    const tagsRaw = await rl.question('タグ (カンマ区切り, 任意): ');

    const repository = new JsonFileMemoryRepository();
    const useCase = new AddMemoryEntryUseCase(repository);
    const result = await useCase.execute({
      record: {
        category,
        title,
        content,
        tags: tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      },
    });

    console.log(`\n追加しました: [${result.entry.category}] ${result.entry.title}`);
    console.log(`  ID: ${result.entry.id.slice(0, 8)}`);
  } finally {
    rl.close();
  }
}

async function runList(): Promise<void> {
  const categoryArg = argv.find((a) => a.startsWith('--category='))?.split('=')[1];
  const category = CATEGORIES.includes(categoryArg as MemoryCategory)
    ? (categoryArg as MemoryCategory)
    : undefined;

  const repository = new JsonFileMemoryRepository();
  const useCase = new ListMemoryEntriesUseCase(repository);
  const result = await useCase.execute({ category });

  console.log('');
  console.log(line('='));
  console.log('  ARC Memory' + (category ? `（${category}）` : ''));
  console.log(line('='));

  if (result.entries.length === 0) {
    console.log('\n登録されているMemoryはありません。`pnpm memory -- add` で追加できます。');
    return;
  }

  let currentCategory = '';
  for (const entry of result.entries) {
    if (entry.category !== currentCategory) {
      currentCategory = entry.category;
      console.log(`\n■ ${currentCategory}`);
    }
    const tagsSuffix = entry.tags.length > 0 ? `  #${entry.tags.join(' #')}` : '';
    console.log(`  [${entry.id.slice(0, 8)}] ${entry.title} — ${entry.content}${tagsSuffix}`);
  }
  console.log('');
}

async function selectEntry(
  rl: ReturnType<typeof createInterface>,
  repository: JsonFileMemoryRepository,
  promptLabel: string,
) {
  const listUseCase = new ListMemoryEntriesUseCase(repository);
  const { entries } = await listUseCase.execute();

  if (entries.length === 0) {
    console.log('\n対象がありません。先に `pnpm memory -- add` で追加してください。');
    return null;
  }

  console.log('');
  entries.forEach((entry, i) => {
    console.log(`  ${i + 1}. [${entry.category}] ${entry.title} — ${entry.content}`);
  });
  const indexRaw = await rl.question(promptLabel);
  const index = Number(indexRaw) - 1;
  const target = entries[index];
  if (!target) {
    console.log('番号が不正です。中止しました。');
    return null;
  }
  return target;
}

async function runUpdate(): Promise<void> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const repository = new JsonFileMemoryRepository();
    console.log('\n=== Memoryを更新 ===');
    const target = await selectEntry(rl, repository, '更新する番号: ');
    if (!target) return;

    const newTitle = await rl.question(`見出し (現在: ${target.title} / Enterで変更なし): `);
    const newContent = await rl.question(
      `内容 (現在: ${target.content} / Enterで変更なし): `,
    );
    const changeCategoryRaw = await rl.question('カテゴリを変更しますか? (y/n): ');
    const newCategory =
      changeCategoryRaw.trim().toLowerCase() === 'y' ? await promptCategory(rl) : undefined;
    const newTagsRaw = await rl.question(
      `タグ (現在: ${target.tags.join(', ') || 'なし'} / カンマ区切り, Enterで変更なし): `,
    );

    const updateUseCase = new UpdateMemoryEntryUseCase(repository);
    const result = await updateUseCase.execute({
      id: target.id,
      changes: {
        title: newTitle || undefined,
        content: newContent || undefined,
        category: newCategory,
        tags: newTagsRaw
          ? newTagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
          : undefined,
      },
    });

    console.log(`\n更新しました: [${result.entry.category}] ${result.entry.title}`);
  } finally {
    rl.close();
  }
}

async function runDelete(): Promise<void> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const repository = new JsonFileMemoryRepository();
    console.log('\n=== Memoryを削除 ===');
    const target = await selectEntry(rl, repository, '削除する番号: ');
    if (!target) return;

    const confirm = await rl.question(
      `本当に削除しますか? [${target.category}] ${target.title} (y/n): `,
    );
    if (confirm.trim().toLowerCase() !== 'y') {
      console.log('中止しました。');
      return;
    }

    const deleteUseCase = new DeleteMemoryEntryUseCase(repository);
    await deleteUseCase.execute({ id: target.id });
    console.log('\n削除しました。');
  } finally {
    rl.close();
  }
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
    case 'update':
      await runUpdate();
      break;
    case 'delete':
      await runDelete();
      break;
    default:
      console.log('使い方: pnpm run memory -- <add|list|update|delete>');
      process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error('エラーが発生しました:', error);
  process.exitCode = 1;
});
