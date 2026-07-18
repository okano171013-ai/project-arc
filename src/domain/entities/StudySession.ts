/**
 * StudySession（Version27、Study Timer Ingestion）
 *
 * ARC Study Timer（Owner本人が使う外部の学習タイマーアプリ）から送信
 * される、1回の学習セッションの定型ログ。`sessionId`はクライアント側が
 * 発行する冪等化キー——同一`sessionId`の再送は新規保存せず既存レコード
 * を返す（Repository層ではなくUseCase層でdedupする、既存の
 * idempotencyKey方式と同じ設計）。
 */

const MAX_DURATION_MS = 12 * 60 * 60 * 1000; // 12時間。1セッションとして非現実的な長さを拒否する。
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000; // クライアント・サーバー間の時刻ずれを許容する幅。

export interface StudySessionRecord {
  readonly sessionId: string;
  readonly subject: string;
  readonly task?: string;
  readonly startedAt: string; // ISO8601
  readonly endedAt: string; // ISO8601
  readonly durationMs: number;
  readonly source: string;
  readonly clientCreatedAt: string; // ISO8601
}

export class StudySession {
  private constructor(
    private readonly _id: string,
    private readonly _record: StudySessionRecord,
    private readonly _storedAt: Date,
  ) {}

  static create(params: { id: string; record: StudySessionRecord; now?: Date; storedAt?: Date }): StudySession {
    const now = params.now ?? new Date();
    validate(params.record, now);
    return new StudySession(params.id, params.record, params.storedAt ?? now);
  }

  static restore(params: { id: string; record: StudySessionRecord; storedAt: Date }): StudySession {
    return new StudySession(params.id, params.record, params.storedAt);
  }

  get id(): string {
    return this._id;
  }

  get record(): StudySessionRecord {
    return this._record;
  }

  get storedAt(): Date {
    return this._storedAt;
  }
}

function validate(record: StudySessionRecord, now: Date): void {
  if (!record.sessionId?.trim()) throw new Error('sessionId is required');
  if (!record.subject?.trim()) throw new Error('subject is required');
  if (!record.source?.trim()) throw new Error('source is required');

  const startedAtMs = Date.parse(record.startedAt);
  const endedAtMs = Date.parse(record.endedAt);
  const clientCreatedAtMs = Date.parse(record.clientCreatedAt);
  if (Number.isNaN(startedAtMs)) throw new Error('startedAt must be a valid ISO8601 date');
  if (Number.isNaN(endedAtMs)) throw new Error('endedAt must be a valid ISO8601 date');
  if (Number.isNaN(clientCreatedAtMs)) throw new Error('clientCreatedAt must be a valid ISO8601 date');

  if (endedAtMs <= startedAtMs) throw new Error('endedAt must be after startedAt');

  if (!Number.isFinite(record.durationMs) || record.durationMs <= 0) {
    throw new Error('durationMs must be a positive number');
  }
  if (record.durationMs > MAX_DURATION_MS) {
    throw new Error(`durationMs must not exceed ${MAX_DURATION_MS}ms (12 hours)`);
  }

  const futureLimit = now.getTime() + FUTURE_TOLERANCE_MS;
  if (startedAtMs > futureLimit) throw new Error('startedAt must not be in the future');
  if (endedAtMs > futureLimit) throw new Error('endedAt must not be in the future');
  if (clientCreatedAtMs > futureLimit) throw new Error('clientCreatedAt must not be in the future');
}
