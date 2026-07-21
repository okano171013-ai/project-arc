import type { ConnectorConfig } from './connectorConfig.js';

/**
 * Connector（Version15、Connector Deployment）
 *
 * ARC Connector HTTP API（`src/infrastructure/http/server.ts`）を
 * 呼び出すためのクライアント。指示書2章「ConnectorはApplication層へ
 * 直接アクセスしない。HTTP APIのみ利用する」を型レベルでも徹底する
 * ため、Domain/Application層の型を一切importしない——この
 * ファイル内で完結するローカル型のみを使う（ADR 0034参照）。
 *
 * 実際に外部プログラム（将来のMCPサーバー・ChatGPT Actions等）が
 * このAPIを呼ぶ場合も、TypeScriptの内部型は見えず生のJSONしか
 * 受け取れない——このConnectorはその制約をそのまま体現する参考実装。
 */

export type ConnectorProposalType =
  | 'Reflection'
  | 'Memory'
  | 'ExternalKnowledge'
  | 'Appearance'
  | 'ManagementFeedback'
  | 'AgentMessage'
  | 'ChallengeLog'
  | 'AgentDelegationGrant'
  | 'MealLog'
  | 'NutritionLog'
  | 'WeightLog'
  | 'FinanceLog'
  | 'CheckIn'
  | 'DistractionSignal'
  | 'InterventionResponse'
  | 'InterventionPolicySettings';

export type ConnectorApprovalLevel = 'Level0' | 'Level1' | 'Level2';

/** Owner指示書（AgentMessage `6b78f23d-...`）が列挙した6カテゴリにそのまま対応する。 */
export interface ConnectorApprovalSignals {
  readonly costImpact?: boolean;
  readonly externalExposureChange?: boolean;
  readonly authOrSecretChange?: boolean;
  readonly destructive?: boolean;
  readonly personalDataExternalTransfer?: boolean;
  readonly constitutionOrPrincipleChange?: boolean;
}

export interface ConnectorProposal {
  readonly type: ConnectorProposalType;
  readonly target: string;
  readonly payload: Record<string, unknown>;
  readonly reason: string;
  readonly createdAt: string;
  readonly signals?: ConnectorApprovalSignals;
  readonly approvalLevel?: ConnectorApprovalLevel;
  /** Version24：有効なAgentDelegationGrantによりOwnerのdoなしで即時書き込みされた場合のみtrue。 */
  readonly autoApproved?: boolean;
  readonly result?: unknown;
  /**
   * Version40（ADR 0072、保存信頼性契約）：`autoApproved`試行が行われた
   * 場合のみ設定される。両方trueの場合のみ「保存確認済み」とみなせる。
   */
  readonly saved?: boolean;
  readonly verified?: boolean;
  /** `saved`がfalseの場合のみ設定される、再試行に使える冪等キー相当の値。 */
  readonly retryQueueId?: string;
  /** `saved`がfalseの場合のみ設定される、失敗理由。 */
  readonly saveError?: string;
}

export interface ConnectorApprovalDecision {
  readonly id: string;
  readonly record: Record<string, unknown>;
  readonly createdAt: string;
}

export type ConnectorAgentDelegationGrantStatus = 'Active' | 'Paused' | 'Revoked';

export interface ConnectorAgentDelegationGrant {
  readonly id: string;
  readonly record: Record<string, unknown>;
  readonly createdAt: string;
  readonly status: ConnectorAgentDelegationGrantStatus;
  readonly usageCount: number;
}

export interface ConnectorMealLog {
  readonly id: string;
  readonly record: Record<string, unknown>;
  readonly createdAt: string;
}

export interface ConnectorNutritionLog {
  readonly id: string;
  readonly record: Record<string, unknown>;
  readonly createdAt: string;
}

export interface ConnectorWeightLog {
  readonly id: string;
  readonly record: Record<string, unknown>;
  readonly createdAt: string;
}

export interface ConnectorFinanceLog {
  readonly id: string;
  readonly record: Record<string, unknown>;
  readonly createdAt: string;
}

export interface ConnectorNutritionSummary {
  readonly date: string;
  readonly totals: {
    calories: number;
    proteinG: number;
    fatG: number;
    carbohydrateG: number;
    fiberG: number;
    saltG: number;
  };
  readonly mealLogCount: number;
  readonly nutritionLogCount: number;
  readonly containsEstimatedValues: boolean;
}

export type ConnectorDevelopmentGrantStatus = 'Active' | 'Paused' | 'Revoked';

/** Version34、ADR 0060。読み取り専用公開のみ（write操作は別工程）。 */
export interface ConnectorDevelopmentGrant {
  readonly id: string;
  readonly record: Record<string, unknown>;
  readonly createdAt: string;
  readonly status: ConnectorDevelopmentGrantStatus;
  readonly versionsConsumed: number;
}

export type ConnectorAgentTaskStatus =
  | 'Proposed'
  | 'Ready'
  | 'Claimed'
  | 'InProgress'
  | 'Review'
  | 'ChangesRequested'
  | 'Accepted'
  | 'Closed';

/** Version34、ADR 0061。読み取り専用公開のみ（write操作は別工程）。 */
export interface ConnectorAgentTask {
  readonly id: string;
  readonly record: Record<string, unknown>;
  readonly createdAt: string;
  readonly status: ConnectorAgentTaskStatus;
  readonly claimedBy?: string;
  readonly leaseExpiresAt?: string;
  readonly retryCount: number;
  readonly commits: string[];
  readonly testResult?: { passed: boolean; summary: string };
}

export interface ListMealLogsInput {
  limit: number;
  date?: string;
  mealType?: string;
}

export interface ListNutritionLogsInput {
  limit: number;
  mealLogId?: string;
}

export interface ListWeightLogsInput {
  limit: number;
  date?: string;
}

export interface ListFinanceLogsInput {
  limit: number;
  date?: string;
  category?: string;
  type?: 'Income' | 'Expense';
}

export interface ConnectorCheckIn {
  readonly id: string;
  readonly record: Record<string, unknown>;
  readonly createdAt: string;
}

export interface ConnectorDistractionSignal {
  readonly id: string;
  readonly record: Record<string, unknown>;
  readonly createdAt: string;
}

export interface ConnectorIntervention {
  readonly id: string;
  readonly record: Record<string, unknown>;
  readonly createdAt: string;
  readonly status: 'Pending' | 'Acknowledged' | 'Dismissed' | 'Snoozed';
  readonly respondedAt?: string;
  readonly responseNote?: string;
  readonly snoozedUntil?: string;
  readonly resumedActivityAt?: string;
}

export interface ConnectorInterventionPolicySettings {
  readonly record: Record<string, unknown>;
  readonly isDefault: boolean;
}

export interface ConnectorDailyBehaviorScore {
  readonly date: string;
  readonly reflectionScore: number | undefined;
  readonly checkInCompletionRate: number | undefined;
  readonly interventionPenalty: number;
  readonly compositeScore: number | undefined;
  readonly idealBaseline: number;
  readonly vsIdealBaseline: number | undefined;
  readonly previousDayDelta: number | undefined;
  readonly sevenDayComparison: Record<string, unknown>;
  readonly thirtyDayComparison: Record<string, unknown>;
}

export interface ConnectorInterventionEffectiveness {
  readonly totalGenerated: number;
  readonly acknowledgedCount: number;
  readonly dismissedCount: number;
  readonly snoozedCount: number;
  readonly pendingCount: number;
  readonly dismissRate: number | undefined;
  readonly snoozeRate: number | undefined;
  readonly avgResumeMinutes: number | undefined;
  readonly byIntensity: Record<string, unknown>;
}

export interface ListCheckInsInput {
  limit: number;
  date?: string;
}

export interface ListDistractionSignalsInput {
  limit: number;
  date?: string;
  kind?: string;
}

export interface ListInterventionsInput {
  limit: number;
  status?: 'Pending' | 'Acknowledged' | 'Dismissed' | 'Snoozed';
}

export interface RecordStudySessionInput {
  sessionId: string;
  subject: string;
  task?: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  source: string;
  clientCreatedAt: string;
}

export interface RecordStudySessionResult {
  sessionId: string;
  storedAt?: string;
  duplicate?: boolean;
}

export interface SummarizeStudySessionsResult {
  from: string;
  to: string;
  sessionCount: number;
  totalDurationMs: number;
  bySubject: Record<string, number>;
}

/** Version40：進行中StudySession（対話から開始・未終了）のrecord。 */
export interface ConnectorInProgressStudySessionRecord {
  subject: string;
  task?: string;
  startedAt: string;
  source: string;
}

/** Version40：`listStudySessions`が返す、進行中・完了済み混在の1件。 */
export interface ConnectorStudySessionListItem {
  id: string;
  status: 'InProgress' | 'Completed';
  subject: string;
  task?: string;
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
}

export type ManagementFeedbackResolution =
  | 'Open'
  | 'Accepted'
  | 'Implemented'
  | 'Closed'
  | 'Rejected';

export interface ConnectorReflection {
  readonly id: string;
  readonly date: string;
  readonly record: Record<string, unknown>;
  readonly createdAt: string;
}

export interface ConnectorTimelineEntry {
  readonly date: string;
  readonly source: string;
  readonly title: string;
  readonly summary?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface ConnectorManagementFeedback {
  readonly id: string;
  readonly record: Record<string, unknown>;
  readonly createdAt: string;
  readonly resolution: ManagementFeedbackResolution;
  readonly resolved: boolean;
  readonly resolvedAt?: string;
}

export type AgentMessageDirection = 'ToClaudeCode' | 'ToARC';

export interface ConnectorAgentMessage {
  readonly id: string;
  readonly record: Record<string, unknown>;
  readonly createdAt: string;
}

export interface ReadTimelineInput {
  limit: number;
  since?: string;
  source?: string;
}

export interface ReadExternalInput {
  limit: number;
  query?: string;
  tags?: string[];
  topics?: string[];
}

export interface ReadDecisionInput {
  question: string;
  limit: number;
  candidates?: string[];
  tags?: string[];
  topics?: string[];
}

export interface CreateProposalInput {
  type: ConnectorProposalType;
  target: string;
  payload: Record<string, unknown>;
  reason: string;
  signals?: ConnectorApprovalSignals;
}

interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export class Connector {
  constructor(private readonly config: ConnectorConfig) {}

  // --- Read Layer（Version14のGET /read/*をそのまま呼ぶだけ） ---

  async readReflection(limit: number): Promise<{ reflections: ConnectorReflection[] }> {
    return this.request('GET', `/read/reflection?limit=${limit}`);
  }

  async readTimeline(input: ReadTimelineInput): Promise<{ entries: ConnectorTimelineEntry[] }> {
    const params = new URLSearchParams({ limit: String(input.limit) });
    if (input.since) params.set('since', input.since);
    if (input.source) params.set('source', input.source);
    return this.request('GET', `/read/timeline?${params.toString()}`);
  }

  async readExternal(input: ReadExternalInput): Promise<{ results: unknown[]; sources: unknown[] }> {
    const params = new URLSearchParams({ limit: String(input.limit) });
    if (input.query) params.set('q', input.query);
    for (const tag of input.tags ?? []) params.append('tags', tag);
    for (const topic of input.topics ?? []) params.append('topics', topic);
    return this.request('GET', `/read/external?${params.toString()}`);
  }

  async readDecision(
    input: ReadDecisionInput,
  ): Promise<{ decisionContext: unknown; retrievedKnowledge: unknown[]; sources: unknown[] }> {
    const params = new URLSearchParams({ limit: String(input.limit), question: input.question });
    for (const candidate of input.candidates ?? []) params.append('candidates', candidate);
    for (const tag of input.tags ?? []) params.append('tags', tag);
    for (const topic of input.topics ?? []) params.append('topics', topic);
    return this.request('GET', `/read/decision?${params.toString()}`);
  }

  // --- Write Proposal Layer（Version14のPOST /proposal/*をそのまま呼ぶだけ） ---
  // Connector自身もProposalを保存しない（指示書3章）。createProposalの
  // 戻り値を呼び出し元がそのままapproveProposal/rejectProposalへ渡す。

  async createProposal(input: CreateProposalInput): Promise<ConnectorProposal> {
    const { proposal } = await this.request<{ proposal: ConnectorProposal }>(
      'POST',
      '/proposal/create',
      input,
    );
    return proposal;
  }

  async approveProposal(
    proposal: ConnectorProposal,
  ): Promise<{ type: string; result: unknown; saved?: boolean; verified?: boolean }> {
    return this.request('POST', '/proposal/approve', proposal);
  }

  async rejectProposal(proposal: ConnectorProposal): Promise<{ rejected: true; type: string }> {
    return this.request('POST', '/proposal/reject', proposal);
  }

  // --- ManagementFeedback（Version15、指示書12章） ---

  async listFeedback(
    resolution?: ManagementFeedbackResolution,
  ): Promise<{ feedback: ConnectorManagementFeedback[] }> {
    const path = resolution
      ? `/management-feedback?resolution=${encodeURIComponent(resolution)}`
      : '/management-feedback';
    return this.request('GET', path);
  }

  async resolveFeedback(
    id: string,
    resolution: ManagementFeedbackResolution,
  ): Promise<{ feedback: ConnectorManagementFeedback }> {
    return this.request('POST', `/management-feedback/${encodeURIComponent(id)}/resolve`, {
      resolution,
    });
  }

  // --- AgentMessage（Version17、Agent Collaboration Layer） ---
  // 書き込みはcreateProposal/approveProposal（type: 'AgentMessage'）を
  // そのまま使う。読み取りのみ専用メソッドを持つ。

  async listAgentMessages(
    direction?: AgentMessageDirection,
    relatedVersion?: string,
  ): Promise<{ messages: ConnectorAgentMessage[] }> {
    const params = new URLSearchParams();
    if (direction) params.set('direction', direction);
    if (relatedVersion) params.set('relatedVersion', relatedVersion);
    const query = params.toString();
    return this.request('GET', `/agent-messages${query ? `?${query}` : ''}`);
  }

  // --- ApprovalDecision（Version21、Approval Policy Engine） ---
  // 書き込みはcreateProposal/approveProposal/rejectProposalが`signals`を
  // 渡すことで自動的に記録される。読み取りのみ専用メソッドを持つ。

  async listApprovalDecisions(
    level?: ConnectorApprovalLevel,
  ): Promise<{ decisions: ConnectorApprovalDecision[] }> {
    const path = level ? `/approval-decisions?level=${encodeURIComponent(level)}` : '/approval-decisions';
    return this.request('GET', path);
  }

  // --- AgentDelegationGrant（Version24、Constitution第4条限定改定） ---
  // 書き込みはcreateProposal/approveProposal（type: 'AgentDelegationGrant'）
  // をそのまま使う。読み取りのみ専用メソッドを持つ。

  async listAgentDelegationGrants(
    status?: ConnectorAgentDelegationGrantStatus,
  ): Promise<{ grants: ConnectorAgentDelegationGrant[] }> {
    const path = status ? `/agent-delegation-grants?status=${encodeURIComponent(status)}` : '/agent-delegation-grants';
    return this.request('GET', path);
  }

  // --- DevelopmentGrant（Version34、ADR 0060） ---
  // 読み取り専用公開のみ。create/pause/resume/revokeはOwner専権事項
  // のため、Version34では意図的にwriteエンドポイントを追加しない
  // （別工程として扱う、脅威モデル再確認後に着手）。

  async listDevelopmentGrants(
    status?: ConnectorDevelopmentGrantStatus,
  ): Promise<{ grants: ConnectorDevelopmentGrant[] }> {
    const path = status ? `/development-grants?status=${encodeURIComponent(status)}` : '/development-grants';
    return this.request('GET', path);
  }

  // --- AgentTask（Version34、ADR 0061） ---
  // 読み取り専用公開のみ。claim/heartbeat/状態遷移等のwrite操作は
  // 別工程として扱う（DevelopmentGrantと同じ理由）。

  async listAgentTasks(input: {
    status?: ConnectorAgentTaskStatus;
    relatedVersion?: string;
  } = {}): Promise<{ tasks: ConnectorAgentTask[] }> {
    const params = new URLSearchParams();
    if (input.status) params.set('status', input.status);
    if (input.relatedVersion) params.set('relatedVersion', input.relatedVersion);
    const query = params.toString();
    return this.request('GET', query ? `/agent-tasks?${query}` : '/agent-tasks');
  }

  // --- Life Log Phase 2（Version25） ---
  // 書き込みはcreateProposal/approveProposal（type: 'MealLog'等）を
  // そのまま使う。読み取りのみ専用メソッドを持つ。

  async listMealLogs(input: ListMealLogsInput): Promise<{ logs: ConnectorMealLog[] }> {
    const params = new URLSearchParams({ limit: String(input.limit) });
    if (input.date) params.set('date', input.date);
    if (input.mealType) params.set('mealType', input.mealType);
    return this.request('GET', `/meal-logs?${params.toString()}`);
  }

  async listNutritionLogs(input: ListNutritionLogsInput): Promise<{ logs: ConnectorNutritionLog[] }> {
    const params = new URLSearchParams({ limit: String(input.limit) });
    if (input.mealLogId) params.set('mealLogId', input.mealLogId);
    return this.request('GET', `/nutrition-logs?${params.toString()}`);
  }

  async summarizeNutritionByDate(date: string): Promise<ConnectorNutritionSummary> {
    return this.request('GET', `/nutrition-logs/summary?date=${encodeURIComponent(date)}`);
  }

  async listWeightLogs(input: ListWeightLogsInput): Promise<{ logs: ConnectorWeightLog[] }> {
    const params = new URLSearchParams({ limit: String(input.limit) });
    if (input.date) params.set('date', input.date);
    return this.request('GET', `/weight-logs?${params.toString()}`);
  }

  async listFinanceLogs(input: ListFinanceLogsInput): Promise<{ logs: ConnectorFinanceLog[] }> {
    const params = new URLSearchParams({ limit: String(input.limit) });
    if (input.date) params.set('date', input.date);
    if (input.category) params.set('category', input.category);
    if (input.type) params.set('type', input.type);
    return this.request('GET', `/finance-logs?${params.toString()}`);
  }

  // --- 行動介入レイヤー（Version26） ---
  // 書き込みはcreateProposal/approveProposal（type: 'CheckIn'等）を
  // そのまま使う。読み取りのみ専用メソッドを持つ。Interventionの生成
  // 自体はこのConnector経由では呼べない（ADR 0053、ローカルスケジューラ
  // のみが呼ぶ設計）。

  async listCheckIns(input: ListCheckInsInput): Promise<{ checkIns: ConnectorCheckIn[] }> {
    const params = new URLSearchParams({ limit: String(input.limit) });
    if (input.date) params.set('date', input.date);
    return this.request('GET', `/check-ins?${params.toString()}`);
  }

  async listDistractionSignals(
    input: ListDistractionSignalsInput,
  ): Promise<{ signals: ConnectorDistractionSignal[] }> {
    const params = new URLSearchParams({ limit: String(input.limit) });
    if (input.date) params.set('date', input.date);
    if (input.kind) params.set('kind', input.kind);
    return this.request('GET', `/distraction-signals?${params.toString()}`);
  }

  async listInterventions(input: ListInterventionsInput): Promise<{ interventions: ConnectorIntervention[] }> {
    const params = new URLSearchParams({ limit: String(input.limit) });
    if (input.status) params.set('status', input.status);
    return this.request('GET', `/interventions?${params.toString()}`);
  }

  async getInterventionPolicySettings(): Promise<ConnectorInterventionPolicySettings> {
    return this.request('GET', '/intervention-policy-settings');
  }

  async getDailyBehaviorScore(date: string): Promise<ConnectorDailyBehaviorScore> {
    return this.request('GET', `/daily-behavior-score?date=${encodeURIComponent(date)}`);
  }

  async measureInterventionEffectiveness(
    from: string,
    to: string,
  ): Promise<ConnectorInterventionEffectiveness> {
    return this.request(
      'GET',
      `/intervention-effectiveness?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    );
  }

  // --- Study Session Ingestion（Version27） ---
  // `remoteServer.ts`（公開トンネル側）が専用のStudy Timer tokenで
  // 認証した後、`recordStudySession`経由でARC Connector HTTP APIへ内部
  // 転送する（ADR 0054）。ARC自身（MCP Tool経由）は`recordStudySession`
  // を呼び出す手段を持たない——意図的に対応するMCP Toolを用意しない
  // （Study Timerアプリ専用の書き込み経路、Version27の方針を維持）。
  // `summarizeStudySessions`は読み取り専用の集計のみのため、Version40で
  // `study_summary_by_date`/`study_summary_by_period`としてMCP Tool化
  // した（ADR 0072）——書き込み経路は増やしていない。

  async recordStudySession(input: RecordStudySessionInput): Promise<RecordStudySessionResult> {
    return this.request('POST', '/api/study-sessions', input);
  }

  async summarizeStudySessions(from: string, to: string): Promise<SummarizeStudySessionsResult> {
    return this.request(
      'GET',
      `/api/study-sessions/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    );
  }

  // Version40（Owner指示`ba6548bc-...`項目2、ADR 0072）：対話（ChatGPT/
  // Claude Code）から直接呼べるStudySessionライフサイクル。上記2つとは
  // 別経路（`/study-sessions/*`）——Study Timerアプリ専用の
  // `/api/study-sessions`は変更しない。

  async startStudySession(input: {
    subject: string;
    task?: string;
    source?: string;
  }): Promise<{ id: string; record: ConnectorInProgressStudySessionRecord }> {
    return this.request('POST', '/study-sessions/start', input);
  }

  async updateStudySession(input: {
    id: string;
    subject?: string;
    task?: string;
  }): Promise<{ id: string; record: ConnectorInProgressStudySessionRecord }> {
    return this.request('POST', '/study-sessions/update', input);
  }

  async finishStudySession(
    id: string,
  ): Promise<{ sessionId: string; duplicate: boolean; durationMs: number; storedAt: string }> {
    return this.request('POST', '/study-sessions/finish', { id });
  }

  async listStudySessions(input: {
    limit: number;
    date?: string;
  }): Promise<{ sessions: ConnectorStudySessionListItem[] }> {
    const params = new URLSearchParams({ limit: String(input.limit) });
    if (input.date) params.set('date', input.date);
    return this.request('GET', `/study-sessions?${params.toString()}`);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (this.config.apiKey) headers.Authorization = `Bearer ${this.config.apiKey}`;

    const res = await fetch(`${this.config.baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const json = (await res.json()) as ApiEnvelope<T>;
    if (!res.ok || !json.ok) {
      throw new Error(json.error ?? `Connector request failed: ${method} ${path} (${res.status})`);
    }
    return json.data as T;
  }
}
