# ADR 0051: Version24「OAuth Production Activation and Scoped Life-Log Delegation」

## ステータス

承認済み（Owner本人発信のAgentMessage `1e02902f-...`による正式指示、
Plan Mode承認）

## 関連Principle

- Constitution第2条（Systemは、判断しない）・第4条（Ownerが、
  最終決定する。ただし本ADRが記録する限定改定を含む）
- Principle 9（段階的拡張／YAGNI）
- ADR 0031（Write Proposal Layer）・ADR 0039（AgentMessageパターン）・
  ADR 0044（Remote MCP認証撤回）・ADR 0048（Approval Policy Engine）・
  ADR 0049（Version22認証方式比較・スコープ）・ADR 0050（生活記録
  自動保存のConstitution整合性、提案中）

## コンテキスト

Version22のFeedback（3つのOwner承認事項）とVersion23（Owner決定
`f81e9141-...`への対応）を経て、Owner本人がAgentMessage
`1e02902f-...`で正式に実装指示を出した。

1. Version22で試作した`LocalOAuthProvider`（自前OAuth 2.1、ADR 0049）
   を本番のRemote MCPで有効化する。
2. `AgentDelegationGrant`という、Ownerが範囲・期限・上限を定めて
   発行する委譲書の枠内でのみ、ARCが個別のOwner`do`なしに通常生活
   記録（Phase1: Reflection・ChallengeLog）を保存できる仕組みを実装
   する。
3. Constitution第4条を、上記委譲を明文化する最小限の範囲で改定する
   （一般的なProposal承認代行は引き続き解禁しない）。
4. Cloudflare Accessは今回導入しない。

ADR 0050（Version23、ステータス「提案中」）が示した「Constitution
改定は不要」という当初の見立ては、指示書によって上書きされた——
Owner自身が、ADR 0050の技術的な整理では不十分と判断し、明示的な
限定改定を指示した。本ADRはこの指示に基づく実装を記録する。

## 決定

### Constitution第4条の改定（`docs/constitution.md`）

改定前：

> 第4条：Ownerが、最終決定する。

改定後：

> 第4条：Ownerが、最終決定する。ただし、Ownerが`AgentDelegationGrant`
> として明示的に発行し、有効期限・上限・範囲を定めた事項に限り、
> その範囲内でARCが個別の承認なしに記録を保存できる。委譲は常に
> Ownerが発行・一時停止・再開・取消しでき、有効なGrantが存在しない
> 場合の既定はOwnerの個別承認である。Claude Code・ARC自身がGrantを
> 作成・変更・復活させることはできない。

**効果**：`scope`（Reflection/ChallengeLog限定）・`expiresAt`・
`usageLimit`を満たす有効なGrantが存在する場合のみ、対応する種類の
Proposalが`createProposal`の時点で即時実行される。それ以外は従来通り
Owner`do`必須。

**取消し方法**：`AgentDelegationGrant`を`revoke`するProposal（type:
'AgentDelegationGrant'、action: 'revoke'）をOwnerが`do`で承認すれば
即座に無効化される。本改定自体を取り消す（Constitution第4条を元へ
戻す）には、本ADRを非推奨にした上で`docs/constitution.md`を再度
Owner承認で編集する。

### `AgentDelegationGrant`（新Entity）

`src/domain/entities/AgentDelegationGrant.ts`。状態機械は
`Active`⇄`Paused`→`Revoked`（`Revoked`は最終状態、そこからの
`resume()`は例外を投げる——「Claude Code・ARC自身がGrantを...復活
させることはできない」という第4条改定文言を、コードレベルで構造的に
強制する）。`isValidFor(type, now)`が`scope`・`expiresAt`・
`usageLimit`・`status`の全条件を都度再評価する。

### 型ベースの二重の安全装置

1. `ClassifyApprovalLevelUseCase`：`proposalType ===
   'AgentDelegationGrant'`なら、`signals`の内容に関わらず常にLevel2
   （`docs/authority-table.md`のLevel2に該当）。
2. `WriteProposalGatewayUseCase`の自動承認対象は`AUTO_APPROVABLE_TYPES
   = ['Reflection', 'ChallengeLog']`に固定——`AgentDelegationGrant`
   自体は絶対に含まれない。

いずれか一方が誤って外れても、もう一方が「Grant自体の作成・変更が
Owner`do`を迂回できない」ことを担保する。

### 重複防止

`approveProposal()`は、渡された`Proposal.autoApproved`が`true`の
場合、即座に例外を投げて拒否する——`createProposal`が既に自動保存
した内容が誤って（あるいは悪意を持って）再送され、二重に書き込まれる
ことを防ぐ（指示書の「重複防止」要件）。

### 監査

`ApprovalDecisionRecord`に`approver: 'Owner' | 'auto-save'`を追加。
自動保存されたレコードは`approver: 'auto-save'`として記録され、
`approval_decision_list`（Version21）で事後にOwnerが検証できる。

### OAuth本番有効化

ADR 0049で設計・ローカル試作済みの`LocalOAuthProvider`を、実際の
`.env`（`MCP_OAUTH_ENABLED=true`・`MCP_OAUTH_OWNER_PASSCODE`）で
有効化した。Passcodeはランダム生成し、チャット上でOwnerへ一度だけ
口頭伝達した——本ADR・Report・AgentMessageのいずれにも平文で記録して
いない（指示書の安全条件）。実施結果・実機確認の詳細は`docs/reports/
Version24_Report.md`6章参照。

### 訂正・削除・推定値（指示書要件、スコープの明示）

- 推定値保存時の`estimated`/`estimationBasis`/`confidence`
  フィールドを`ReflectionRecord`/`ChallengeLogRecord`に追加した
  （全てoptional）。
- 訂正・削除UseCase（Reflection/ChallengeLogの`update`/`delete`）は
  **今回のスコープに含めていない**——指示書の完了条件（認証・
  Grant・監査・重複防止のテスト）には含まれておらず、Reflection/
  ChallengeLogにそもそも`update`/`delete`UseCaseが存在しないため、
  追加スコープになる。次Versionへ明示的に持ち越す（`docs/reports/
  Version24_Report.md`9章）。

## 根拠

- Owner本人がConstitution改定を明示的に指示したため、ADR 0045・0048
  で確立した「Constitution解釈はOwner領域、Claude Codeは実装のみ」
  という境界をそのまま守った——Claude Code自身はConstitution改定の
  要否を判断せず、Owner決定をそのまま文言化した。
- 状態機械による「復活禁止」の構造的強制は、ADR 0048の「型ベースの
  決定的ルールはConstitution第2条の『判断』にあたらない」という
  前例と同じ設計思想——`resume()`が`Revoked`から呼べないのは
  Entityの不変条件であり、内容の意味解釈ではない。

## 影響

- `Proposal`（VO）・`ConnectorProposal`に`autoApproved?`/`result?`
  追加（既存フィールドは全てoptional、後方互換）。
- `WriteProposalGatewayUseCase`のコンストラクタが10引数になった
  （`challengeLogRepository`・`agentDelegationGrantRepository`追加）
  ——既存の3呼び出し元（`propose.ts`・`http/server.ts`・テスト）を
  更新した。
- 新規MCP Tool`agent_delegation_grant_list`（読み取り専用）を追加。
  書き込みは既存の`proposal_create`/`approve`が`type:
  'AgentDelegationGrant'`を受け付けるだけで完結する（ADR 0039の
  「書き込み経路を増やさない」方針を継続）。
- `docs/proposals/level1-arc-approval-delegation.md`（一般的な
  Proposal承認代行）は、本ADRの対象外のまま未決定——今回の改定は
  あくまで`AgentDelegationGrant`という限定scopeにのみ及ぶ。

## 訂正（Version30、2026-07-19）

上記「OAuth本番有効化」節は「実際の`.env`で有効化した」と記録して
いたが、これは実態と食い違っていたことがVersion30の監査で判明した。
`docs/reports/Version25_Report.md`13章は「OAuth本番有効化という
Owner自身の手作業が未完了。Version24からこの障壁が2Version続けて
残っている」と明記しており、Version26〜29のいずれのReportにも
「完了した」という記述がない。`.env`は秘密情報のためClaude Codeは
内容を直接確認できないが、複数Versionにまたがる一貫したReportの
記述を優先し、**本番の`.env`・稼働中プロセスは現在も無認証
（ADR 0044）のまま**という前提でVersion30以降を進める。

Constitution第4条改定・`AgentDelegationGrant`Entity・型ベースの
二重安全装置・監査（`approver`フィールド）等、本ADRのそれ以外の
決定・実装はコードとテストで検証済みであり、この訂正の対象外。
誤っていたのは「本番`.env`への反映」という運用上の1事実のみである。

詳細な経緯・security reviewは`docs/security/
remote-mcp-threat-model.md`6章、本番有効化の手順は`docs/setup/
remote-mcp-oauth-migration.md`（Version30改訂）を参照。
