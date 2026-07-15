# ADR 0048: Approval Policy Engineのスコープを「構造化signalsの機械的分類」に限定する

## ステータス

承認済み（Owner確認済み、Plan Mode承認）

## 関連Principle

- Constitution第2条（Systemは、判断しない）
- Constitution第4条（Ownerが、最終決定する）
- Principle 9（段階的拡張／YAGNI）
- ADR 0022（CandidateBuilderのパターンマッチング設計）
- ADR 0029（IntentDetectorのパターンマッチング設計）
- ADR 0031（Write Proposal Layerを追加した理由）
- ADR 0039（AgentMessageをProposalパターンで実装した理由）
- ADR 0044（Remote MCP認証撤回）
- ADR 0045（Version19のスコープをガバナンス境界に沿って絞り込む）
- ADR 0046（Collaboration Runner v1のスコープを機械的な検知・通知のみに限定する）

## コンテキスト

ARCからAgentMessage（`6b78f23d-...`、Version21正式指示）が届き、
「Approval Policy Engine」の設計・実装を求めた。目的はClaude Codeの
承認要求を可能な限りARCが代行し、Ownerには重要事項のみを上げること。
Level0（Claude Code）・Level1（ARC）・Level2（Owner）の3段階と、
判定の監査可能な記録、境界事例のエスカレーション、Level2の迂回不能性、
Constitution第2条との整合確認（矛盾するなら実装せず提案のみ）を
必須要件として明示していた。指示書自身が「実装前に現行Constitution・
ADR・Proposal境界を確認し、Level分類表と例外一覧を提示してください」
と求めていたため、着手前にConstitution・ai-roles.md・関連ADRを確認した。

この確認で、指示書を字義通り実装すると既存の設計保証と衝突する箇所を
2点発見した。

1. **「Level1: ARCがProposal承認を代行する」**：ADR 0031は
   `approveProposal()`が「Ownerが`createProposal`の戻り値をそのまま
   再送すること」自体を承認の証とする設計（「Ownerの再送が承認の証」）
   であり、`docs/ai-roles.md`のContinuous Collaborationループも
   「Ownerが『do』で承認（proposal_approve）」を明記している。ARCが
   Level1と分類されたProposalについてOwnerの`do`を待たずに
   `proposal_approve`を呼んでよいことにすると、この保証を一部の
   Proposalについて外すことになる——Constitution第4条に直接影響する
   運用変更である。
2. **「Level2をARCやClaude Codeが迂回できないようにする」の暗号学的
   保証**：ADR 0044でRemote MCPのBearer認証は撤回済みであり、Project
   ARCは現状HTTPリクエストの発信者がOwner本人・ARC・Claude Codeの
   いずれかを技術的に区別できない。真の「迂回不能」を保証するには
   発信者を識別する認証機構が別途必要になるが、これは指示書自身の
   分類表でLevel2（認証変更）に該当し、Version21の中で自己参照的に
   実装することはできない。

指示書要件4「既存Constitution第2条との整合を保つ。変更が必要なら
実装せずOwnerへ提案する」に従い、この2点は実装しないことをPlan Mode
で提案し、Owner承認を得た。

## 決定

### 実装する：構造化signalsによる機械的分類 + サーバー側再計算 + 監査ログ

`ApprovalSignals`（`costImpact`・`externalExposureChange`・
`authOrSecretChange`・`destructive`・`personalDataExternalTransfer`・
`constitutionOrPrincipleChange`の6つのboolean、Owner指示書が列挙した
6カテゴリにそのまま対応）という構造化フラグのみを入力とする
`ClassifyApprovalLevelUseCase`を実装した。

- いずれか1つでもtrueならLevel2。
- `signals`が省略された場合は境界事例としてLevel1へエスカレーション
  （指示書要件2）。
- 明示的にsignalsが渡され全てfalse/未設定ならLevel0。

`target`/`reason`等の自由記述テキストの意味を解釈することは一切
しない——`ADR 0022`（CandidateBuilder）・`ADR 0029`（IntentDetector）が
確立した「決定的なパターンマッチングはConstitution第2条の『判断』に
あたらない」という前例をそのまま踏襲し、構造化フラグのlookupのみに
留めている。

`WriteProposalGatewayUseCase`の`createProposal`/`approveProposal`/
`rejectProposal`はこの分類結果を`ApprovalDecision`（新Entity、
`AgentMessage`と同型の追記のみの監査ログ）として毎回記録する
（指示書要件1）。ただし**分類結果によって実行を止める分岐は追加
しない**——既存の「Ownerが`createProposal`の戻り値を再送することが
承認の証」という制約（ADR 0031）はそのまま維持され、Levelは
可視化・記録のみに留まる。

`approveProposal`/`rejectProposal`は、渡された`Proposal.approvalLevel`
（表示用フィールド）を信用せず、`Proposal.signals`から必ずサーバー側で
再計算する。クライアントが表示用フィールドだけを書き換えて再送しても、
監査ログには常に本当のLevelが記録される（迂回の実行コストを上げ、
発覚可能にする設計）。

### 実装しない：ARCによる承認代行、Level2の暗号学的な迂回不能化

上記コンテキストの2点は実装せず、別Versionの検討事項として本ADRに
記録するに留める。

## 根拠

- Constitution第2条・第4条、`docs/ai-roles.md`の責務分担は最上位
  ドキュメントであり、ARCからの個別の指示書がこれと矛盾するように
  読める場合は上位文書を優先する（`CLAUDE.md`「判断に迷ったら
  `docs/constitution.md`→`docs/principles.md`の順に立ち返る」、
  ADR 0045と同じ判断パターン）。
- signalsを自己申告制にする設計は、真の意味でのセキュリティ境界には
  ならない（虚偽のsignals宣言を技術的に防げない）。しかし
  ADR 0031の`payloadSchemas`によるzod構造検証も「内容が正しいか」は
  検証しない構造チェックに留まる、という既存の設計思想と一貫している
  ——本Engineは「規律付け・可視化・事後監査」のためのものであり、
  「攻撃者からの防御」のためのものではないと明確に位置づける。
- Principle 9（YAGNI）：ARCによる承認代行やLevel2の暗号学的保証は、
  それぞれ単独で大きな設計判断（Owner承認フローの変更、認証機構の
  再導入）を要する。今回のVersionでこれらを機械的分類機能と抱き合わせで
  実装すると、スコープが肥大化し、Owner確認すべき論点が埋もれる。

## 影響

- `Proposal`（Value Object）・`ConnectorProposal`に`signals?`・
  `approvalLevel?`が追加されたが、いずれも省略可能なため既存の
  呼び出し元（CLI・HTTP・MCP）は無変更で動作する。
- `WriteProposalGatewayUseCase.createProposal()`/`rejectProposal()`が
  同期からPromiseを返す非同期メソッドへ変更された（ApprovalDecisionの
  永続化を待つため）。呼び出し元3箇所（`propose.ts`・`http/server.ts`・
  テスト）を`await`するよう更新した。
- 新規MCP Tool `approval_decision_list`（読み取り専用）・新規HTTP
  ルート`GET /approval-decisions`を追加した。`agent_message_list`と
  同型であり、書き込み専用の新規ツールは追加していない
  （`proposal_create`が`signals`を受け付けるだけで完結する、
  ADR 0039と同じ「書き込み経路を増やさない」方針）。
- 今後、以下2点についてOwnerの判断を仰ぐ余地がある。
  1. ARCによるProposal承認代行を、`do`不要の運用として正式に許可
     するかどうか（Constitution第4条に関わる判断）。
  2. Level2の迂回不能性を暗号学的に保証するため、Remote MCPへ
     認証（ADR 0044で撤回したBearer認証、または別方式）を再導入
     するかどうか。
