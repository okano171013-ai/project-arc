/**
 * ExternalKnowledge（External Brainに保存する知識）
 *
 * Version10で新設。外部出典（ExternalSource）から得た、再利用対象と
 * なる知識・情報を表すEntity。原文（content）とOwnerの解釈
 * （ownerSummary/ownerComment）を明確に分離する（Version10指示書
 * 2.3、ADR 0012）。MemoryEntry（ADR 0005）とは記録主体・出典・
 * 更新可能性・信頼性・時間性の全てが異なるため、あえて別Entityと
 * している（ADR 0018）。
 *
 * confidenceはOwnerが設定する補助的な属性であり、Systemが
 * sourceTypeやcontentの中身から自動決定してはならない（指示書12章）。
 */

export type ExternalKnowledgeStatus = 'inbox' | 'reviewed' | 'archived';
export type ExternalKnowledgeConfidence = 'unassessed' | 'low' | 'medium' | 'high';

const STATUSES: ExternalKnowledgeStatus[] = ['inbox', 'reviewed', 'archived'];
const CONFIDENCES: ExternalKnowledgeConfidence[] = ['unassessed', 'low', 'medium', 'high'];

export interface ExternalKnowledgeRecord {
  readonly sourceId?: string;
  readonly title: string;
  readonly content: string;
  readonly ownerSummary?: string;
  readonly ownerComment?: string;
  readonly topics: string[];
  readonly tags: string[];
  readonly purpose?: string;
  readonly confidence: ExternalKnowledgeConfidence;
  readonly status: ExternalKnowledgeStatus;
  readonly capturedAt: string; // YYYY-MM-DD
  readonly occurredAt?: string; // YYYY-MM-DD
  /**
   * 関連する他のExternalKnowledgeのid（訂正・更新・関連情報等）。
   * supersedes/supersededByのような方向性のある知識グラフは
   * Version10では作らない（指示書11章、ADR 0012）。単純な相互
   * リンクの配列に留める。
   */
  readonly relatedKnowledgeIds?: string[];
}

export type ExternalKnowledgeInputRecord = Omit<
  ExternalKnowledgeRecord,
  'topics' | 'tags' | 'confidence' | 'status'
> & {
  topics?: string[];
  tags?: string[];
  confidence?: ExternalKnowledgeConfidence;
  status?: ExternalKnowledgeStatus;
};

function assertDateFormat(label: string, value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid date format for ${label}: ${value}. Expected YYYY-MM-DD.`);
  }
}

function normalizeList(values: string[] | undefined): string[] {
  if (!values) return [];
  return [...new Set(values.map((v) => v.trim()).filter((v) => v.length > 0))];
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

export class ExternalKnowledge {
  private constructor(
    private readonly _id: string,
    private _sourceId: string | undefined,
    private _title: string,
    private _content: string,
    private _ownerSummary: string | undefined,
    private _ownerComment: string | undefined,
    private _topics: string[],
    private _tags: string[],
    private _purpose: string | undefined,
    private _confidence: ExternalKnowledgeConfidence,
    private _status: ExternalKnowledgeStatus,
    private _capturedAt: string,
    private _occurredAt: string | undefined,
    private _relatedKnowledgeIds: string[],
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(params: {
    id: string;
    record: ExternalKnowledgeInputRecord;
    createdAt?: Date;
  }): ExternalKnowledge {
    const normalized = ExternalKnowledge.normalize(params.record);
    ExternalKnowledge.validate(normalized);
    const now = params.createdAt ?? new Date();
    return new ExternalKnowledge(
      params.id,
      normalized.sourceId,
      normalized.title,
      normalized.content,
      normalized.ownerSummary,
      normalized.ownerComment,
      normalized.topics,
      normalized.tags,
      normalized.purpose,
      normalized.confidence,
      normalized.status,
      normalized.capturedAt,
      normalized.occurredAt,
      normalized.relatedKnowledgeIds ?? [],
      now,
      now,
    );
  }

  static restore(params: {
    id: string;
    record: ExternalKnowledgeRecord;
    createdAt: Date;
    updatedAt: Date;
  }): ExternalKnowledge {
    return new ExternalKnowledge(
      params.id,
      params.record.sourceId,
      params.record.title,
      params.record.content,
      params.record.ownerSummary,
      params.record.ownerComment,
      params.record.topics,
      params.record.tags,
      params.record.purpose,
      params.record.confidence,
      params.record.status,
      params.record.capturedAt,
      params.record.occurredAt,
      params.record.relatedKnowledgeIds ?? [],
      params.createdAt,
      params.updatedAt,
    );
  }

  private static normalize(record: ExternalKnowledgeInputRecord): ExternalKnowledgeRecord {
    return {
      sourceId: record.sourceId,
      title: record.title,
      content: record.content,
      ownerSummary: record.ownerSummary,
      ownerComment: record.ownerComment,
      topics: normalizeList(record.topics),
      tags: normalizeList(record.tags),
      purpose: record.purpose,
      confidence: record.confidence ?? 'unassessed',
      status: record.status ?? 'inbox',
      capturedAt: record.capturedAt,
      occurredAt: record.occurredAt,
      relatedKnowledgeIds: record.relatedKnowledgeIds,
    };
  }

  private static validate(record: ExternalKnowledgeRecord): void {
    if (record.title.trim().length === 0) {
      throw new Error('title must not be empty');
    }
    if (record.content.trim().length === 0) {
      throw new Error('content must not be empty');
    }
    if (!STATUSES.includes(record.status)) {
      throw new Error(`Invalid status: ${String(record.status)}`);
    }
    if (!CONFIDENCES.includes(record.confidence)) {
      throw new Error(`Invalid confidence: ${String(record.confidence)}`);
    }
    assertDateFormat('capturedAt', record.capturedAt);
    if (record.occurredAt) assertDateFormat('occurredAt', record.occurredAt);
  }

  get id(): string {
    return this._id;
  }

  get record(): ExternalKnowledgeRecord {
    return {
      sourceId: this._sourceId,
      title: this._title,
      content: this._content,
      ownerSummary: this._ownerSummary,
      ownerComment: this._ownerComment,
      topics: this._topics,
      tags: this._tags,
      purpose: this._purpose,
      confidence: this._confidence,
      status: this._status,
      capturedAt: this._capturedAt,
      occurredAt: this._occurredAt,
      relatedKnowledgeIds: this._relatedKnowledgeIds,
    };
  }

  get title(): string {
    return this._title;
  }

  get status(): ExternalKnowledgeStatus {
    return this._status;
  }

  get sourceId(): string | undefined {
    return this._sourceId;
  }

  get capturedAt(): string {
    return this._capturedAt;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  update(changes: Partial<ExternalKnowledgeInputRecord>): void {
    const merged = ExternalKnowledge.normalize({ ...this.record, ...withoutUndefined(changes) });
    ExternalKnowledge.validate(merged);
    this._sourceId = merged.sourceId;
    this._title = merged.title;
    this._content = merged.content;
    this._ownerSummary = merged.ownerSummary;
    this._ownerComment = merged.ownerComment;
    this._topics = merged.topics;
    this._tags = merged.tags;
    this._purpose = merged.purpose;
    this._confidence = merged.confidence;
    this._status = merged.status;
    this._capturedAt = merged.capturedAt;
    this._occurredAt = merged.occurredAt;
    this._relatedKnowledgeIds = merged.relatedKnowledgeIds ?? [];
    this._updatedAt = new Date();
  }

  /** 検索対象文字列に部分一致するか（自身のフィールドのみ、Source側は呼び出し側で結合する）。 */
  matches(query: string): boolean {
    const q = query.toLowerCase();
    const haystack = [
      this._title,
      this._content,
      this._ownerSummary,
      this._ownerComment,
      this._purpose,
      ...this._topics,
      ...this._tags,
    ]
      .filter((v): v is string => Boolean(v))
      .join('\n')
      .toLowerCase();
    return haystack.includes(q);
  }
}
