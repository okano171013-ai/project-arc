import { describe, it, expect } from 'vitest';
import { ImportPendingLifeLogsUseCase } from './ImportPendingLifeLogs.js';
import { ReceiveIngressRecordUseCase } from './ReceiveIngressRecord.js';
import type { IngressRecord } from '../../../domain/entities/IngressRecord.js';
import type { IngressRecordRepository } from '../../ports/IngressRecordRepository.js';

class InMemoryIngressRecordRepository implements IngressRecordRepository {
  store = new Map<string, IngressRecord>();
  async save(record: IngressRecord): Promise<void> {
    this.store.set(record.id, record);
  }
  async findById(id: string): Promise<IngressRecord | null> {
    return this.store.get(id) ?? null;
  }
  async findByIdempotencyKey(idempotencyKey: string): Promise<IngressRecord | null> {
    return [...this.store.values()].find((r) => r.data.idempotencyKey === idempotencyKey) ?? null;
  }
  async findAll(): Promise<IngressRecord[]> {
    return [...this.store.values()];
  }
  async findByStatus(status: IngressRecord['status']): Promise<IngressRecord[]> {
    return [...this.store.values()].filter((r) => r.status === status);
  }
}

/**
 * すべてのfixtureはプレースホルダーの合成データ——Ownerの実際の
 * 「退避中の16件」の内容は本セッションから見えないため、実データは
 * 一切含めない（Constitution・Principle 5）。
 */
function buildUseCase() {
  const repository = new InMemoryIngressRecordRepository();
  const receive = new ReceiveIngressRecordUseCase(repository);
  return { useCase: new ImportPendingLifeLogsUseCase(receive), repository };
}

describe('ImportPendingLifeLogsUseCase (Version37, ADR 0067)', () => {
  it('accepts a line with a currently-supported type (dry-run: false)', async () => {
    const { useCase, repository } = buildUseCase();
    const jsonl = JSON.stringify({
      sequence: 1,
      type: 'FinanceLog',
      occurredAt: null,
      content: { occurredAt: '2026-06-01T00:00:00.000Z', type: 'Expense', amount: 1200 },
      provenance: 'chat_summary_queue',
    });

    const result = await useCase.execute({ jsonl, dryRun: false });

    expect(result.summary).toEqual({ total: 1, accepted: 1, duplicate: 0, unsupportedType: 0, invalid: 0 });
    expect(result.results[0]).toMatchObject({ sequence: 1, type: 'FinanceLog', status: 'accepted' });
    expect((await repository.findAll())).toHaveLength(1);
  });

  it('reports unsupported types explicitly instead of guessing a mapping', async () => {
    const { useCase, repository } = buildUseCase();
    const jsonl = JSON.stringify({
      sequence: 2,
      type: 'RewardSystem',
      occurredAt: null,
      content: { note: 'プレースホルダー' },
      provenance: 'chat_summary_queue',
    });

    const result = await useCase.execute({ jsonl, dryRun: false });

    expect(result.summary.unsupportedType).toBe(1);
    expect(result.results[0]).toMatchObject({ sequence: 2, type: 'RewardSystem', status: 'unsupported_type' });
    expect((await repository.findAll())).toHaveLength(0);
  });

  it('reports schema_invalid for a line missing required fields', async () => {
    const { useCase } = buildUseCase();
    const jsonl = JSON.stringify({ sequence: 3, type: 'Reflection' }); // occurredAt/content/provenance missing

    const result = await useCase.execute({ jsonl, dryRun: false });

    expect(result.summary.invalid).toBe(1);
    expect(result.results[0]).toMatchObject({ sequence: 3, status: 'schema_invalid' });
  });

  it('reports parse_error for a malformed JSON line without aborting the rest of the file', async () => {
    const { useCase } = buildUseCase();
    const jsonl = [
      'not valid json{{{',
      JSON.stringify({
        sequence: 4,
        type: 'MealLog',
        occurredAt: null,
        content: { occurredAt: '2026-06-01T08:00:00.000Z', items: ['プレースホルダー'] },
        provenance: 'chat_summary_queue',
      }),
    ].join('\n');

    const result = await useCase.execute({ jsonl, dryRun: false });

    expect(result.summary.total).toBe(2);
    expect(result.results[0]?.status).toBe('parse_error');
    expect(result.results[1]).toMatchObject({ sequence: 4, status: 'accepted' });
  });

  it('dry-run validates supported lines without writing anything', async () => {
    const { useCase, repository } = buildUseCase();
    const jsonl = JSON.stringify({
      sequence: 5,
      type: 'WeightLog',
      occurredAt: null,
      content: { measuredAt: '2026-06-01T07:00:00.000Z', weightKg: 60 },
      provenance: 'chat_summary_queue',
    });

    const result = await useCase.execute({ jsonl, dryRun: true });

    expect(result.results[0]).toMatchObject({ sequence: 5, type: 'WeightLog', status: 'validated' });
    expect((await repository.findAll())).toHaveLength(0);
  });

  it('is idempotent by sequence: re-importing the same line does not duplicate', async () => {
    const { useCase, repository } = buildUseCase();
    const jsonl = JSON.stringify({
      sequence: 6,
      type: 'Reflection',
      occurredAt: null,
      content: { date: '2026-06-02', record: { proudOf: 'プレースホルダー' } },
      provenance: 'chat_summary_queue',
    });

    const first = await useCase.execute({ jsonl, dryRun: false });
    const second = await useCase.execute({ jsonl, dryRun: false });

    expect(first.results[0]?.status).toBe('accepted');
    expect(second.results[0]).toMatchObject({ status: 'duplicate' });
    expect((await repository.findAll())).toHaveLength(1);
  });

  it('processes multiple lines independently and reports a mixed summary', async () => {
    const { useCase } = buildUseCase();
    const jsonl = [
      JSON.stringify({
        sequence: 7,
        type: 'MealLog',
        occurredAt: null,
        content: { occurredAt: '2026-06-01T08:00:00.000Z', items: ['プレースホルダー'] },
        provenance: 'chat_summary_queue',
      }),
      JSON.stringify({ sequence: 8, type: 'Wishlist', occurredAt: null, content: {}, provenance: 'chat_summary_queue' }),
      'broken',
    ].join('\n');

    const result = await useCase.execute({ jsonl, dryRun: false });

    expect(result.summary).toEqual({ total: 3, accepted: 1, duplicate: 0, unsupportedType: 1, invalid: 1 });
  });
});
