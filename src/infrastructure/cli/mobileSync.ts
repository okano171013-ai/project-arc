#!/usr/bin/env node
/**
 * pnpm mobile-sync [sync|list|resolve|retry]（Version35、ADR 0064・0065）
 *
 * Mobile Ingress（`mobileIngress.ts`、127.0.0.1限定）が受信した
 * `Accepted`状態のIngressRecordを、PC起動時にlocalへCanonicalizeする
 * 「Sync Worker」のローカルMVP実装。ADR 0059の設計図
 * 「Sync Worker（PC起動時）」に対応する。
 */
import { buildUseCases } from '../http/server.js';
import { JsonFileReflectionRepository } from '../../adapters/repositories/JsonFileReflectionRepository.js';
import { JsonFileIngressRecordRepository } from '../../adapters/repositories/JsonFileIngressRecordRepository.js';
import { SyncIngressRecordsUseCase } from '../../application/use-cases/mobile-ingress/SyncIngressRecords.js';
import { ResolveIngressRecordUseCase } from '../../application/use-cases/mobile-ingress/ResolveIngressRecord.js';
import { RetryFailedIngressRecordUseCase } from '../../application/use-cases/mobile-ingress/RetryFailedIngressRecord.js';
import { ListIngressRecordsUseCase } from '../../application/use-cases/mobile-ingress/ListIngressRecords.js';
import type { IngressRecordStatus } from '../../domain/entities/IngressRecord.js';
import { serializeIngressRecord } from '../../application/serializers.js';
import { isMainModule } from '../runner/runnerLock.js';

function buildCommands(dataDir = 'data') {
  const reflectionRepository = new JsonFileReflectionRepository(`${dataDir}/reflections.json`);
  const ingressRecordRepository = new JsonFileIngressRecordRepository(`${dataDir}/ingress-records.json`);
  const { importLogs } = buildUseCases({ dataDir });

  return {
    sync: new SyncIngressRecordsUseCase(ingressRecordRepository, reflectionRepository, importLogs),
    resolve: new ResolveIngressRecordUseCase(ingressRecordRepository, reflectionRepository),
    retry: new RetryFailedIngressRecordUseCase(ingressRecordRepository),
    list: new ListIngressRecordsUseCase(ingressRecordRepository),
  };
}

export async function runMobileSyncCommand(
  command: string | undefined,
  arg1: string | undefined,
  arg2: string | undefined,
  dataDir = 'data',
): Promise<unknown> {
  const commands = buildCommands(dataDir);

  switch (command) {
    case 'sync':
    case undefined:
      return commands.sync.execute();
    case 'list': {
      const result = await commands.list.execute({ status: arg1 as IngressRecordStatus | undefined });
      return { records: result.records.map(serializeIngressRecord) };
    }
    case 'resolve': {
      if (!arg1 || (arg2 !== 'accept' && arg2 !== 'discard')) {
        throw new Error('usage: pnpm mobile-sync resolve <id> accept|discard');
      }
      const result = await commands.resolve.execute({ id: arg1, action: arg2 });
      return { id: result.record.id, status: result.record.status };
    }
    case 'retry': {
      if (!arg1) throw new Error('usage: pnpm mobile-sync retry <id>');
      const result = await commands.retry.execute({ id: arg1 });
      return { id: result.record.id, status: result.record.status };
    }
    default:
      throw new Error('usage: pnpm mobile-sync [sync|list [status]|resolve <id> accept|discard|retry <id>]');
  }
}

if (isMainModule(import.meta.url)) {
  runMobileSyncCommand(process.argv[2], process.argv[3], process.argv[4])
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
