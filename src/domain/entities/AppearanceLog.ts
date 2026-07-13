/**
 * AppearanceLog（月次の外見記録）
 *
 * Version4最大の新機能。画像解析は行わず、写真ファイルの保存場所を
 * 記録するに留める（Owner要件）。
 */

export interface AppearanceLogRecord {
  readonly date: string; // 撮影日 YYYY-MM-DD
  readonly overallRating: number; // 総合評価（1〜5）
  readonly skin?: string; // 肌
  readonly hair?: string; // 髪
  readonly beard?: string; // 髭
  readonly outfit?: string; // 服装
  readonly physique?: string; // 体型
  readonly comment?: string;
  readonly improvementSuggestions?: string;
  /** ローカルに保存された写真ファイルの相対パス。画像解析はしない。 */
  readonly photoPath?: string;
}

export class AppearanceLog {
  private constructor(
    private readonly _id: string,
    private readonly _record: AppearanceLogRecord,
    private readonly _createdAt: Date,
  ) {}

  static create(params: {
    id: string;
    record: AppearanceLogRecord;
    createdAt?: Date;
  }): AppearanceLog {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(params.record.date)) {
      throw new Error(`Invalid date format: ${params.record.date}. Expected YYYY-MM-DD.`);
    }
    if (params.record.overallRating < 1 || params.record.overallRating > 5) {
      throw new Error('overallRating must be between 1 and 5');
    }
    return new AppearanceLog(params.id, params.record, params.createdAt ?? new Date());
  }

  get id(): string {
    return this._id;
  }

  get record(): AppearanceLogRecord {
    return this._record;
  }

  get date(): string {
    return this._record.date;
  }

  get createdAt(): Date {
    return this._createdAt;
  }
}
