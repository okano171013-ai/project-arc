/**
 * InterventionPolicySettings（Version26、行動介入レイヤー）
 *
 * シングルトン設定Entity。quiet hours・除外ウィンドウ（授業中/移動中/
 * 睡眠中/医療上の理由）・1日あたりの通知上限を保持する——「Systemが
 * いつ介入してよいか」を制御する境界であり、`AgentDelegationGrant`と
 * 同格の安全境界として、常にLevel2・自動承認対象外とする
 * （`ClassifyApprovalLevelUseCase`・`WriteProposalGatewayUseCase`参照）。
 */

export type ExclusionReason = 'class' | 'commute' | 'sleep' | 'medical' | 'other';

export interface ExclusionWindow {
  readonly reason: ExclusionReason;
  readonly start: string; // ISO8601
  readonly end: string; // ISO8601
  readonly note?: string;
}

export interface InterventionPolicySettingsRecord {
  readonly checkInIntervalMinutes: number;
  readonly activeHoursStart: string; // 'HH:mm'
  readonly activeHoursEnd: string; // 'HH:mm'
  readonly quietHoursStart: string; // 'HH:mm'
  readonly quietHoursEnd: string; // 'HH:mm'（日跨ぎ可）
  readonly dailyNotificationLimit: number;
  readonly minDistractionConfidenceForWarning: 'low' | 'medium' | 'high';
  readonly dedupWindowMinutes: number;
  readonly dismissCooldownHours: number;
  readonly exclusionWindows: ExclusionWindow[];
}

export const DEFAULT_INTERVENTION_POLICY_SETTINGS: InterventionPolicySettingsRecord = {
  checkInIntervalMinutes: 120,
  activeHoursStart: '07:00',
  activeHoursEnd: '23:00',
  quietHoursStart: '23:00',
  quietHoursEnd: '07:00',
  dailyNotificationLimit: 6,
  minDistractionConfidenceForWarning: 'medium',
  dedupWindowMinutes: 120,
  dismissCooldownHours: 4,
  exclusionWindows: [],
};

const HHMM_PATTERN = /^\d{2}:\d{2}$/;

export class InterventionPolicySettings {
  private constructor(
    private readonly _id: string,
    private readonly _record: InterventionPolicySettingsRecord,
    private readonly _createdAt: Date,
  ) {}

  static create(params: {
    id: string;
    record: InterventionPolicySettingsRecord;
    createdAt?: Date;
  }): InterventionPolicySettings {
    const r = params.record;
    for (const [label, value] of [
      ['checkInIntervalMinutes', r.checkInIntervalMinutes],
      ['dailyNotificationLimit', r.dailyNotificationLimit],
      ['dedupWindowMinutes', r.dedupWindowMinutes],
      ['dismissCooldownHours', r.dismissCooldownHours],
    ] as const) {
      if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`${label} must be a positive integer`);
      }
    }
    for (const [label, value] of [
      ['activeHoursStart', r.activeHoursStart],
      ['activeHoursEnd', r.activeHoursEnd],
      ['quietHoursStart', r.quietHoursStart],
      ['quietHoursEnd', r.quietHoursEnd],
    ] as const) {
      if (!HHMM_PATTERN.test(value)) {
        throw new Error(`${label} must match HH:mm`);
      }
    }
    for (const window of r.exclusionWindows) {
      if (Number.isNaN(Date.parse(window.start)) || Number.isNaN(Date.parse(window.end))) {
        throw new Error('exclusionWindows entries must have valid ISO8601 start/end');
      }
      if (Date.parse(window.start) >= Date.parse(window.end)) {
        throw new Error('exclusionWindows entries must have start before end');
      }
    }
    return new InterventionPolicySettings(params.id, params.record, params.createdAt ?? new Date());
  }

  static restore(params: {
    id: string;
    record: InterventionPolicySettingsRecord;
    createdAt: Date;
  }): InterventionPolicySettings {
    return new InterventionPolicySettings(params.id, params.record, params.createdAt);
  }

  get id(): string {
    return this._id;
  }

  get record(): InterventionPolicySettingsRecord {
    return this._record;
  }

  get createdAt(): Date {
    return this._createdAt;
  }
}
