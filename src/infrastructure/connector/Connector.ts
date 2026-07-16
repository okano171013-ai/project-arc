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
  | 'AgentDelegationGrant';

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

  async approveProposal(proposal: ConnectorProposal): Promise<{ type: string; result: unknown }> {
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
