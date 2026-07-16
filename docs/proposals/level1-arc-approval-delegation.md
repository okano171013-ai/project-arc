# 提案（未実装）：Level1委譲——ARCへのProposal承認代行の正式委譲

**ステータス**：提案のみ。実装していない。Owner・ARCの判断待ち
（AgentMessage `e5728efb-...`要件1への対応、ADR 0049参照）。

このドキュメントは、Version21で見送った「ARCがOwnerの`do`なしに
`proposal_approve`を実行してよい」という運用変更を、実装せずに
設計として提示するものである。採否はOwnerが決める（Constitution
第4条・第2条、ADR 0045と同じ「上位文書の改定はOwner領域」という
原則）。

## 1. なぜ委譲が必要になりうるか

Continuous Collaborationループ（`docs/ai-roles.md`）は、ARCが起案した
`AgentMessage`/`ManagementFeedback`系のProposalであっても、Ownerが
実際にセッションを開いて`do`と入力するまで一切保存されない。これは
Constitution第4条を最も厳格に守る設計だが、裏を返せば「Ownerが
数日間セッションを開かなければ、ARCの提案は宙に浮いたまま」という
運用上の摩擦を生む。ARCからの指示書（Version19〜22）は一貫して
「コピペ・確認の手間を減らす」ことを目標に掲げてきており、
低リスクなProposal（例：ARC自身の振り返りメモの保存）についてまで
毎回Owner本人の`do`を要求することが、その目標と緊張関係にある。

## 2. 現行維持案（比較対象、デフォルト）

- 全Proposalが、`type`を問わずOwnerの`do`（`createProposal`の戻り値の
  実際の再送）でのみ`approveProposal`される。
- 変更コスト：ゼロ（既存のまま）。
- リスク：ゼロ（Constitution第4条を最も厳格に守る）。
- 摩擦：Ownerがセッションを開かない限りARCの提案が保存されない。

## 3. 委譲案：`AgentDelegationGrant`（新Entity、未実装）

Ownerが明示的に発行する「委譲書」をEntityとして表現する。

```typescript
interface AgentDelegationGrantRecord {
  readonly grantedTo: 'ARC'; // 将来他エージェントに広げる余地はあるが、今回はARC限定
  readonly scope: ProposalType[]; // 例: ['AgentMessage'] のみ、Reflection等は含めない
  readonly expiresAt: string; // ISO8601、必須。無期限は発行できない
  readonly usageLimit: number; // この委譲書で承認できる最大件数
  readonly usageCount: number; // 消費済み件数（0スタート、上限到達で自動失効）
  readonly revokedAt?: string; // Ownerがいつでも即時失効させられる
  readonly reason: string; // なぜこの委譲を発行するのか（Owner記述）
}
```

**default-deny**：`AgentDelegationGrant`が存在しない・期限切れ・
`usageLimit`到達・`revokedAt`設定済みのいずれかに該当する場合、
`approveProposal`はARC発の呼び出しを拒否する（現行と同じ、Owner`do`
必須に自動的にフォールバックする）。「委譲書がない状態」が既定であり、
委譲は常に例外的・時限的な許可でなければならない。

### 3.1 発行・失効フロー（案）

1. Ownerが`AgentDelegationGrant`を作成する（Proposal経由、Owner本人の
   `do`で承認——委譲書自体の発行はLevel2操作として扱う）。
2. ARCが`proposal_approve`を呼ぶ際、対象の`ProposalType`が有効な
   `AgentDelegationGrant.scope`に含まれ、`usageCount < usageLimit`
   かつ未失効・未期限切れであれば、Owner`do`を経由せず実行される。
3. 実行のたびに`usageCount`をインクリメントし、`ApprovalDecision`
   （Version21）に「委譲経由で承認された」ことを明記する
   （`approver: 'ARC (delegated via grant <id>)'`相当のフィールド
   追加が必要）。
4. Ownerはいつでも`revokedAt`を設定して即時失効させられる（Proposal
   経由、Owner`do`必須）。

### 3.2 監査

`AgentDelegationGrant`自体と、それを使った各`approveProposal`呼び出し
は、既存の`ApprovalDecision`監査ログ（Version21）に記録される。
「誰が」「どの委譲書で」「いつ」承認したかを事後にOwnerが検証できる
——ADR 0048の「迂回を難しくする・迂回を検出可能にする」という設計
思想をそのまま継承する。

## 4. Constitution第4条 改定文言案（未採択）

現行：

> 第4条：Ownerが、最終決定する。

改定案（採否未定、参考として提示のみ）：

> 第4条：Ownerが、最終決定する。ただし、Ownerが期限・上限・範囲を
> 明示して委譲した事項に限り、委譲された主体が定められた範囲内で
> 決定を代行できる。委譲は常にOwnerが発行・失効させる権限を保持し、
> 委譲が存在しない場合の既定は「Ownerの決定」である。

この改定は、第4条の原則（Ownerが最終決定する）を変えるものではなく、
「委譲」という限定的な例外を明文化するものと位置づけられる——ただし
Constitution本文の変更である以上、Owner自身の判断が必須であり、
Claude Code・ARCのいずれも単独で採否を決められない（ADR 0045と同じ
境界）。

## 5. 比較表

| | 現行維持（Owner`do`必須） | 委譲導入（`AgentDelegationGrant`） |
|---|---|---|
| Constitution変更 | 不要 | 必要（第4条、上記4章） |
| 実装コスト | ゼロ | 新Entity・UseCase・Repository・監査ログ拡張（1 Version相当） |
| Ownerの手間 | 全Proposalで`do` | 委譲書発行時のみ`do`、以後は`scope`内で自動化 |
| リスク | 最小 | `scope`/`usageLimit`/`expiresAt`の設計ミスがあれば委譲範囲が意図せず広がる可能性 |
| 監査可能性 | 高い（毎回Owner関与） | 高い（`ApprovalDecision`に委譲経由である旨を記録する設計とする前提） |

## 6. 推奨

本ドキュメントは中立的な比較を目的とし、Claude Codeとしての推奨は
「まず現行維持を継続し、Collaboration Runner（Version20）の運用実績
（ADR 0046で保留された『AI推論を伴う下書き生成』の要否判断）と
合わせて、実際に摩擦が顕在化してから委譲導入を検討する」という
Principle 9（YAGNI）に沿った段階的判断を提案する。ただし最終判断は
Owner・ARCに委ねる。
