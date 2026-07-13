/**
 * SkinLog（肌の状態の記録・比較）
 *
 * Version5で新設。Appearance Log（月次・自由記述の総合的な外見記録）
 * とは別物として、肌の状態のみを構造化項目で頻繁に記録・比較する
 * ことを目的とする（ADR 0006）。画像解析は行わず、写真ファイルの
 * 保存場所を記録するに留める（Version4からの一貫方針）。
 */

export interface SkinLogRecord {
  readonly date: string; // 記録日 YYYY-MM-DD
  readonly redness?: number; // 赤み（1〜5、5が悪い）
  readonly pores?: number; // 毛穴（1〜5）
  readonly acne?: number; // ニキビ（1〜5）
  readonly acneScars?: number; // ニキビ跡（1〜5）
  readonly sebum?: number; // 皮脂（1〜5）
  readonly currentSkincare?: string; // 使用中スキンケア
  readonly note?: string; // 改善履歴・気づき
  /** ローカルに保存された写真ファイルの相対パス。画像解析はしない。 */
  readonly photoPath?: string;
}

const SEVERITY_FIELDS = ['redness', 'pores', 'acne', 'acneScars', 'sebum'] as const;

export class SkinLog {
  private constructor(
    private readonly _id: string,
    private readonly _record: SkinLogRecord,
    private readonly _createdAt: Date,
  ) {}

  static create(params: { id: string; record: SkinLogRecord; createdAt?: Date }): SkinLog {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(params.record.date)) {
      throw new Error(`Invalid date format: ${params.record.date}. Expected YYYY-MM-DD.`);
    }
    for (const field of SEVERITY_FIELDS) {
      const value = params.record[field];
      if (value !== undefined && (value < 1 || value > 5)) {
        throw new Error(`${field} must be between 1 and 5`);
      }
    }
    return new SkinLog(params.id, params.record, params.createdAt ?? new Date());
  }

  get id(): string {
    return this._id;
  }

  get record(): SkinLogRecord {
    return this._record;
  }

  get date(): string {
    return this._record.date;
  }

  get createdAt(): Date {
    return this._createdAt;
  }
}
