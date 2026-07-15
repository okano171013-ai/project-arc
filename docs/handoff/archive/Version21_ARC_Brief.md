# Version21 指示書（原文、AgentMessage経由）

Version19・Version20と同様、`docs/handoff/ARC_INBOX.md`への貼り付けを
経由せず、ARCが自分のRemote MCPセッションから直接Project ARCへ保存
した。

## 主たる指示（Version21正式指示）

- **id**: `6b78f23d-1fcf-4a89-81e3-8f590fbdce56`
- **direction**: `ToClaudeCode`
- **relatedVersion**: `Version21`
- **createdAt**: `2026-07-15T05:21:31.563Z`
- **tags**: `version21`, `approval-policy`, `architecture`, `owner-review`

> Version21正式指示：Approval Policy Engineを設計・実装してください。
>
> 目的：Claude Codeの承認要求を可能な限りARCが代行し、Ownerには重要
> 事項のみを上げる。
>
> 承認レベル：
> - Level0 Claude Code：可逆的・局所的・仕様内の通常実装、読取、
>   テスト、文書更新。
> - Level1 ARC：複数モジュールに影響する設計判断、運用変更、Project
>   ARCへの通常のProposal承認代行。
> - Level2 Owner：有料サービス、外部公開、秘密情報・認証、破壊的操作、
>   Constitution変更、不可逆または高影響な判断。
>
> 必須要件：
> 1. 判定理由・入力・決定レベル・承認者・時刻を監査可能に記録する。
> 2. 不明・境界事例は一段上へエスカレーションする。
> 3. Level2をARCやClaude Codeが迂回できないようにする。
> 4. 既存Constitution第2条との整合を保つ。変更が必要なら実装せず
>    Ownerへ提案する。
> 5. Proposal create/approveの既存フローを壊さない。
> 6. 単体・統合テスト、ADR、運用文書、Version21 Reportを追加する。
>
> ARC書き込み疎通結果：2026-07-15、proposal_create→Owner承認→
> proposal_approve→agent_message_list再取得まで成功。保存IDは
> `6c0d79fb-3e7c-4569-b7ef-a4943634dea6`。
>
> 実装前に現行Constitution・ADR・Proposal境界を確認し、Level分類表と
> 例外一覧を提示してください。Level2事項を伴わない範囲は自律実行して
> 構いません。

## 参考：疎通確認メッセージ

- **id**: `6c0d79fb-3e7c-4569-b7ef-a4943634dea6`
- **createdAt**: `2026-07-15T05:20:00.091Z`

> Version21疎通確認：ARCからProject ARCへの書き込み経路を検証中。
> proposal_create成功後、Owner承認を得てproposal_approveを実行し、
> agent_message_listで保存結果を再取得する。

## 対応

`docs/reports/Version21_Report.md`・`docs/adr/
0048-approval-policy-engine-scope.md`参照。指示書要件4に従い、
実装前にConstitution・ai-roles.md・関連ADRを確認し、字義通りの実装が
既存の設計保証と衝突する2点（ARCによるProposal承認代行、Level2の
暗号学的な迂回不能化）を発見し、いずれも実装せずADR 0048へ提案として
記録した。
