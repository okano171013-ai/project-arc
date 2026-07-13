/**
 * PurchaseLog（消耗品の購入〜使い切り管理）
 *
 * Version5で新設。Life Inventory（財布・シェーバー等の耐久消費財、
 * 状態・メンテナンス履歴管理）とは別物として、消耗品（化粧水・
 * 洗顔料・カミソリ替刃等）の「購入日→使い始め→使い切り」という
 * ライフサイクルを管理する（ADR 0006）。同じ商品を何度も買い直す
 * ことを前提に、購入のたびに新しいレコードを作る設計とする。
 */

export type PurchaseStatus = '未使用' | '使用中' | '使い切り';

export interface PurchaseLogRecord {
  readonly productName: string;
  readonly category?: string;
  readonly purchaseDate: string; // YYYY-MM-DD
  readonly price?: number; // 円
  readonly startedUsingDate?: string; // YYYY-MM-DD
  readonly finishedDate?: string; // YYYY-MM-DD
  readonly note?: string;
}

function assertDateFormat(label: string, value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid date format for ${label}: ${value}. Expected YYYY-MM-DD.`);
  }
}

export class PurchaseLog {
  private constructor(
    private readonly _id: string,
    private _productName: string,
    private _category: string | undefined,
    private _purchaseDate: string,
    private _price: number | undefined,
    private _startedUsingDate: string | undefined,
    private _finishedDate: string | undefined,
    private _note: string | undefined,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(params: {
    id: string;
    record: PurchaseLogRecord;
    createdAt?: Date;
  }): PurchaseLog {
    if (params.record.productName.trim().length === 0) {
      throw new Error('productName must not be empty');
    }
    assertDateFormat('purchaseDate', params.record.purchaseDate);
    if (params.record.startedUsingDate) {
      assertDateFormat('startedUsingDate', params.record.startedUsingDate);
      if (params.record.startedUsingDate < params.record.purchaseDate) {
        throw new Error('startedUsingDate must not be before purchaseDate');
      }
    }
    if (params.record.finishedDate) {
      assertDateFormat('finishedDate', params.record.finishedDate);
      if (!params.record.startedUsingDate) {
        throw new Error('finishedDate requires startedUsingDate to be set');
      }
      if (params.record.finishedDate < params.record.startedUsingDate) {
        throw new Error('finishedDate must not be before startedUsingDate');
      }
    }
    const now = params.createdAt ?? new Date();
    return new PurchaseLog(
      params.id,
      params.record.productName,
      params.record.category,
      params.record.purchaseDate,
      params.record.price,
      params.record.startedUsingDate,
      params.record.finishedDate,
      params.record.note,
      now,
      now,
    );
  }

  static restore(params: {
    id: string;
    record: PurchaseLogRecord;
    createdAt: Date;
    updatedAt: Date;
  }): PurchaseLog {
    return new PurchaseLog(
      params.id,
      params.record.productName,
      params.record.category,
      params.record.purchaseDate,
      params.record.price,
      params.record.startedUsingDate,
      params.record.finishedDate,
      params.record.note,
      params.createdAt,
      params.updatedAt,
    );
  }

  get id(): string {
    return this._id;
  }

  get record(): PurchaseLogRecord {
    return {
      productName: this._productName,
      category: this._category,
      purchaseDate: this._purchaseDate,
      price: this._price,
      startedUsingDate: this._startedUsingDate,
      finishedDate: this._finishedDate,
      note: this._note,
    };
  }

  get productName(): string {
    return this._productName;
  }

  get status(): PurchaseStatus {
    if (this._finishedDate) return '使い切り';
    if (this._startedUsingDate) return '使用中';
    return '未使用';
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  /** 使い始めを記録する。すでに使い始め済みの場合はエラー。 */
  startUsing(date: string): void {
    assertDateFormat('startedUsingDate', date);
    if (this._startedUsingDate) {
      throw new Error('this purchase has already been started');
    }
    if (date < this._purchaseDate) {
      throw new Error('startedUsingDate must not be before purchaseDate');
    }
    this._startedUsingDate = date;
    this._updatedAt = new Date();
  }

  /** 使い切りを記録する。まだ使い始めていない場合はエラー。 */
  finish(date: string): void {
    assertDateFormat('finishedDate', date);
    if (!this._startedUsingDate) {
      throw new Error('this purchase has not been started yet');
    }
    if (this._finishedDate) {
      throw new Error('this purchase has already been finished');
    }
    if (date < this._startedUsingDate) {
      throw new Error('finishedDate must not be before startedUsingDate');
    }
    this._finishedDate = date;
    this._updatedAt = new Date();
  }
}
