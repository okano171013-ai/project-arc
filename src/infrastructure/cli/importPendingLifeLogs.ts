#!/usr/bin/env node
/**
 * pnpm import-pending-logs -- <path-to-jsonl> [--dry-run]（Version37、ADR 0067）
 *
 * Owner指示書（2026-07-20）にある「退避中の16件」JSONLファイルを
 * 検証・取り込みする。**実データはこのリポジトリに含まれない**——
 * Ownerがローカルに保管しているファイルのパスを引数として渡す。
 * 取り込んだ内容はMobile Ingressの`IngressRecord`（Accepted状態）と
 * して保存されるだけで、既存のReflection等Repositoryへは書き込まない
 * ——`pnpm mobile-sync`を後続で実行して初めてCanonicalizeされる
 * （Transport/Canonical分離、ADR 0059・0065を踏襲）。
 *
 * `--dry-run`を付けると、JSON構文・トップレベルschema・type対応
 * 確認のみ行い、実際のReceiveは行わない（書き込みなしで内容を
 * 事前確認できる）。
 */
import { readFile } from 'node:fs/promises';
import { JsonFileIngressRecordRepository } from '../../adapters/repositories/JsonFileIngressRecordRepository.js';
import { ReceiveIngressRecordUseCase } from '../../application/use-cases/mobile-ingress/ReceiveIngressRecord.js';
import { ImportPendingLifeLogsUseCase } from '../../application/use-cases/mobile-ingress/ImportPendingLifeLogs.js';
import { isMainModule } from '../runner/runnerLock.js';

export async function runImportPendingLifeLogsCommand(
  filePath: string | undefined,
  dryRun: boolean,
  dataDir = 'data',
): Promise<unknown> {
  if (!filePath) {
    throw new Error('usage: pnpm import-pending-logs -- <path-to-jsonl> [--dry-run]');
  }
  const jsonl = await readFile(filePath, 'utf-8');
  const repository = new JsonFileIngressRecordRepository(`${dataDir}/ingress-records.json`);
  const useCase = new ImportPendingLifeLogsUseCase(new ReceiveIngressRecordUseCase(repository));
  return useCase.execute({ jsonl, dryRun });
}

if (isMainModule(import.meta.url)) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const filePath = args.find((a) => !a.startsWith('--'));

  runImportPendingLifeLogsCommand(filePath, dryRun)
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
