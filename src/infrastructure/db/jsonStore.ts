import { readFile, writeFile, rename, unlink, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

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
 *
 * `writeJsonArray`はADR 0058に基づきatomicに書き込む——同一
 * ディレクトリに一時ファイルを書いてから`rename`する。POSIX上
 * `rename`は同一ファイルシステム内でatomicであることが保証されて
 * おり、書き込み中のプロセス中断（クラッシュ・kill・電源断）が
 * 対象ファイルを不完全な内容のまま残すことを防ぐ。
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
  await atomicWriteFile(filePath, JSON.stringify(data, null, 2));
}

/**
 * 任意の文字列コンテンツをatomicに書き込む汎用ヘルパー（ADR 0058）。
 * `writeJsonArray`と`BackupService`（バックアップ・復元）の両方が
 * これを使うことで、atomicityの保証を1箇所に集約する。
 */
export async function atomicWriteFile(filePath: string, content: string): Promise<void> {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  const tmpPath = `${filePath}.tmp-${randomUUID()}`;
  await writeFile(tmpPath, content, 'utf-8');
  try {
    await rename(tmpPath, filePath);
  } catch (error) {
    // renameが失敗した場合（例：クロスデバイス）、一時ファイルを
    // 残さない——次回書き込み時に無関係な.tmp-*ファイルが
    // バックアップ対象として拾われることを防ぐ。
    await unlink(tmpPath).catch(() => undefined);
    throw error;
  }
}
