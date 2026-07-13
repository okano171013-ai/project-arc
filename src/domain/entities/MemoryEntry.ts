/**
 * MemoryEntry（ARC Memory の1件）
 *
 * Reflectionが「その日単位で閉じる記録」であるのに対し、
 * MemoryEntryは「時間に紐づかない、更新され続ける知識」を表す
 * （ADR 0005）。Life Inventoryと違い、詳細な購入・メンテナンス
 * 情報は持たない。素早く参照できることを優先した軽量な知識。
 */

export type MemoryCategory =
  | 'Assets'
  | 'Appearance'
  | 'Goals'
  | 'Preferences'
  | 'Education'
  | 'Career'
  | 'Health'
  | 'Finance'
  | 'Relationships'
  | 'Misc';

export interface MemoryEntryRecord {
  readonly category: MemoryCategory;
  /** 検索の主なキーになる短い見出し（例：「シェーバー」「英語資格」） */
  readonly title: string;
  /** 内容（例：「PHILIPS 5000 Series」） */
  readonly content: string;
  readonly tags?: string[];
}

export class MemoryEntry {
  private constructor(
    private readonly _id: string,
    private _category: MemoryCategory,
    private _title: string,
    private _content: string,
    private _tags: string[],
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(params: {
    id: string;
    record: MemoryEntryRecord;
    createdAt?: Date;
  }): MemoryEntry {
    if (params.record.title.trim().length === 0) {
      throw new Error('title must not be empty');
    }
    const now = params.createdAt ?? new Date();
    return new MemoryEntry(
      params.id,
      params.record.category,
      params.record.title,
      params.record.content,
      params.record.tags ?? [],
      now,
      now,
    );
  }

  static restore(params: {
    id: string;
    record: MemoryEntryRecord;
    createdAt: Date;
    updatedAt: Date;
  }): MemoryEntry {
    return new MemoryEntry(
      params.id,
      params.record.category,
      params.record.title,
      params.record.content,
      params.record.tags ?? [],
      params.createdAt,
      params.updatedAt,
    );
  }

  get id(): string {
    return this._id;
  }

  get category(): MemoryCategory {
    return this._category;
  }

  get title(): string {
    return this._title;
  }

  get content(): string {
    return this._content;
  }

  get tags(): readonly string[] {
    return this._tags;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  update(changes: {
    category?: MemoryCategory;
    title?: string;
    content?: string;
    tags?: string[];
  }): void {
    if (changes.title !== undefined) {
      if (changes.title.trim().length === 0) {
        throw new Error('title must not be empty');
      }
      this._title = changes.title;
    }
    if (changes.category !== undefined) this._category = changes.category;
    if (changes.content !== undefined) this._content = changes.content;
    if (changes.tags !== undefined) this._tags = changes.tags;
    this._updatedAt = new Date();
  }

  /** 検索対象文字列（title/content/tags）に、大小文字を区別せず部分一致するか。 */
  matches(query: string): boolean {
    const q = query.toLowerCase();
    return (
      this._title.toLowerCase().includes(q) ||
      this._content.toLowerCase().includes(q) ||
      this._tags.some((tag) => tag.toLowerCase().includes(q))
    );
  }
}
