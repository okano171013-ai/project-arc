# ADR 0060: Autonomous Development Authority and DevelopmentGrant

## ステータス

Proposed（Version32、設計のみ。実装はADR 0061以降と合わせて着手）

## 関連Principle

- Constitution第2条（Systemは、判断しない）・第4条（Ownerが、最終決定する）
- Principle 9（段階的拡張／YAGNI）
- ADR 0031（Write Proposal Layer）・ADR 0048（Approval Policy Engine）・
  ADR 0051（AgentDelegationGrant、Constitution第4条限定改定の前例）

## コンテキスト

`docs/project-management/OWNER_PRIORITY_PROGRAMS_2026-07-19.md`
Program Aは「Ownerが目的と制約を一度設定すれば、通常作業のたびに
Owner `do`を求めずにARC・Claude Codeが開発を継続できる」環境を求めた。
既存の`AgentDelegationGrant`（ADR 0051）は生活記録（Reflection・
MealLog等）の自動保存専用に設計されており、Program Aの要求
（開発task——設計・実装・test・commit——の継続許可）とは対象が
根本的に異なる。Owner指示文書自身が「既存`AgentDelegationGrant`を
無理に流用せず、開発作業専用の委譲モデルをADRで検討する」ことを
明示している。

## 決定

### DevelopmentGrant（新Entity、`AgentDelegationGrant`とは別モデル）

Ownerが最初に1回発行する。`AgentDelegationGrant`と同じ状態機械の型
（`Active`⇄`Paused`→`Revoked`、`Revoked`からの`resume()`禁止）を
踏襲するが、フィールドは開発task向けに再設計する。

```ts
interface DevelopmentGrantRecord {
  readonly scope: {
    readonly repositories: string[]; // 対象repository（今はproject-arcのみ想定）
    readonly branchPrefix: string;   // 例: "auto/" — このprefix配下のbranchのみ対象
  };
  readonly maxVersionCount: number;  // このGrantで消化できる最大Version数
  readonly costCeiling: 0;           // Version32時点では常に0固定——有料利用はGrantの対象外
  readonly forbiddenOperations: readonly [
    'production-deploy', 'secret-write', 'external-exposure-change',
    'destructive-delete', 'constitution-change', 'principle-change',
  ];
  readonly reason: string;
}
```

- `costCeiling`は型レベルで`0`のみを許容する——「予算upperを設定して
  有料利用を許可する」という将来の拡張はADR 0062（Cloud Provider）
  確定後、本ADRを改訂して初めて解禁する。Version32時点でDevelopmentGrant
  経由の有料操作は一切発生しない。
- `forbiddenOperations`はOwner Priority Programsの「必ずOwnerへ上げる
  範囲」をそのままコード化した固定リテラル配列——Grant発行時に
  Ownerが個別に選ぶ項目ではなく、常に全項目が禁止される
  （ADR 0051の`AUTO_APPROVABLE_TYPES`が固定リストである設計と同じ
  「型で強制する」パターン）。
- Grant自体の作成・変更・再開はLevel2（Owner専権）のまま——
  `AgentDelegationGrant`と同じ境界。

### ARC Review Broker（Level1、新しい承認主体）

既存のApproval Policy Engine（ADR 0048）はLevel0（Claude Code）/
Level1（ARC）/Level2（Owner）を、呼び出し側が申告する`signals`から
機械的に分類する。DevelopmentGrant配下のAgentTask（ADR 0061）が
Review段階に達したとき、ARCが受入条件・test evidence・diff summary・
security/data影響を確認し、**通常作業のみ**Level1として継続を許可
できる。

**ARCが承認できないこと（型で強制、ADR 0048と同じ二重の安全装置）**：
`forbiddenOperations`のいずれかに該当する変更を含むtaskは、
`ClassifyApprovalLevelUseCase`が常にLevel2へ分類する——ARCの判断に
委ねず、DevelopmentGrantのスコープチェックとApproval Policy Engineの
両方が独立に同じ結論に達する設計とする（ADR 0051の「型ベースの
二重の安全装置」を踏襲）。

### Claude Worker（実装主体）

ADR 0061のAgentTaskをclaimしたClaude Codeセッションが実装する。
承認待ちで停止した場合、**Owner自身にではなくARC Review Brokerへ
質問を返す**——Level2に該当すると判定された場合のみOwnerへ到達する。
これはOwner Priority Programsの「Ownerの確認回数を減らしても、
重要事項を隠さない」という要求を、質問の宛先という形で構造化した
ものである。

## 根拠

- 既存の`AgentDelegationGrant`を流用せず別モデルにする判断は、
  「性質の異なる記録を無理に統合しない」という本プロジェクトで
  繰り返し確立してきた境界の型（ADR 0005・0006・0009・0011、
  `docs/HISTORY.md`2章）を、生活記録から開発task管理という新しい
  領域へ一貫して適用したものである。
- `costCeiling`を型レベルで`0`固定にすることで、「Grant発行時に
  誤って有料枠を設定してしまう」という運用ミスをコードレベルで
  構造的に防ぐ——Constitution第4条・DEVELOPMENT_RULES.mdの
  「費用はOwner確認」という境界を、ADR 0051と同じ「型で強制する」
  パターンで担保する。
- ARCをLevel1承認主体として正式化することは、Version21（ADR 0048）
  時点で「Level1: ARCがOwnerの`do`なしにProposal承認を代行してよい」
  という提案をConstitution第4条・ADR 0031との衝突を理由に見送った
  判断（ADR 0048）と矛盾しないか、という点を検討した。結論：矛盾
  しない——ADR 0048が見送ったのは「生活記録Proposalの承認代行」
  であり、本ADRが許可するのは「開発taskの継続可否判断」という
  別種の権限であり、生活データへの書き込み自体は引き続きWrite
  Proposal Layer・AgentDelegationGrantの既存境界に従う。

## Owner確認が必要な事項（本ADRのスコープ外）

- DevelopmentGrantの初回発行（scope・maxVersionCount・reasonの決定）
- `costCeiling`を0より大きくする将来の改訂（ADR 0062確定後に再検討）

## 影響

- 新規Entity：`DevelopmentGrant`（実装はADR 0061と合わせてVersion32で）
- 既存の`AgentDelegationGrant`・Write Proposal Layer・Approval Policy
  Engineは無変更
- 本ADRは設計のみ。DevelopmentGrantの実装・Repository・MCP Toolは
  ADR 0061のAgentTaskと合わせて次の実装Versionで行う
