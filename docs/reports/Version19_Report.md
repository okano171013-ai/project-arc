# Version19 Report: Continuous Collaboration

**コミットハッシュ**：`af2bac6`（`feature/v4-v6-smart-capture`ブランチ）

`docs/reports/TEMPLATE.md`の14章構成に準拠。

## 1. Version概要

**テーマ**：Continuous Collaboration — Version18完了・Owner実機接続
確認（ChatGPT⇄Project ARC接続成功、ADR 0044）を受け、ARC自身が
初めてコピペを介さずProject ARCへ直接書き込みを行った当日に届いた
指示書に基づく。

指示書は、`docs/handoff/ARC_INBOX.md`への貼り付けを経由せず、ARCが
自分のRemote MCPセッションから`AgentMessage`（id `b0adb087-...`、
direction: ToClaudeCode、relatedVersion: "Version19"）として直接
Project ARCへ保存した——このプロジェクトで初めての事例（原文は
`docs/handoff/archive/Version19_ARC_Brief.md`に保管）。

本文：

> Version19ではContinuous Collaborationを実装してください。Project
> ARCを協調基盤とし、ManagementFeedbackを読み取って分析し、Claude
> Code向け指示書をAgentMessage Proposalとして生成・承認・保存できる
> 一連の運用を完成させてください。日次レビュー→指示書→実装→
> Feedback→次回レビューの閉ループを構築し、Ownerの操作は原則
> 『do』による承認のみで進められる設計を目指してください。

## 2. 今回実装した機能（理由も含めて説明）

### スコープの絞り込み（最重要の判断、ADR 0045）

指示書の「ManagementFeedbackを読み取って分析し...生成」を文字通り
実装すると、Project ARC（System）自身がFeedbackを解釈・判断する
機能になり、`docs/constitution.md`第2条「Systemは、判断しない」・
`docs/ai-roles.md`（Systemの意思決定範囲は一切なし）に直接抵触する。
`docs/reports/Version18_Report.md`が既に「AI推論・ManagementFeedback
自動生成」をVersion18の対象外として明示していた経緯もあり、今回も
その境界を踏襲した。「分析・生成」はARC自身が自分のセッションで
行う（今回既に実例あり）ものと解釈し、Project ARC側にはその運用を
支えるインフラのみを実装した。

### CLAUDE.mdのセッション開始チェック補完

`セッション開始時に必ず確認すること`に、`agent_message_list`
（`direction: "ToClaudeCode"`）の確認ステップを追加した。今回の
指示書自体が`ARC_INBOX.md`を経由せず届いた実例を踏まえた対応。

### `docs/handoff/README.md`の更新

ファイルベース経路（経路A、Version1〜18で確立）とライブ経路
（経路B、Remote MCP、Version18〜）が併存している現状と、両者の
使い分けを明記した。

### トレーサビリティ規約（`docs/ai-roles.md`）

ManagementFeedbackとそれに応答するAgentMessageを紐付ける手段が
なかったため、新規スキーマフィールドは追加せず、既存の
`tags?: string[]`を再利用する`mf:<ManagementFeedbackのid>`規約を
定義した（Principle 9のYAGNI）。

### クローズドループの実演

今回のセッション自体が実演になった。

1. ARCがManagementFeedback（`257338da-...`）とAgentMessage
   （`b0adb087-...`、指示書）を自分のセッションから直接保存
2. Claude CodeがOwnerの依頼を受けてManagementFeedbackのProposalを
   作成してしまい、ARCが既に保存済みと知らず重複が発生
   （`e002f51a-...`）——Owner確認の上Rejectedへ
3. Claude Codeが指示書を読み、実装（本Version）
4. Owner確認（`do`）を経て、`257338da-...`をOpen→Accepted→
   Implementedへ遷移
5. Claude CodeがAgentMessage（`direction: "ToARC"`、id
   `795c971a-...`）で完了報告をProject ARCへ保存

## 3. 実装しなかった機能（延期理由も記載）

- **ManagementFeedbackの自動分析・自動生成**：Constitution第2条・
  ai-roles.mdに抵触するため実装しない（ADR 0045）。ARC自身が担う。
- **日次レビューの自動実行（スケジューラ/cron）**：指示書に明示的な
  要求はなく、YAGNIにより見送った。
- **resolution遷移のコード上の権限制御**（誰が呼べるか）：Remote
  MCPが無認証（ADR 0044）である以上、技術的な呼び出し制限は不可能。
  「resolutionの遷移はOwnerの判断を記録するだけ」という運用規律
  （ドキュメント）でカバーする方針とした。

## 4. Architecture Review

新規Entity・UseCase・Repository・スキーマフィールドは一切追加して
いない。変更はすべてドキュメント（`CLAUDE.md`・`docs/handoff/
README.md`・`docs/ai-roles.md`・`docs/handoff/ARC_INBOX.md`・
`docs/handoff/archive/Version19_ARC_Brief.md`）と、既存のWrite
Proposal Layer・MCP toolの呼び出しシーケンス（`proposal_create`→
`proposal_approve`、`management_feedback_resolve`）のみ。

## 5. ADR（追加・変更したADR、追加しなかった理由）

- **ADR 0045**: Version19「Continuous Collaboration」のスコープを
  ガバナンス境界に沿って絞り込む理由（Constitution第2条・第3条、
  ai-roles.md、Version18_Reportの既存除外リストとの整合性）

## 6. テスト（件数、カバレッジ、typecheck、lint、実機確認）

- `pnpm test`：**250件**全て緑（Version18完了時点から変化なし——
  新規コードなし）
- `pnpm typecheck`：エラーゼロ
- `pnpm lint`：エラーゼロ
- **実機確認**：本Version自体が実機確認を兼ねる。実際にMCP tool
  （`management_feedback_resolve`・`proposal_create`・
  `proposal_approve`・`management_feedback_list`・
  `agent_message_list`）を呼び出し、ManagementFeedbackの重複解消・
  resolution遷移（Open→Accepted→Implemented）・AgentMessageでの
  完了報告保存が実際に機能することを確認した。

## 7. 修正したバグ（検出方法、原因、対応方法、再発防止）

このVersionでコードのバグは発見・修正していない（コード変更なし）。
ただし運用上の問題を1件発見・対応した。

### 運用上の問題：ManagementFeedbackの重複作成

- **検出方法**：Owner確認前に`management_feedback_list`を呼んだ
  ところ、同内容のManagementFeedbackが2件（`257338da-...`・
  `e002f51a-...`）存在することが判明した。
- **原因**：ARCが既に自分のRemote MCPセッションから当該Feedbackを
  保存済みだったが、Claude CodeはOwnerからの依頼内容だけを見て
  「まだ保存されていない」と判断し、同じ内容をもう一度作成して
  しまった。
- **対応方法**：Owner確認の上、後から作成した方（`e002f51a-...`）を
  `Rejected`に遷移した。
- **再発防止**：`docs/handoff/README.md`・`CLAUDE.md`に「書き込む前に
  必ず`management_feedback_list`/`agent_message_list`で最新状態を
  確認する」という手順を明記した。ライブ経路が機能するようになった
  ことで初めて起こりうる種類の問題であり、今後も同様の確認を徹底する。

## 8. 技術的負債（今後改善したい点）

- **resolution遷移の権限はドキュメントのみで担保**：Remote MCPが
  無認証（ADR 0044）である以上、「誰がresolutionを遷移させて良いか」
  はコードで強制できない。将来、ARCが誤って（または意図的に）
  Owner確認なしにresolutionを遷移させるリスクはゼロではない
  ——Owner側の定期的な監査（`management_feedback_list`での確認）に
  依存している。
- **タグ規約はSystemによる検証なし**：`mf:<id>`規約はドキュメントの
  取り決めのみで、System側でのバリデーション（存在しないIDを
  指していないか等）は行っていない——意図的（Systemは解釈しない）。

## 9. 次Versionへの申し送り（技術的観点から推奨する事項）

- Owner・ARCが実際にこのループ（ManagementFeedback→AgentMessage
  指示書→実装→AgentMessage完了報告→次回レビュー）を複数回回してみて、
  運用上の摩擦がないか確認してほしい。
- ファイルベース経路（`VersionN_ARC_Feedback.md`）を完全に廃止する
  かどうかは、ライブ経路の実績を見てから判断する（今回はまだ両方
  併存させている）。

## 10. POへの提案（提案・懸念点・改善案を自由に記載）

- 今回、ARCが自分のセッションから直接ManagementFeedbackと
  AgentMessageを保存できることが実証された一方、Claude Codeとの
  間で作業の重複が発生した。今後、ARCとClaude Codeが同じセッションで
  同時に活動する場面が増えるなら、「作業前に最新状態を確認する」
  という規律がより重要になる——これはコードでの解決が難しく、
  運用上の合意事項として維持する必要がある。

## 11. CEOへのコメント（今回の成果、次Versionへの期待）

Version19は、これまでで最もコード変更量が少ないVersionだが、
最も判断が難しいVersionでもあった。ARCの指示書を字義通り実装
すれば、Project ARCが「判断する」存在になりかねなかった——
Constitution第2条を実際のコード変更の判断に適用した、初めての
明確な事例だと考える。ARCが今回自律的にManagementFeedback・
AgentMessageを保存したこと自体は、Version16〜18で積み上げてきた
接続基盤が実際に機能している証拠であり、素直に成果だと捉えている。

## 12. ARCへの引き継ぎ

### 新しい資産

- **Continuous Collaboration運用**（`docs/ai-roles.md`）— ARC↔
  Owner↔Claude Codeの閉ループの手順が文書化された。
- **タグ規約**（`mf:<ManagementFeedbackのid>`）— AgentMessageと
  ManagementFeedbackを紐付けられる。

### 新しいルール

- ManagementFeedbackの`resolution`遷移（Open→Accepted→Implemented→
  Closed、またはRejected）は、技術的には誰でも呼び出せるが、
  常にOwnerの実際の判断を記録するものとして扱うこと——ARC自身が
  Owner確認なしに遷移させないこと。
- 指示書は`ARC_INBOX.md`とAgentMessageの両方で届きうる。Claude Codeは
  両方を確認する。

### 新しい思想

Version19は、「ARCがProject ARCを直接使えるようになった」ことへの
対応として、機能を追加するのではなく**境界を明確化する**ことを
選んだVersionである。接続基盤が整うほど、「誰が何をして良いか」の
境界が実際のリスクになる——今回はその最初の実例だった。

### Ownerについて分かったこと

Owner自身が「do」という一言承認のショートカットを導入したことは、
指示書の「Ownerの操作は原則『do』による承認のみ」という目標を、
既にOwner自身が体現し始めていることを示す（事実ベースの観察）。

## 13. Product Review

### ユーザー体験で改善されたこと

Before：Version18までは、ARCが実際にProject ARCへ書き込めることは
技術的に確認されていたが、実際の運用フロー（指示書の往復）は
まだファイルベースのコピペが主だった。

After：ARC自身が指示書とFeedbackをProject ARCへ直接保存し、Claude
Codeが完了報告もAgentMessageで返す、という一往復が実際に成立した。
Ownerの操作は`do`の一言のみだった。

### 毎日使う理由

このVersion自体は日々の体験を直接変えるものではないが、今後
Version完了ごとのやり取りがコピペなしで完結する土台が固まった。

### 懸念

Remote MCPの無認証設計（ADR 0044）が前提になっているため、ARCが
誤操作をした場合の防止策がドキュメントの運用規律に依存している。
利用頻度が増えるほど、この点の再検討が必要になる可能性がある。

### 次Versionで最も価値が高い改善

Owner・ARC・Claude Codeがこのループを複数Version分実際に回してみて、
どこに摩擦が残っているかを確認すること。

## 14. 10年後のProject ARCへの貢献

Version19で10年後も効いてくるのは、「接続できることと、やって良い
ことは別問題である」という区別を、実際のコード変更の判断として
記録したことである——Version16〜18が「ARCがProject ARCに接続できる
ようにする」という技術的な問題を解いたのに対し、Version19は
「接続できるようになったからこそ、境界を明文化する必要がある」
という統治上の問題を解いた。

「人生OS」というVisionから逆算すると、Project ARCが将来さらに
多くのAIエージェントと接続するほど、この統治の明文化がより重要に
なる。Version19は、機能追加の速度を落としてでも「誰が判断するか」
を明確にすることを選んだ最初の事例として、将来同種の判断が必要に
なったときの参照点になる。
