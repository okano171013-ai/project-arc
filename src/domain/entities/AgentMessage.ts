/**
 * AgentMessage（Version17、Agent Collaboration Layer）
 *
 * ARC（ChatGPT）とClaude Codeの間で交わされる指示書・Feedbackを、
 * これまでの`docs/handoff/`配下のファイルベース運用に加えて、
 * Project ARC自身のデータとして保存するためのEntity。MCP Tool経由で
 * ARCが過去のやり取りを直接読み取れるようにすることが目的
 * （ADR 0039）。
 *
 * ManagementFeedback（Version14）と異なり、resolution状態機械は
 * 持たない——単純な往復記録として十分であり、状態遷移の要求は
 * 指示書に含まれていない（YAGNI）。
 */

export type AgentMessageDirection = 'ToClaudeCode' | 'ToARC';

export interface AgentMessageRecord {
  readonly direction: AgentMessageDirection;
  readonly content: string;
  /** 関連するVersion（例: "Version17"）。任意。 */
  readonly relatedVersion?: string;
  readonly tags?: string[];
}

export class AgentMessage {
  private constructor(
    private readonly _id: string,
    private readonly _record: AgentMessageRecord,
    private readonly _createdAt: Date,
  ) {}

  static create(params: { id: string; record: AgentMessageRecord; createdAt?: Date }): AgentMessage {
    if (params.record.content.trim().length === 0) {
      throw new Error('content must not be empty');
    }
    return new AgentMessage(
      params.id,
      { ...params.record, tags: params.record.tags ?? [] },
      params.createdAt ?? new Date(),
    );
  }

  static restore(params: { id: string; record: AgentMessageRecord; createdAt: Date }): AgentMessage {
    return new AgentMessage(params.id, { ...params.record, tags: params.record.tags ?? [] }, params.createdAt);
  }

  get id(): string {
    return this._id;
  }

  get record(): AgentMessageRecord {
    return this._record;
  }

  get createdAt(): Date {
    return this._createdAt;
  }
}
