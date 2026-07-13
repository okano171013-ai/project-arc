import { describe, it, expect, beforeEach } from 'vitest';
import { AddInventoryItemUseCase } from './AddInventoryItem.js';
import { ListInventoryUseCase } from './ListInventory.js';
import { UpdateInventoryItemUseCase } from './UpdateInventoryItem.js';
import { AddMaintenanceRecordUseCase } from './AddMaintenanceRecord.js';
import { GetInventoryItemUseCase } from './GetInventoryItem.js';
import type { InventoryRepository } from '../../ports/InventoryRepository.js';
import type { InventoryItem } from '../../../domain/entities/InventoryItem.js';
import { formatReplacementInterval } from '../../../domain/entities/InventoryItem.js';

class FakeInventoryRepository implements InventoryRepository {
  private store = new Map<string, InventoryItem>();

  async save(item: InventoryItem): Promise<void> {
    this.store.set(item.id, item);
  }

  async findAll(): Promise<InventoryItem[]> {
    return [...this.store.values()];
  }

  async findById(id: string): Promise<InventoryItem | null> {
    return this.store.get(id) ?? null;
  }
}

describe('Inventory use cases', () => {
  let repository: FakeInventoryRepository;

  beforeEach(() => {
    repository = new FakeInventoryRepository();
  });

  it('adds a new inventory item', async () => {
    const useCase = new AddInventoryItemUseCase(repository);
    const result = await useCase.execute({
      record: { name: '長財布', category: '財布' },
    });

    expect(result.item.name).toBe('長財布');
    expect(result.item.category).toBe('財布');

    const all = await repository.findAll();
    expect(all).toHaveLength(1);
  });

  it('rejects an empty name', async () => {
    const useCase = new AddInventoryItemUseCase(repository);
    await expect(
      useCase.execute({ record: { name: '  ', category: 'その他' } }),
    ).rejects.toThrow(/name must not be empty/);
  });

  it('lists items filtered by category', async () => {
    const addUseCase = new AddInventoryItemUseCase(repository);
    await addUseCase.execute({ record: { name: '折り畳み傘', category: '傘' } });
    await addUseCase.execute({ record: { name: '長財布', category: '財布' } });

    const listUseCase = new ListInventoryUseCase(repository);
    const result = await listUseCase.execute({ category: '傘' });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.name).toBe('折り畳み傘');
  });

  it('updates an existing item', async () => {
    const addUseCase = new AddInventoryItemUseCase(repository);
    const { item } = await addUseCase.execute({
      record: { name: '腕時計', category: 'ガジェット' },
    });

    const updateUseCase = new UpdateInventoryItemUseCase(repository);
    const result = await updateUseCase.execute({
      id: item.id,
      changes: { note: '電池交換済み' },
    });

    expect(result.item.note).toBe('電池交換済み');
    expect(result.item.name).toBe('腕時計'); // 変更していないフィールドは維持される
  });

  it('throws when updating a non-existent item', async () => {
    const updateUseCase = new UpdateInventoryItemUseCase(repository);
    await expect(
      updateUseCase.execute({ id: 'does-not-exist', changes: { name: 'x' } }),
    ).rejects.toThrow(/not found/);
  });

  it('stores Version3 purchase/condition/usage fields', async () => {
    const addUseCase = new AddInventoryItemUseCase(repository);
    const result = await addUseCase.execute({
      record: {
        name: '革靴',
        category: '靴',
        purchaseDate: '2025-04-01',
        purchasePrice: 28000,
        condition: '良好',
        usage: '面接・冠婚葬祭',
        replacementIntervalMonths: 24,
      },
    });

    expect(result.item.purchasePrice).toBe(28000);
    expect(result.item.condition).toBe('良好');
    expect(result.item.replacementIntervalMonths).toBe(24);
  });

  it('appends multiple maintenance records without overwriting previous ones', async () => {
    const addUseCase = new AddInventoryItemUseCase(repository);
    const { item } = await addUseCase.execute({
      record: { name: '腕時計', category: 'ガジェット' },
    });

    const maintainUseCase = new AddMaintenanceRecordUseCase(repository);
    await maintainUseCase.execute({
      id: item.id,
      record: { date: '2026-01-10', content: '電池交換' },
    });
    const result = await maintainUseCase.execute({
      id: item.id,
      record: { date: '2026-06-15', content: 'ベルト調整' },
    });

    expect(result.item.maintenanceHistory).toHaveLength(2);
    expect(result.item.maintenanceHistory[0]?.content).toBe('電池交換');
    expect(result.item.maintenanceHistory[1]?.content).toBe('ベルト調整');
  });

  it('rejects an empty maintenance record content', async () => {
    const addUseCase = new AddInventoryItemUseCase(repository);
    const { item } = await addUseCase.execute({
      record: { name: '腕時計', category: 'ガジェット' },
    });

    const maintainUseCase = new AddMaintenanceRecordUseCase(repository);
    await expect(
      maintainUseCase.execute({ id: item.id, record: { date: '2026-01-10', content: '  ' } }),
    ).rejects.toThrow(/must not be empty/);
  });

  it('rejects a maintenance record with a non-zero-padded date', async () => {
    const addUseCase = new AddInventoryItemUseCase(repository);
    const { item } = await addUseCase.execute({
      record: { name: '腕時計', category: 'ガジェット' },
    });

    const maintainUseCase = new AddMaintenanceRecordUseCase(repository);
    await expect(
      maintainUseCase.execute({ id: item.id, record: { date: '2026-1-1', content: '修理' } }),
    ).rejects.toThrow(/Invalid date format/);
  });

  it('retrieves a single item by id via GetInventoryItemUseCase', async () => {
    const addUseCase = new AddInventoryItemUseCase(repository);
    const { item } = await addUseCase.execute({
      record: { name: '長財布', category: '財布' },
    });

    const getUseCase = new GetInventoryItemUseCase(repository);
    const result = await getUseCase.execute({ id: item.id });

    expect(result.item?.name).toBe('長財布');
  });

  it('returns null from GetInventoryItemUseCase for an unknown id', async () => {
    const getUseCase = new GetInventoryItemUseCase(repository);
    const result = await getUseCase.execute({ id: 'unknown' });
    expect(result.item).toBeNull();
  });

  it('stores and updates photoPath (Version4)', async () => {
    const addUseCase = new AddInventoryItemUseCase(repository);
    const { item } = await addUseCase.execute({
      record: { name: '長財布', category: '財布' },
    });
    expect(item.photoPath).toBeUndefined();

    const updateUseCase = new UpdateInventoryItemUseCase(repository);
    const result = await updateUseCase.execute({
      id: item.id,
      changes: { photoPath: 'data/inventory-photos/abc-wallet.jpg' },
    });

    expect(result.item.photoPath).toBe('data/inventory-photos/abc-wallet.jpg');
  });

  it('matches searches against name, category, note, and usage', async () => {
    const addUseCase = new AddInventoryItemUseCase(repository);
    const { item } = await addUseCase.execute({
      record: { name: 'PHILIPS 5000シリーズ', category: 'シェーバー', usage: '毎朝の髭剃り' },
    });

    expect(item.matches('philips')).toBe(true);
    expect(item.matches('シェーバー')).toBe(true);
    expect(item.matches('髭剃り')).toBe(true);
    expect(item.matches('存在しない')).toBe(false);
  });
});

describe('formatReplacementInterval', () => {
  it('formats months only', () => {
    expect(formatReplacementInterval(6)).toBe('6ヶ月ごと');
  });

  it('formats years only', () => {
    expect(formatReplacementInterval(24)).toBe('2年ごと');
  });

  it('formats years and months combined', () => {
    expect(formatReplacementInterval(18)).toBe('1年6ヶ月ごと');
  });
});
