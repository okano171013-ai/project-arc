#!/usr/bin/env node
/**
 * pnpm inventory -- add|list|update|maintain|show|photo — Life Inventory
 *
 * サブコマンド:
 *   pnpm inventory -- add       持ち物を追加する
 *   pnpm inventory -- list      一覧表示する（カテゴリ絞り込み可）
 *   pnpm inventory -- update    既存の持ち物の基本情報を更新する
 *   pnpm inventory -- maintain  メンテナンス履歴を1件追加する（Version3）
 *   pnpm inventory -- show      1件の詳細を表示する（Version3）
 *   pnpm inventory -- photo     写真を紐付ける（Version4）
 *
 * 写真は画像解析をせず、`data/inventory-photos/`にコピーして
 * パスを保存するのみ（Owner要件）。
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout, argv } from 'node:process';
import { AddInventoryItemUseCase } from '../../application/use-cases/inventory/AddInventoryItem.js';
import { ListInventoryUseCase } from '../../application/use-cases/inventory/ListInventory.js';
import { UpdateInventoryItemUseCase } from '../../application/use-cases/inventory/UpdateInventoryItem.js';
import { AddMaintenanceRecordUseCase } from '../../application/use-cases/inventory/AddMaintenanceRecord.js';
import { GetInventoryItemUseCase } from '../../application/use-cases/inventory/GetInventoryItem.js';
import { JsonFileInventoryRepository } from '../../adapters/repositories/JsonFileInventoryRepository.js';
import { savePhoto } from '../storage/photoStore.js';
import {
  formatReplacementInterval,
  type InventoryCategory,
  type ItemCondition,
} from '../../domain/entities/InventoryItem.js';

const PHOTO_DIR = 'data/inventory-photos';

const CATEGORIES: InventoryCategory[] = [
  '財布',
  '傘',
  'シェーバー',
  'スキンケア',
  '靴',
  '服',
  'ガジェット',
  'その他',
];

const CONDITIONS: ItemCondition[] = ['新品', '良好', '普通', '要注意', '交換推奨'];

function line(char = '─', length = 44): string {
  return char.repeat(length);
}

function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * "2026-1-1" のようなゼロ埋めされていない日付入力を "2026-01-01" に正規化する。
 * パースできない場合は入力をそのまま返す（Domain層のバリデーションに委ねる）。
 */
function normalizeDateInput(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match || !match[1] || !match[2] || !match[3]) return trimmed;

  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

async function promptCategory(
  rl: ReturnType<typeof createInterface>,
): Promise<InventoryCategory> {
  console.log('カテゴリ: ' + CATEGORIES.map((c, i) => `${i + 1}=${c}`).join(' '));
  const raw = await rl.question('番号で選択 (未入力なら「その他」): ');
  const index = Number(raw) - 1;
  return CATEGORIES[index] ?? 'その他';
}

async function promptCondition(
  rl: ReturnType<typeof createInterface>,
): Promise<ItemCondition | undefined> {
  console.log('状態: ' + CONDITIONS.map((c, i) => `${i + 1}=${c}`).join(' '));
  const raw = await rl.question('番号で選択 (未入力ならスキップ): ');
  const index = Number(raw) - 1;
  return CONDITIONS[index];
}

/** 「2年」「6ヶ月」「18」のような入力を月数に変換する。 */
function parseReplacementInterval(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const yearMatch = trimmed.match(/^(\d+)\s*年$/);
  if (yearMatch?.[1]) return Number(yearMatch[1]) * 12;

  const monthMatch = trimmed.match(/^(\d+)\s*(ヶ月|か月|カ月)$/);
  if (monthMatch?.[1]) return Number(monthMatch[1]);

  const yearMonthMatch = trimmed.match(/^(\d+)\s*年\s*(\d+)\s*(ヶ月|か月|カ月)$/);
  if (yearMonthMatch?.[1] && yearMonthMatch[2]) {
    return Number(yearMonthMatch[1]) * 12 + Number(yearMonthMatch[2]);
  }

  const numeric = Number(trimmed);
  return Number.isFinite(numeric) ? numeric : undefined; // 数字のみは月数として扱う
}

async function runAdd(): Promise<void> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    console.log('\n=== 持ち物を追加 ===');
    const name = await rl.question('名前: ');
    if (!name.trim()) {
      console.log('名前は必須です。中止しました。');
      return;
    }
    const category = await promptCategory(rl);
    const purchaseDate = await rl.question('購入日 (YYYY-MM-DD, 任意): ');
    const purchasePriceRaw = await rl.question('購入価格 (円, 任意): ');
    const condition = await promptCondition(rl);
    const usage = await rl.question('用途 (任意): ');
    const replacementRaw = await rl.question(
      '交換目安 (例: 2年 / 6ヶ月 / 18, 任意): ',
    );
    const note = await rl.question('メモ (任意): ');

    const repository = new JsonFileInventoryRepository();
    const useCase = new AddInventoryItemUseCase(repository);
    const result = await useCase.execute({
      record: {
        name,
        category,
        note: note || undefined,
        purchaseDate: normalizeDateInput(purchaseDate),
        purchasePrice: purchasePriceRaw ? Number(purchasePriceRaw) : undefined,
        condition,
        usage: usage || undefined,
        replacementIntervalMonths: parseReplacementInterval(replacementRaw),
      },
    });

    console.log(`\n追加しました: [${result.item.category}] ${result.item.name}`);
    console.log(`  ID: ${result.item.id.slice(0, 8)}`);
  } finally {
    rl.close();
  }
}

async function runList(): Promise<void> {
  const categoryArg = argv.find((a) => a.startsWith('--category='))?.split('=')[1];
  const category = CATEGORIES.includes(categoryArg as InventoryCategory)
    ? (categoryArg as InventoryCategory)
    : undefined;

  const repository = new JsonFileInventoryRepository();
  const useCase = new ListInventoryUseCase(repository);
  const result = await useCase.execute({ category });

  console.log('');
  console.log(line('='));
  console.log('  Life Inventory' + (category ? `（${category}）` : ''));
  console.log(line('='));

  if (result.items.length === 0) {
    console.log('\n登録されている持ち物はありません。`pnpm inventory -- add` で追加できます。');
    return;
  }

  let currentCategory = '';
  for (const item of result.items) {
    if (item.category !== currentCategory) {
      currentCategory = item.category;
      console.log(`\n■ ${currentCategory}`);
    }
    const conditionSuffix = item.condition ? `  [${item.condition}]` : '';
    console.log(`  [${item.id.slice(0, 8)}] ${item.name}${conditionSuffix}`);
  }
  console.log('\n詳細は `pnpm inventory -- show` で確認できます。');
}

async function selectItem(
  rl: ReturnType<typeof createInterface>,
  repository: JsonFileInventoryRepository,
  promptLabel: string,
) {
  const listUseCase = new ListInventoryUseCase(repository);
  const { items } = await listUseCase.execute();

  if (items.length === 0) {
    console.log('\n対象がありません。先に `pnpm inventory -- add` で追加してください。');
    return null;
  }

  console.log('');
  items.forEach((item, i) => {
    console.log(`  ${i + 1}. [${item.category}] ${item.name}`);
  });
  const indexRaw = await rl.question(promptLabel);
  const index = Number(indexRaw) - 1;
  const target = items[index];
  if (!target) {
    console.log('番号が不正です。中止しました。');
    return null;
  }
  return target;
}

async function runUpdate(): Promise<void> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const repository = new JsonFileInventoryRepository();
    console.log('\n=== 持ち物を更新 ===');
    const target = await selectItem(rl, repository, '更新する番号: ');
    if (!target) return;

    const newName = await rl.question(`名前 (現在: ${target.name} / Enterで変更なし): `);
    const changeCategoryRaw = await rl.question('カテゴリを変更しますか? (y/n): ');
    const newCategory =
      changeCategoryRaw.trim().toLowerCase() === 'y' ? await promptCategory(rl) : undefined;
    const newPurchaseDate = await rl.question(
      `購入日 (現在: ${target.purchaseDate ?? 'なし'} / Enterで変更なし): `,
    );
    const newPurchasePriceRaw = await rl.question(
      `購入価格 (現在: ${target.purchasePrice ?? 'なし'} / Enterで変更なし): `,
    );
    const changeConditionRaw = await rl.question('状態を変更しますか? (y/n): ');
    const newCondition =
      changeConditionRaw.trim().toLowerCase() === 'y' ? await promptCondition(rl) : undefined;
    const newUsage = await rl.question(
      `用途 (現在: ${target.usage ?? 'なし'} / Enterで変更なし): `,
    );
    const newReplacementRaw = await rl.question(
      `交換目安 (現在: ${target.replacementIntervalMonths !== undefined ? formatReplacementInterval(target.replacementIntervalMonths) : 'なし'} / 例: 2年 / Enterで変更なし): `,
    );
    const newNote = await rl.question(
      `メモ (現在: ${target.note ?? 'なし'} / Enterで変更なし): `,
    );

    const updateUseCase = new UpdateInventoryItemUseCase(repository);
    const result = await updateUseCase.execute({
      id: target.id,
      changes: {
        name: newName || undefined,
        category: newCategory,
        purchaseDate: normalizeDateInput(newPurchaseDate),
        purchasePrice: newPurchasePriceRaw ? Number(newPurchasePriceRaw) : undefined,
        condition: newCondition,
        usage: newUsage || undefined,
        replacementIntervalMonths: parseReplacementInterval(newReplacementRaw),
        note: newNote || undefined,
      },
    });

    console.log(`\n更新しました: [${result.item.category}] ${result.item.name}`);
  } finally {
    rl.close();
  }
}

async function runMaintain(): Promise<void> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const repository = new JsonFileInventoryRepository();
    console.log('\n=== メンテナンス履歴を追加 ===');
    const target = await selectItem(rl, repository, '対象の番号: ');
    if (!target) return;

    const content = await rl.question('内容 (例: 電池交換, 靴底修理): ');
    if (!content.trim()) {
      console.log('内容は必須です。中止しました。');
      return;
    }
    const dateRaw = await rl.question(`日付 (YYYY-MM-DD, Enterで今日=${today()}): `);
    const date = normalizeDateInput(dateRaw) ?? today();

    const useCase = new AddMaintenanceRecordUseCase(repository);
    const result = await useCase.execute({
      id: target.id,
      record: { date, content },
    });

    console.log(`\n記録しました: [${result.item.name}] メンテナンス履歴 ${result.item.maintenanceHistory.length}件`);
  } finally {
    rl.close();
  }
}

async function runShow(): Promise<void> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const repository = new JsonFileInventoryRepository();
    const target = await selectItem(rl, repository, '表示する番号: ');
    if (!target) return;

    const getUseCase = new GetInventoryItemUseCase(repository);
    const { item } = await getUseCase.execute({ id: target.id });
    if (!item) return;

    console.log('');
    console.log(line('='));
    console.log(`  ${item.name}`);
    console.log(line('='));
    console.log(`  カテゴリ    : ${item.category}`);
    console.log(`  状態        : ${item.condition ?? '未設定'}`);
    console.log(`  用途        : ${item.usage ?? '未設定'}`);
    console.log(`  購入日      : ${item.purchaseDate ?? '未設定'}`);
    console.log(
      `  購入価格    : ${item.purchasePrice !== undefined ? `${item.purchasePrice}円` : '未設定'}`,
    );
    console.log(
      `  交換目安    : ${item.replacementIntervalMonths !== undefined ? formatReplacementInterval(item.replacementIntervalMonths) : '未設定'}`,
    );
    console.log(`  メモ        : ${item.note ?? 'なし'}`);
    console.log(`  写真        : ${item.photoPath ?? '未設定'}`);

    console.log('\n  メンテナンス履歴:');
    if (item.maintenanceHistory.length === 0) {
      console.log('    記録なし');
    } else {
      for (const record of item.maintenanceHistory) {
        console.log(`    - ${record.date}: ${record.content}`);
      }
    }
    console.log('');
  } finally {
    rl.close();
  }
}

async function runPhoto(): Promise<void> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const repository = new JsonFileInventoryRepository();
    console.log('\n=== 写真を紐付ける ===');
    const target = await selectItem(rl, repository, '対象の番号: ');
    if (!target) return;

    const sourcePath = await rl.question('写真ファイルのパス (PCに保存済みのファイルを指定): ');
    if (!sourcePath.trim()) {
      console.log('パスが未入力のため中止しました。');
      return;
    }

    let photoPath: string;
    try {
      photoPath = await savePhoto({
        sourcePath: sourcePath.trim(),
        destDir: PHOTO_DIR,
        filenamePrefix: target.id.slice(0, 8),
      });
    } catch (error) {
      console.log(`写真の保存に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }

    const updateUseCase = new UpdateInventoryItemUseCase(repository);
    const result = await updateUseCase.execute({ id: target.id, changes: { photoPath } });

    console.log(`\n紐付けました: [${result.item.name}] → ${photoPath}`);
  } finally {
    rl.close();
  }
}

async function main(): Promise<void> {
  // pnpmは `pnpm inventory -- add` の `--` をそのままスクリプトに渡すため、
  // サブコマンド検出時にはこれを無視する。
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
    case 'maintain':
      await runMaintain();
      break;
    case 'show':
      await runShow();
      break;
    case 'photo':
      await runPhoto();
      break;
    default:
      console.log('使い方: pnpm run inventory -- <add|list|update|maintain|show|photo>');
      process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error('エラーが発生しました:', error);
  process.exitCode = 1;
});
