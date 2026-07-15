# Approval Policy Engineの使い方（Version21）

ARC/Claude CodeがProposal（`proposal_create`/`proposal_approve`/
`proposal_reject`）を扱う際、承認レベル（Level0/1/2）を機械的に
分類し、監査ログとして記録する仕組み。詳細な設計判断はADR 0048、
Constitution/ai-roles.mdとの関係は`docs/ai-roles.md`の「Approval
Policy Engine（Version21〜）」節を参照。

## 1. signalsの宣言方法

`proposal_create`（MCP Tool）・`POST /proposal/create`（HTTP）の
引数に、任意で`signals`を渡す。

```json
{
  "type": "Memory",
  "target": "...",
  "payload": { "record": { "...": "..." } },
  "reason": "...",
  "signals": {
    "costImpact": false,
    "externalExposureChange": false,
    "authOrSecretChange": false,
    "destructive": false,
    "personalDataExternalTransfer": false,
    "constitutionOrPrincipleChange": false
  }
}
```

6つのフラグはすべて任意のboolean。**1つでもtrueならLevel2**になる。
`signals`自体を省略すると、境界事例として安全側のLevel1へ
エスカレーションされる。全フラグを明示的にfalse（またはsignalsを
空オブジェクト`{}`で渡す）にした場合のみLevel0になる。

戻り値の`proposal.approvalLevel`にその場で計算されたLevelが入る
（`承認そのものは何も変えない`——表示・監査のための情報）。

## 2. Level2の6例外（Owner指示書が列挙したカテゴリ）

| signalフラグ | 該当条件 |
|---|---|
| `costImpact` | 有料サービス・課金・契約 |
| `externalExposureChange` | 外部公開範囲の拡大 |
| `authOrSecretChange` | 認証方式・秘密情報・APIキーの変更 |
| `destructive` | 破壊的操作（不可逆な削除等） |
| `personalDataExternalTransfer` | 個人情報の外部送信 |
| `constitutionOrPrincipleChange` | Constitution/Principlesの変更 |

## 3. 監査ログの見方

`approval_decision_list`（MCP Tool）・`GET /approval-decisions`
（HTTP、`?level=Level2`で絞り込み可）で、`ApprovalDecision`の一覧を
新しい順に取得できる。1件のProposalに対し、`stage`が`Proposed`
（create時）・`Approved`（approve成功時）・`Rejected`（reject時）の
最大2件が記録される（Proposed + Approved、またはProposed +
Rejected）。

`level`は`approveProposal`/`rejectProposal`の時点で`signals`から
**サーバー側が再計算**した値であり、クライアントが返された
`approvalLevel`を書き換えて再送しても無視される（迂回対策、ただし
`signals`自体を偽って宣言することは技術的には防げない——ADR 0048
「実装しないと判断した2点」参照）。

## 4. 既知の限界（実装していないこと）

- **ARCによるProposal承認代行はしない**：Level1に分類された
  Proposalであっても、Ownerが`createProposal`の戻り値を実際に
  再送する（`do`）まで`approveProposal`は実行されない。これは
  Version21で変更していない。
- **Level2の迂回を暗号学的に防ぐ仕組みはない**：Remote MCPは
  ADR 0044により無認証のため、Project ARCはリクエストの発信者が
  Owner本人かARC/Claude Codeかを技術的に区別できない。`signals`の
  自己申告を偽ることは、現状の実装では技術的に防げない——監査ログに
  残るため事後に発覚可能、という設計に留まる。
