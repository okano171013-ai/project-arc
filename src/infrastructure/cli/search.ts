#!/usr/bin/env node
/**
 * pnpm find <query> — Project ARC全体の横断検索（Version4）
 *
 * 元は `pnpm search` という名前で実装していたが、pnpm自体に
 * 組み込みの`search`コマンド（npmレジストリ検索）があり、名前が
 * 衝突してこちらのスクリプトが実行されない不具合が実機で見つかった
 * ため、`find`に変更した（docs/reports/Version4_Report.mdに追記）。
 *
 * ADR 0005に基づき、対象はMemoryとLife Inventoryのみ
 * （Reflection・Appearance Logは対象外）。「あれ何使ってた？」に
 * すぐ答えることを目的とし、検索速度より分かりやすさを優先する。
 */
import { argv } from 'node:process';
import { SearchEverythingUseCase } from '../../application/use-cases/search/SearchEverything.js';
import { JsonFileMemoryRepository } from '../../adapters/repositories/JsonFileMemoryRepository.js';
import { JsonFileInventoryRepository } from '../../adapters/repositories/JsonFileInventoryRepository.js';
import { formatReplacementInterval } from '../../domain/entities/InventoryItem.js';

function line(char = '─', length = 44): string {
  return char.repeat(length);
}

async function main(): Promise<void> {
  const query = argv
    .slice(2)
    .filter((a) => a !== '--')
    .join(' ')
    .trim();

  if (!query) {
    console.log('使い方: pnpm run find <キーワード>');
    console.log('例:     pnpm run find シェーバー');
    process.exitCode = 1;
    return;
  }

  const memoryRepository = new JsonFileMemoryRepository();
  const inventoryRepository = new JsonFileInventoryRepository();
  const useCase = new SearchEverythingUseCase(memoryRepository, inventoryRepository);

  const { results } = await useCase.execute({ query });

  console.log('');
  console.log(line('='));
  console.log(`  検索結果: 「${query}」`);
  console.log(line('='));

  if (results.length === 0) {
    console.log('\n見つかりませんでした。');
    console.log('（検索対象はMemoryとLife Inventoryのみです。日々の振り返りは対象外です）');
    return;
  }

  for (const result of results) {
    if (result.source === 'memory') {
      console.log(`\n[Memory / ${result.entry.category}] ${result.entry.title}`);
      console.log(`  → ${result.entry.content}`);
      if (result.entry.tags.length > 0) {
        console.log(`  タグ: #${result.entry.tags.join(' #')}`);
      }
    } else {
      const item = result.item;
      console.log(`\n[Inventory / ${item.category}] ${item.name}`);
      if (item.usage) console.log(`  用途: ${item.usage}`);
      if (item.condition) console.log(`  状態: ${item.condition}`);
      if (item.replacementIntervalMonths !== undefined) {
        console.log(`  交換目安: ${formatReplacementInterval(item.replacementIntervalMonths)}`);
      }
      if (item.photoPath) console.log(`  写真: ${item.photoPath}`);
    }
  }
  console.log('');
}

main().catch((error: unknown) => {
  console.error('エラーが発生しました:', error);
  process.exitCode = 1;
});
