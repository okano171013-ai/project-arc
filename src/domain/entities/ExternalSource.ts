/**
 * ExternalSource（External Brainの出典）
 *
 * Version10で新設。外部情報の出典（Webページ・書籍・論文・動画等）を
 * 表すEntity。ExternalKnowledge（実際に保存する知識）とは分離する
 * （ADR 0013）。1つのSourceから複数のKnowledgeが参照されうる。
 *
 * Systemは出典の内容が正しいと保証しない（ADR 0012、Version10指示書
 * 2.1）。ここに保持されるのは「この出典が存在する」という記録のみ。
 */

export type ExternalSourceType =
  | 'web'
  | 'book'
  | 'paper'
  | 'video'
  | 'social'
  | 'news'
  | 'lecture'
  | 'conversation'
  | 'document'
  | 'email'
  | 'observation'
  | 'other';

const SOURCE_TYPES: ExternalSourceType[] = [
  'web',
  'book',
  'paper',
  'video',
  'social',
  'news',
  'lecture',
  'conversation',
  'document',
  'email',
  'observation',
  'other',
];

export interface ExternalSourceRecord {
  readonly sourceType: ExternalSourceType;
  /** 出典不明の場合も空文字は許可しない。「不明」等、Ownerが判断した文字列を入れる（ADR 0012）。 */
  readonly title: string;
  readonly author?: string;
  readonly publisher?: string;
  readonly url?: string;
  readonly publishedAt?: string; // YYYY-MM-DD
  readonly accessedAt?: string; // YYYY-MM-DD
  readonly identifier?: string; // ISBN, DOI等
  readonly notes?: string;
}

function assertDateFormat(label: string, value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid date format for ${label}: ${value}. Expected YYYY-MM-DD.`);
  }
}

/**
 * changesのうち値がundefinedのキーを除いて返す。スプレッドは
 * 値がundefinedのキーも上書きしてしまうため（「変更なし」の
 * つもりが既存値を消してしまうバグの原因）、update()で
 * 明示的に除外する。
 */
function withoutUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

export class ExternalSource {
  private constructor(
    private readonly _id: string,
    private _sourceType: ExternalSourceType,
    private _title: string,
    private _author: string | undefined,
    private _publisher: string | undefined,
    private _url: string | undefined,
    private _publishedAt: string | undefined,
    private _accessedAt: string | undefined,
    private _identifier: string | undefined,
    private _notes: string | undefined,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(params: {
    id: string;
    record: ExternalSourceRecord;
    createdAt?: Date;
  }): ExternalSource {
    ExternalSource.validate(params.record);
    const now = params.createdAt ?? new Date();
    return new ExternalSource(
      params.id,
      params.record.sourceType,
      params.record.title,
      params.record.author,
      params.record.publisher,
      params.record.url,
      params.record.publishedAt,
      params.record.accessedAt,
      params.record.identifier,
      params.record.notes,
      now,
      now,
    );
  }

  static restore(params: {
    id: string;
    record: ExternalSourceRecord;
    createdAt: Date;
    updatedAt: Date;
  }): ExternalSource {
    return new ExternalSource(
      params.id,
      params.record.sourceType,
      params.record.title,
      params.record.author,
      params.record.publisher,
      params.record.url,
      params.record.publishedAt,
      params.record.accessedAt,
      params.record.identifier,
      params.record.notes,
      params.createdAt,
      params.updatedAt,
    );
  }

  private static validate(record: ExternalSourceRecord): void {
    if (!SOURCE_TYPES.includes(record.sourceType)) {
      throw new Error(`Invalid sourceType: ${String(record.sourceType)}`);
    }
    if (record.title.trim().length === 0) {
      throw new Error('title must not be empty');
    }
    if (record.publishedAt) assertDateFormat('publishedAt', record.publishedAt);
    if (record.accessedAt) assertDateFormat('accessedAt', record.accessedAt);
  }

  get id(): string {
    return this._id;
  }

  get record(): ExternalSourceRecord {
    return {
      sourceType: this._sourceType,
      title: this._title,
      author: this._author,
      publisher: this._publisher,
      url: this._url,
      publishedAt: this._publishedAt,
      accessedAt: this._accessedAt,
      identifier: this._identifier,
      notes: this._notes,
    };
  }

  get title(): string {
    return this._title;
  }

  get url(): string | undefined {
    return this._url;
  }

  get identifier(): string | undefined {
    return this._identifier;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  update(changes: Partial<ExternalSourceRecord>): void {
    const merged: ExternalSourceRecord = { ...this.record, ...withoutUndefined(changes) };
    ExternalSource.validate(merged);
    this._sourceType = merged.sourceType;
    this._title = merged.title;
    this._author = merged.author;
    this._publisher = merged.publisher;
    this._url = merged.url;
    this._publishedAt = merged.publishedAt;
    this._accessedAt = merged.accessedAt;
    this._identifier = merged.identifier;
    this._notes = merged.notes;
    this._updatedAt = new Date();
  }
}
