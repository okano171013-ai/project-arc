/**
 * InventoryItem（持ち物）
 *
 * Life Inventory機能のドメインコア。Version2のMVPでは
 * 「追加・一覧・更新」のみだったが、Version3で購入情報・状態・
 * 交換目安・メンテナンス履歴を追加。Version4で写真の紐付けを追加した
 * （画像解析はしない、ファイルパスの保存のみ）。
 */

export type InventoryCategory =
  | '財布'
  | '傘'
  | 'シェーバー'
  | 'スキンケア'
  | '靴'
  | '服'
  | 'ガジェット'
  | 'その他';

export type ItemCondition = '新品' | '良好' | '普通' | '要注意' | '交換推奨';

/** メンテナンス履歴の1件。複数保存できる（Version3要件、Owner回答）。 */
export interface MaintenanceRecord {
  readonly date: string; // YYYY-MM-DD
  readonly content: string;
}

export interface InventoryItemRecord {
  readonly name: string;
  readonly category: InventoryCategory;
  readonly note?: string;
  readonly purchaseDate?: string; // YYYY-MM-DD
  readonly purchasePrice?: number; // 円
  readonly condition?: ItemCondition;
  /** 用途 */
  readonly usage?: string;
  /**
   * 交換目安。Owner回答により「期間」で管理する（日付ではなく月数）。
   * 表示時に「n年nヶ月ごと」等に変換する。
   */
  readonly replacementIntervalMonths?: number;
  /** ローカルに保存された写真ファイルの相対パス（Version4）。 */
  readonly photoPath?: string;
}

export class InventoryItem {
  private constructor(
    private readonly _id: string,
    private _name: string,
    private _category: InventoryCategory,
    private _note: string | undefined,
    private _purchaseDate: string | undefined,
    private _purchasePrice: number | undefined,
    private _condition: ItemCondition | undefined,
    private _usage: string | undefined,
    private _replacementIntervalMonths: number | undefined,
    private _photoPath: string | undefined,
    private _maintenanceHistory: MaintenanceRecord[],
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(params: {
    id: string;
    record: InventoryItemRecord;
    createdAt?: Date;
  }): InventoryItem {
    if (params.record.name.trim().length === 0) {
      throw new Error('name must not be empty');
    }
    const now = params.createdAt ?? new Date();
    return new InventoryItem(
      params.id,
      params.record.name,
      params.record.category,
      params.record.note,
      params.record.purchaseDate,
      params.record.purchasePrice,
      params.record.condition,
      params.record.usage,
      params.record.replacementIntervalMonths,
      params.record.photoPath,
      [],
      now,
      now,
    );
  }

  /**
   * 永続化データからの復元用。create()と異なり、updatedAtと
   * メンテナンス履歴を独立して指定できる（新規作成ではなく再構築のため）。
   */
  static restore(params: {
    id: string;
    record: InventoryItemRecord;
    maintenanceHistory: MaintenanceRecord[];
    createdAt: Date;
    updatedAt: Date;
  }): InventoryItem {
    return new InventoryItem(
      params.id,
      params.record.name,
      params.record.category,
      params.record.note,
      params.record.purchaseDate,
      params.record.purchasePrice,
      params.record.condition,
      params.record.usage,
      params.record.replacementIntervalMonths,
      params.record.photoPath,
      params.maintenanceHistory,
      params.createdAt,
      params.updatedAt,
    );
  }

  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get category(): InventoryCategory {
    return this._category;
  }

  get note(): string | undefined {
    return this._note;
  }

  get purchaseDate(): string | undefined {
    return this._purchaseDate;
  }

  get purchasePrice(): number | undefined {
    return this._purchasePrice;
  }

  get condition(): ItemCondition | undefined {
    return this._condition;
  }

  get usage(): string | undefined {
    return this._usage;
  }

  get replacementIntervalMonths(): number | undefined {
    return this._replacementIntervalMonths;
  }

  get photoPath(): string | undefined {
    return this._photoPath;
  }

  get maintenanceHistory(): readonly MaintenanceRecord[] {
    return this._maintenanceHistory;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  /** 基本情報を更新する。空文字の名前は許可しない。 */
  update(changes: {
    name?: string;
    category?: InventoryCategory;
    note?: string;
    purchaseDate?: string;
    purchasePrice?: number;
    condition?: ItemCondition;
    usage?: string;
    replacementIntervalMonths?: number;
    photoPath?: string;
  }): void {
    if (changes.name !== undefined) {
      if (changes.name.trim().length === 0) {
        throw new Error('name must not be empty');
      }
      this._name = changes.name;
    }
    if (changes.category !== undefined) this._category = changes.category;
    if (changes.note !== undefined) this._note = changes.note;
    if (changes.purchaseDate !== undefined) this._purchaseDate = changes.purchaseDate;
    if (changes.purchasePrice !== undefined) this._purchasePrice = changes.purchasePrice;
    if (changes.condition !== undefined) this._condition = changes.condition;
    if (changes.usage !== undefined) this._usage = changes.usage;
    if (changes.replacementIntervalMonths !== undefined) {
      this._replacementIntervalMonths = changes.replacementIntervalMonths;
    }
    if (changes.photoPath !== undefined) this._photoPath = changes.photoPath;
    this._updatedAt = new Date();
  }

  /** メンテナンス履歴を1件追記する（上書きではなく追加、Owner回答）。 */
  addMaintenanceRecord(record: MaintenanceRecord): void {
    if (record.content.trim().length === 0) {
      throw new Error('maintenance record content must not be empty');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
      throw new Error(`Invalid date format: ${record.date}. Expected YYYY-MM-DD.`);
    }
    this._maintenanceHistory = [...this._maintenanceHistory, record];
    this._updatedAt = new Date();
  }

  /** 検索対象文字列（name/category/note/usage）に部分一致するか。 */
  matches(query: string): boolean {
    const q = query.toLowerCase();
    return (
      this._name.toLowerCase().includes(q) ||
      this._category.toLowerCase().includes(q) ||
      (this._note?.toLowerCase().includes(q) ?? false) ||
      (this._usage?.toLowerCase().includes(q) ?? false)
    );
  }
}

/** 交換目安（月数）を「n年nヶ月ごと」の表示形式に変換する。 */
export function formatReplacementInterval(months: number): string {
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years}年`);
  if (remainingMonths > 0) parts.push(`${remainingMonths}ヶ月`);
  return (parts.length > 0 ? parts.join('') : '0ヶ月') + 'ごと';
}
