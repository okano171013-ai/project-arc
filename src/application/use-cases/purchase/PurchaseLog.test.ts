import { describe, it, expect, beforeEach } from 'vitest';
import { RecordPurchaseUseCase } from './RecordPurchase.js';
import { StartUsingPurchaseUseCase } from './StartUsingPurchase.js';
import { FinishPurchaseUseCase } from './FinishPurchase.js';
import { ListPurchasesUseCase } from './ListPurchases.js';
import type { PurchaseLogRepository } from '../../ports/PurchaseLogRepository.js';
import type { PurchaseLog } from '../../../domain/entities/PurchaseLog.js';

class FakePurchaseLogRepository implements PurchaseLogRepository {
  private store = new Map<string, PurchaseLog>();

  async save(log: PurchaseLog): Promise<void> {
    this.store.set(log.id, log);
  }

  async findAll(): Promise<PurchaseLog[]> {
    return [...this.store.values()];
  }

  async findById(id: string): Promise<PurchaseLog | null> {
    return this.store.get(id) ?? null;
  }
}

describe('PurchaseLog use cases', () => {
  let repository: FakePurchaseLogRepository;

  beforeEach(() => {
    repository = new FakePurchaseLogRepository();
  });

  it('records a new purchase as 未使用', async () => {
    const useCase = new RecordPurchaseUseCase(repository);
    const result = await useCase.execute({
      record: { productName: 'メラノCC', purchaseDate: '2026-07-01' },
    });

    expect(result.purchase.productName).toBe('メラノCC');
    expect(result.purchase.status).toBe('未使用');
  });

  it('rejects an empty productName', async () => {
    const useCase = new RecordPurchaseUseCase(repository);
    await expect(
      useCase.execute({ record: { productName: '  ', purchaseDate: '2026-07-01' } }),
    ).rejects.toThrow(/productName must not be empty/);
  });

  it('transitions 未使用 -> 使用中 -> 使い切り', async () => {
    const recordUseCase = new RecordPurchaseUseCase(repository);
    const { purchase } = await recordUseCase.execute({
      record: { productName: '化粧水', purchaseDate: '2026-07-01' },
    });

    const startUseCase = new StartUsingPurchaseUseCase(repository);
    const started = await startUseCase.execute({ id: purchase.id, date: '2026-07-03' });
    expect(started.purchase.status).toBe('使用中');

    const finishUseCase = new FinishPurchaseUseCase(repository);
    const finished = await finishUseCase.execute({ id: purchase.id, date: '2026-08-01' });
    expect(finished.purchase.status).toBe('使い切り');
  });

  it('rejects finishing a purchase that has not been started', async () => {
    const recordUseCase = new RecordPurchaseUseCase(repository);
    const { purchase } = await recordUseCase.execute({
      record: { productName: '洗顔料', purchaseDate: '2026-07-01' },
    });

    const finishUseCase = new FinishPurchaseUseCase(repository);
    await expect(
      finishUseCase.execute({ id: purchase.id, date: '2026-08-01' }),
    ).rejects.toThrow(/has not been started/);
  });

  it('rejects startedUsingDate before purchaseDate', async () => {
    const useCase = new RecordPurchaseUseCase(repository);
    await expect(
      useCase.execute({
        record: {
          productName: '乳液',
          purchaseDate: '2026-07-10',
          startedUsingDate: '2026-07-01',
        },
      }),
    ).rejects.toThrow(/startedUsingDate must not be before purchaseDate/);
  });

  it('filters by status', async () => {
    const recordUseCase = new RecordPurchaseUseCase(repository);
    await recordUseCase.execute({
      record: { productName: '未使用品', purchaseDate: '2026-07-01' },
    });
    const { purchase } = await recordUseCase.execute({
      record: { productName: '使用中品', purchaseDate: '2026-07-01' },
    });
    const startUseCase = new StartUsingPurchaseUseCase(repository);
    await startUseCase.execute({ id: purchase.id, date: '2026-07-02' });

    const listUseCase = new ListPurchasesUseCase(repository);
    const result = await listUseCase.execute({ status: '使用中' });
    expect(result.purchases).toHaveLength(1);
    expect(result.purchases[0]?.productName).toBe('使用中品');
  });
});
