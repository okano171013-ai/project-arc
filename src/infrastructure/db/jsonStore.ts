import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { existsSync } from 'node:fs';

/**
 * jsonStore
 *
 * ADR 0003に基づくローカルJSON永続化の共通ヘルパー。
 * ファイルが存在しない場合は空配列として扱う。
 *
 * 注意：同時書き込みへの耐性はない（単一ユーザー・単一プロセスの
 * CLI利用を前提とする、Principle 9: 段階的拡張）。将来的に複数
 * クライアントから同時アクセスする要件が出た場合はSupabase/SQLite
 * 等への移行を検討する（ADR 0003参照）。
 */
export async function readJsonArray<T>(filePath: string): Promise<T[]> {
  if (!existsSync(filePath)) {
    return [];
  }
  const raw = await readFile(filePath, 'utf-8');
  if (raw.trim().length === 0) {
    return [];
  }
  return JSON.parse(raw) as T[];
}

export async function writeJsonArray<T>(filePath: string, data: T[]): Promise<void> {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}
