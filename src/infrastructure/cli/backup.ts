#!/usr/bin/env node
/**
 * pnpm backup [create|list|restore <id>]（Version31、ADR 0058）
 *
 * data/*.jsonの汎用バックアップ・復元CLI。個別Entityの型を知らない
 * ファイルレベルの操作のため、新しいRepositoryが増えても変更不要。
 */
import { isMainModule } from '../runner/runnerLock.js';
import { BackupService } from '../backup/BackupService.js';

export async function runBackupCommand(command: string | undefined, id: string | undefined): Promise<unknown> {
  const service = new BackupService();

  switch (command) {
    case 'create':
      return service.create();
    case 'list':
      return service.list();
    case 'restore':
      if (!id) {
        throw new Error('usage: pnpm backup restore <generation-id>');
      }
      return service.restore(id);
    default:
      throw new Error('usage: pnpm backup [create|list|restore <generation-id>]');
  }
}

if (isMainModule(import.meta.url)) {
  runBackupCommand(process.argv[2], process.argv[3])
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
