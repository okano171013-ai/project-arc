# ADR 0061: AgentTask State Machine, Lease and Branch Ownership

## ステータス

Proposed（Version32、設計のみ。実装は次の実装Versionで着手）

## 関連Principle

- Constitution第2条（Systemは、判断しない）
- Principle 8（長期保守性）・Principle 9（段階的拡張／YAGNI）
- ADR 0039（AgentMessageパターン）・ADR 0040（AgentTask Artifact、
  見送り済み——本ADRが正式に実装へ進める）・ADR 0060（DevelopmentGrant）

## コンテキスト

`docs/project-management/OWNER_PRIORITY_PROGRAMS_2026-07-19.md`は
AgentTaskの状態機械を`Proposed → Ready → Claimed → InProgress →
Review → ChangesRequested → Accepted → Closed`と指定し、taskには
Version・受入条件・関連ADR・許可範囲・branch/worktree・commit・
test結果・lease期限・retry回数を保持することを求めた。

同一branchへの複数Agent書き込み衝突は、Version30で実際に発生した
運用上の問題であり（`docs/project-management/
CODEX_FAILURE_REVIEW_2026-07-19.md`・
`docs/project-management/CODEX_RECOVERY_PLAN.md`）、そのときは
「Owner経由で口頭調整し、Codexが書き込みを停止する」という手動運用で
対処した。本ADRは、この手動運用をAgentTaskの状態機械として構造化し、
機械的に強制できるようにする。

## 決定

### 状態機械

```
Proposed → Ready → Claimed → InProgress → Review → ChangesRequested → Accepted → Closed
                                  ↑______________________|
                                  （ChangesRequestedからInProgressへ戻れる）
```

`AgentDelegationGrant`（ADR 0051）と同じ「型で不正遷移を拒否する」
設計を踏襲し、`LEGAL_TRANSITIONS`テーブルで許可された遷移のみを
コード上受け付ける。`Closed`は最終状態。

### AgentTaskが保持するフィールド

```ts
interface AgentTaskRecord {
  readonly relatedVersion: string;       // 例: "Version32"
  readonly title: string;
  readonly acceptanceCriteria: string[];
  readonly relatedAdrIds: string[];      // 例: ["0060", "0061"]
  readonly allowedScope: {               // DevelopmentGrantのscopeの部分集合であること
    readonly repository: string;
    readonly branch: string;             // 1 task 1 branch
  };
  readonly developmentGrantId: string;   // ADR 0060参照
}

interface AgentTaskState {
  status: AgentTaskStatus;
  claimedBy?: string;          // Agent識別子（例: "claude-code-session-xxx"）
  leaseExpiresAt?: string;     // ISO8601、heartbeatで更新
  retryCount: number;
  commits: string[];           // このtaskで積まれたcommit hash
  testResult?: { passed: boolean; summary: string };
}
```

### Lease（branch ownershipの機械的強制）

- `claim(agentId)`：`Ready`状態のtaskのみclaimでき、`leaseExpiresAt`が
  設定される（既定30分、要heartbeat更新）。同時に2つのAgentが同じ
  taskをclaimしようとした場合、後者は拒否される（`Claimed`以降の
  状態にあるtaskへの再claimはエラー）。
- **1 branch 1 writer**：`allowedScope.branch`が既に別のActive
  （`Claimed`〜`ChangesRequested`）なtaskにひも付いている場合、新しい
  taskは同じbranchをclaimできない——Version30で手動運用した
  「Codexが書き込みを停止する」を、機械的な拒否として強制する。
- **lease失効**：`leaseExpiresAt`を過ぎてもheartbeatが更新されない
  場合、taskは自動的に`Ready`へ差し戻され、他のAgentがclaimできる
  ようになる（プロセスクラッシュ等でclaimしたまま応答しなくなった
  Agentが、branchを永久にロックし続けることを防ぐ）。
- **未commit差分があるworkspaceの再利用禁止**：lease失効時、
  対象branchに未push・未commitの差分が残っている可能性がある場合、
  次のclaimは`git status`相当の確認を経てから開始する
  （`docs/governance/DEVELOPMENT_RULES.md`「未コミット差分を上書き
  しない」の機械的裏付け）。

### Retry・circuit breaker

- 同一taskが`ChangesRequested`→`InProgress`を3回繰り返しても
  `Accepted`に到達しない場合、`retryCount`が3に達し、自動的に
  `Closed`（`ChangesRequested`のまま停止）とし、ARC Review Brokerへ
  即時通知する——無限retryを防ぐ（Owner Priority Programs
  「AUT-004」）。

### Artifact（ADR 0040の再検討）

ADR 0040は「AgentTask Artifact」の実装を見送った（当時は具体的な
必要性がなかったため）。本ADRはAgentTaskの状態機械を実際に実装する
ため、ADR 0040の見送り判断を撤回し、AgentTask Entityとして正式に
進める。

## 根拠

- 状態機械による強制は、`AgentDelegationGrant`（ADR 0051）・
  `CheckIn`/`DistractionSignal`/`Intervention`（Version26）で確立
  済みの設計パターンであり、新しい概念を持ち込まない。
- Lease機構は、複数Agent（Claude Code・Codex）が同一repositoryを
  扱うという、Version30で実際に発生した運用上のリスクへの直接対応
  であり、投機的な先取りではない（Principle 9のYAGNIに反しない
  ——実際に一度問題が起きた領域への対応）。
- Circuit breakerを型レベルで固定回数（3回）にすることで、
  「暴走したAgentが無限にretryし続ける」というOwner Priority
  Programsが明示的に懸念した事態（AUT-004）を、運用ルールではなく
  コードで防ぐ。

## 影響

- 新規Entity：`AgentTask`（実装は次の実装Versionで）
- `docs/project-management/CODEX_RECOVERY_PLAN.md`の手動手順
  （3章・4章）は、AgentTask実装後は機械的なlease拒否に置き換わる
  想定——ただし手動運用のドキュメント自体は、AgentTask未実装の
  期間・障害時のfallbackとして保持する
- MCP Tool（`agent_task_list`等、読み取り専用）は、ADR 0038
  「MCP Toolは薄いアダプタ」の方針を踏襲し、既存UseCaseへの委譲
  のみとする

## Owner確認が必要な事項（本ADRのスコープ外）

- 実装着手そのもの（ADR 0060のDevelopmentGrant初回発行と合わせて、
  Program A基盤工程として次の実装Versionで着手する）
