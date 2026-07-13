#!/usr/bin/env node
/**
 * pnpm purchase -- add|start|finish|list — Purchase Log（Version5）
 *
 * 消耗品（化粧水・洗顔料・カミソリ替刃等）の「購入日→使い始め→
 * 使い切り」を管理する。Life Inventory（耐久消費財）とは別物
 * （ADR 0006）。同じ商品でも購入のたびに新しいレコードを作る。
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout, argv } from 'node:process';
import { RecordPurchaseUseCase } from '../../application/use-cases/purchase/RecordPurchase.js';
import { StartUsingPurchaseUseCase } from '../../application/use-cases/purchase/StartUsingPurchase.js';
import { FinishPurchaseUseCase } from '../../application/use-cases/purchase/FinishPurchase.js';
import { ListPurchasesUseCase } from '../../application/use-cases/purchase/ListPurchases.js';
import { JsonFilePurchaseLogRepository } from '../../adapters/repositories/JsonFilePurchaseLogRepository.js';
import type { PurchaseLog, PurchaseStatus } from '../../domain/entities/PurchaseLog.js';

function line(char = '─', length = 44): string {
  return char.repeat(length);
}

function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

async function runAdd(): Promise<void> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    console.log('\n=== Purchase Logを追加 ===');
    const productName = await rl.question('商品名 (例: メラノCC): ');
    if (!productName.trim()) {
      console.log('商品名は必須です。中止しました。');
      return;
    }
    const category = await rl.question('カテゴリ (例: スキンケア, 任意): ');
    const purchaseDateRaw = await rl.question(
      `購入日 (YYYY-MM-DD, Enterで今日=${today()}): `,
    );
    const purchaseDate = purchaseDateRaw || today();
    const priceRaw = await rl.question('価格 (円, 任意): ');
    const price = priceRaw ? Number(priceRaw) : undefined;

    const repository = new JsonFilePurchaseLogRepository();
    const useCase = new RecordPurchaseUseCase(repository);
    const result = await useCase.execute({
      record: {
        productName,
        category: category || undefined,
        purchaseDate,
        price: price !== undefined && Number.isFinite(price) ? price : undefined,
      },
    });

    console.log(`\n記録しました: ${result.purchase.productName}（${purchaseDate}）`);
    console.log(`  ID: ${result.purchase.id.slice(0, 8)}`);
  } finally {
    rl.close();
  }
}

async function selectPurchase(
  rl: ReturnType<typeof createInterface>,
  repository: JsonFilePurchaseLogRepository,
  status: PurchaseStatus,
  promptLabel: string,
): Promise<PurchaseLog | null> {
  const listUseCase = new ListPurchasesUseCase(repository);
  const { purchases } = await listUseCase.execute({ status });

  if (purchases.length === 0) {
    console.log(`\n対象（${status}）がありません。`);
    return null;
  }

  console.log('');
  purchases.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.productName}（購入日: ${p.record.purchaseDate}）`);
  });
  const indexRaw = await rl.question(promptLabel);
  const index = Number(indexRaw) - 1;
  const target = purchases[index];
  if (!target) {
    console.log('番号が不正です。中止しました。');
    return null;
  }
  return target;
}

async function runStart(): Promise<void> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const repository = new JsonFilePurchaseLogRepository();
    console.log('\n=== 使い始めを記録 ===');
    const target = await selectPurchase(rl, repository, '未使用', '使い始める番号: ');
    if (!target) return;

    const dateRaw = await rl.question(`使い始め日 (YYYY-MM-DD, Enterで今日=${today()}): `);
    const date = dateRaw || today();

    const useCase = new StartUsingPurchaseUseCase(repository);
    await useCase.execute({ id: target.id, date });
    console.log(`\n使い始めを記録しました: ${target.productName}（${date}）`);
  } finally {
    rl.close();
  }
}

async function runFinish(): Promise<void> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const repository = new JsonFilePurchaseLogRepository();
    console.log('\n=== 使い切りを記録 ===');
    const target = await selectPurchase(rl, repository, '使用中', '使い切った番号: ');
    if (!target) return;

    const dateRaw = await rl.question(`使い切り日 (YYYY-MM-DD, Enterで今日=${today()}): `);
    const date = dateRaw || today();

    const useCase = new FinishPurchaseUseCase(repository);
    await useCase.execute({ id: target.id, date });
    console.log(`\n使い切りを記録しました: ${target.productName}（${date}）`);
  } finally {
    rl.close();
  }
}

async function runList(): Promise<void> {
  const repository = new JsonFilePurchaseLogRepository();
  const useCase = new ListPurchasesUseCase(repository);
  const { purchases } = await useCase.execute();

  console.log('');
  console.log(line('='));
  console.log('  Purchase Log');
  console.log(line('='));

  if (purchases.length === 0) {
    console.log('\n記録がありません。`pnpm purchase -- add` で追加できます。');
    return;
  }

  const statuses: PurchaseStatus[] = ['未使用', '使用中', '使い切り'];
  for (const status of statuses) {
    const group = purchases.filter((p) => p.status === status);
    if (group.length === 0) continue;
    console.log(`\n■ ${status}`);
    for (const p of group) {
      const priceSuffix = p.record.price !== undefined ? `  ${p.record.price}円` : '';
      console.log(`  [${p.id.slice(0, 8)}] ${p.productName}（購入: ${p.record.purchaseDate}）${priceSuffix}`);
    }
  }
  console.log('');
}

async function main(): Promise<void> {
  const args = argv.slice(2).filter((a) => a !== '--');
  const subcommand = args[0];

  switch (subcommand) {
    case 'add':
      await runAdd();
      break;
    case 'start':
      await runStart();
      break;
    case 'finish':
      await runFinish();
      break;
    case 'list':
      await runList();
      break;
    default:
      console.log('使い方: pnpm run purchase -- <add|start|finish|list>');
      process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error('エラーが発生しました:', error);
  process.exitCode = 1;
});
