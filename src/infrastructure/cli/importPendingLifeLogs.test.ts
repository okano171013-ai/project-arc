import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { runImportPendingLifeLogsCommand } from './importPendingLifeLogs.js';

/** すべてのfixtureはプレースホルダーの合成データ（実データはこのリポジトリに含まれない）。 */
describe('import-pending-logs CLI (Version37)', () => {
  const DATA_DIR = 'data/_test-import-pending-logs-cli';
  const FIXTURE_PATH = 'data/_test-import-pending-logs-cli/fixture.jsonl';

  beforeEach(async () => {
    await rm(DATA_DIR, { recursive: true, force: true });
    await mkdir(DATA_DIR, { recursive: true });
  });

  afterAll(async () => {
    await rm(DATA_DIR, { recursive: true, force: true });
  });

  it('rejects when no file path is given', async () => {
    await expect(runImportPendingLifeLogsCommand(undefined, false, DATA_DIR)).rejects.toThrow('usage:');
  });

  it('reads a JSONL file and reports a mixed summary', async () => {
    const lines = [
      JSON.stringify({
        sequence: 1,
        type: 'FinanceLog',
        occurredAt: null,
        content: { occurredAt: '2026-06-01T00:00:00.000Z', type: 'Expense', amount: 500 },
        provenance: 'chat_summary_queue',
      }),
      JSON.stringify({ sequence: 2, type: 'BudgetRule', occurredAt: null, content: {}, provenance: 'chat_summary_queue' }),
    ].join('\n');
    await writeFile(FIXTURE_PATH, lines, 'utf-8');

    const result = (await runImportPendingLifeLogsCommand(FIXTURE_PATH, false, DATA_DIR)) as {
      summary: { total: number; accepted: number; unsupportedType: number };
    };

    expect(result.summary).toMatchObject({ total: 2, accepted: 1, unsupportedType: 1 });
  });

  it('--dry-run does not write any IngressRecord', async () => {
    const line = JSON.stringify({
      sequence: 3,
      type: 'Reflection',
      occurredAt: null,
      content: { date: '2026-06-03', record: { proudOf: 'プレースホルダー' } },
      provenance: 'chat_summary_queue',
    });
    await writeFile(FIXTURE_PATH, line, 'utf-8');

    const result = (await runImportPendingLifeLogsCommand(FIXTURE_PATH, true, DATA_DIR)) as {
      results: Array<{ status: string }>;
    };
    expect(result.results[0]?.status).toBe('validated');

    const { readFile } = await import('node:fs/promises');
    await expect(readFile(`${DATA_DIR}/ingress-records.json`, 'utf-8')).rejects.toThrow();
  });
});
