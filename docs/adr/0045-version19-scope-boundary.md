# ADR 0045: Version19「Continuous Collaboration」のスコープをガバナンス境界に沿って絞り込む

## ステータス

承認済み（Owner確認済み、Plan Mode承認）

## 関連Principle

- Principle 9（段階的拡張／YAGNI）
- Principle 10（責務は分担であり、兼務しない）
- `docs/constitution.md`第2条（Systemは、判断しない）・第3条（ARCは、
  推論する）・第4条（Ownerが、最終決定する）
- `docs/ai-roles.md`「Project ARC（システムそのもの）」節
- ADR 0044（Remote MCP認証撤回）

## コンテキスト

Version18完了・Owner実機確認（ChatGPT⇄Project ARC接続成功）を受け、
ARC自身がRemote MCP経由で初めてコピペを介さずProject ARCへ直接
書き込みを行い、ManagementFeedback（id `257338da-...`）と、Version19
指示書に相当するAgentMessage（id `b0adb087-...`、direction:
ToClaudeCode、relatedVersion: "Version19"）を保存した。

指示書本文：

> Version19ではContinuous Collaborationを実装してください。Project
> ARCを協調基盤とし、ManagementFeedbackを読み取って分析し、Claude
> Code向け指示書をAgentMessage Proposalとして生成・承認・保存できる
> 一連の運用を完成させてください。日次レビュー→指示書→実装→
> Feedback→次回レビューの閉ループを構築し、Ownerの操作は原則
> 『do』による承認のみで進められる設計を目指してください。

この文言を字義通り実装すると、「ManagementFeedbackを読み取って
分析し...生成」する主体が誰なのか——ARC自身（対話セッション内）か、
Project ARC（バックエンドコード）か——が曖昧になる。後者だとすると、
Systemが「このFeedbackは重要だ」「この指示を書くべきだ」という
判断を下す機能になり、以下と直接衝突する。

- `docs/constitution.md`第2条「Systemは、判断しない。」
- `docs/ai-roles.md`：Project ARC（System）の意思決定範囲は「一切
  なし」。「解釈」「重要度判定」はSystemの責務外と明記。
- Claude Code自身の責務も「情報の重要性評価、コンテンツの解釈・
  要約」を明示的に除外している（同ドキュメント）。

さらに`docs/reports/Version18_Report.md`（3章）は「Continuous
Management・Daily Review自動生成・**AI推論**・**ManagementFeedback
自動生成**」を明示的にVersion18の対象外として除外済みであり、
Version16のロードマップで「Continuous ManagementはVersion19へ」と
既に繰り下げられていた経緯がある——今回の指示はその延長線上に
あるが、「対象外」とされていた自動化を今回のVersion19が急に解禁した
わけではないと判断した。

## 決定

### 「分析・生成」はARC自身が担う。Project ARC・Claude Codeは代行しない

ARCが自分のChatGPT Developer Modeセッション（Remote MCP経由）で
`management_feedback_list`を呼んで内容を読み、自分の推論
（Constitution第3条「ARCは、推論する」）で指示書を`AgentMessage`
Proposalとして起案する——これは技術的に**今回すでに実例がある**
（`b0adb087-...`自体がその実演）。Version19はこの「ARC自身による
分析・起案」を前提とし、Project ARC側に自動分析・自動生成ロジックを
実装しない。

### Version19で実装しないもの

- ManagementFeedbackの内容を解釈・要約・優先順位付けする自動化
- 「指示書を書くべきかどうか」を判定するロジック
- 日次レビューの自動実行（スケジューラ/cron）

### Version19で完成させるもの（インフラ・記録・ドキュメント）

今回の実セッションで発覚した2つの実際のギャップを埋めることに
限定した。

1. **`ARC_INBOX.md`を経由しない指示書の見落としリスク**：
   `CLAUDE.md`のセッション開始チェックリストに`agent_message_list`
   （`direction: "ToClaudeCode"`）の確認を追加した。
2. **ManagementFeedbackの重複**：今回、Claude CodeがARCの依頼を
   受けて同内容のManagementFeedbackをもう一件作成してしまった
   （ARCが既に自分で保存済みとは知らなかったため）。再発防止として、
   `docs/handoff/README.md`・`CLAUDE.md`に「まず`management_feedback_
   list`/`agent_message_list`で最新状態を確認してから動く」という
   手順を明記した。
3. **トレーサビリティ**：ManagementFeedbackとそれに応答する
   AgentMessageを紐付ける手段がなかった。新規スキーマフィールドは
   追加せず、既存の`tags?: string[]`を再利用する`mf:<id>`規約を
   `docs/ai-roles.md`に定義した（Principle 9のYAGNI）。
4. **運用ドキュメントの更新**：`docs/handoff/README.md`に、
   ファイルベース経路（経路A）とライブ経路（経路B、Remote MCP）が
   併存している現状と、両者の使い分けを明記した。

## 根拠

- Constitution第2条・第4条、ai-roles.mdの責務分担は、このプロジェクト
  の最上位ドキュメントであり、ARCからの個別の指示書がこれと矛盾する
  ように読める場合は、上位文書を優先する（`CLAUDE.md`「判断に迷ったら
  `docs/constitution.md`→`docs/principles.md`の順に立ち返る」）。
- Version18_Reportが「AI推論・ManagementFeedback自動生成」を既に
  対象外としていた事実は、この境界がVersion19に固有の新しい制約
  ではなく、既存の合意の継続であることを示す。
- 「Ownerの操作は原則『do』による承認のみ」という指示書の目標は、
  Owner不要という意味ではなく「コピペの手間をなくす」ことが目的
  （`docs/handoff/archive/Version18_ARC_Brief.md`の唯一の成功指標
  「おとのコピペを減らすこと」と同じ精神）。承認そのものを省略する
  設計ではないため、Write Proposal Layerのcreate→approve構造は
  維持する。

## 影響

- Version19は新規Entity・UseCase・スキーマフィールドを追加しない
  ——ドキュメント更新と、既存MCP toolの呼び出しシーケンス（create→
  approve、resolve）が中心になる。
- 今後ARCから「〜を自動化してほしい」という指示が来た場合も、まず
  本ADRとConstitution第2条に照らし、「その処理はSystemがやるべきか、
  ARCがやるべきか」を先に問うこと（`docs/ai-roles.md`「Version2
  以降への含み」と同じ判断パターン）。
- 将来、ARCの分析・起案そのものを補助する仕組み（例：ARCが読み
  やすいようにManagementFeedbackを整形して見せるUI等）を検討する
  余地はあるが、「整形・提示」と「解釈・判断」の境界を都度確認する
  こと。
