import { beforeEach, describe, expect, it } from 'vitest';
import { rm, mkdir } from 'node:fs/promises';
import { runMobileSyncCommand } from './mobileSync.js';
import { JsonFileIngressRecordRepository } from '../../adapters/repositories/JsonFileIngressRecordRepository.js';
import { ReceiveIngressRecordUseCase } from '../../application/use-cases/mobile-ingress/ReceiveIngressRecord.js';

describe('mobile-sync CLI', () => {
  const DATA_DIR = 'data/_test-mobile-sync-cli';

  beforeEach(async () => {
    await rm(DATA_DIR, { recursive: true, force: true });
    await mkdir(DATA_DIR, { recursive: true });
  });

  it('sync canonicalizes a receipted Reflection and it is queryable via list', async () => {
    const repo = new JsonFileIngressRecordRepository(`${DATA_DIR}/ingress-records.json`);
    await new ReceiveIngressRecordUseCase(repo).execute({
      idempotencyKey: 'cli-test-1',
      payloadType: 'Reflection',
      payload: { date: '2026-07-19', record: { proudOf: 'CLIテスト' } },
      clientCreatedAt: '2026-07-19T21:00:00.000Z',
    });

    const syncResult = await runMobileSyncCommand('sync', undefined, undefined, DATA_DIR);
    expect(syncResult).toEqual({ canonicalized: 1, pending: 0, failed: 0 });

    const listResult = (await runMobileSyncCommand('list', 'Canonicalized', undefined, DATA_DIR)) as {
      records: Array<{ status: string }>;
    };
    expect(listResult.records).toHaveLength(1);
    expect(listResult.records[0]?.status).toBe('Canonicalized');
  });

  it('rejects an unknown command', async () => {
    await expect(runMobileSyncCommand('bogus', undefined, undefined, DATA_DIR)).rejects.toThrow('usage:');
  });

  it('resolve requires a valid action', async () => {
    await expect(runMobileSyncCommand('resolve', 'some-id', undefined, DATA_DIR)).rejects.toThrow('usage:');
  });

  it('pull requires CLOUD_INGRESS_URL/CLOUD_INGRESS_PULL_TOKEN to be configured (Version38)', async () => {
    // このサンドボックスに.envは無く、CLOUD_INGRESS_*も未設定のため、
    // クラウド未使用のOwnerに影響しないopt-in設計を検証する。
    delete process.env.CLOUD_INGRESS_URL;
    delete process.env.CLOUD_INGRESS_PULL_TOKEN;
    await expect(runMobileSyncCommand('pull', undefined, undefined, DATA_DIR)).rejects.toThrow(
      /CLOUD_INGRESS_URL and CLOUD_INGRESS_PULL_TOKEN/,
    );
  });

  it('cleans up: no leftover .tmp files after sync writes (atomic writes, ADR 0058)', async () => {
    const repo = new JsonFileIngressRecordRepository(`${DATA_DIR}/ingress-records.json`);
    await new ReceiveIngressRecordUseCase(repo).execute({
      idempotencyKey: 'cli-test-2',
      payloadType: 'Reflection',
      payload: { date: '2026-07-18', record: { proudOf: 'atomic書き込みの確認' } },
      clientCreatedAt: '2026-07-18T21:00:00.000Z',
    });
    await runMobileSyncCommand('sync', undefined, undefined, DATA_DIR);

    const { readdir } = await import('node:fs/promises');
    const entries = await readdir(DATA_DIR);
    expect(entries.every((name) => !name.includes('.tmp-'))).toBe(true);
  });
});
