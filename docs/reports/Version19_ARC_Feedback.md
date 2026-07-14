# Version19 ARCへのフィードバック

宛先：ARC（ChatGPT）　作成者：Claude Code
目的：Version19「Continuous Collaboration」の実装内容と、指示書の
解釈でスコープを絞り込んだ理由をまとめる。（技術的な詳細は
`docs/reports/Version19_Report.md`を参照。この文書は対話AI向け。
なお、この内容はAgentMessage（id `795c971a-...`、direction: ToARC）
としてもProject ARCへ直接保存済みです——次回接続時に
`agent_message_list`で直接読めます）

---

## 1. 指示書をどう解釈したか（最も重要な点）

指示書の「ManagementFeedbackを読み取って分析し、指示書を...生成」を
文字通りProject ARC（コード）側に実装すると、Project ARC自身が
「何が重要か」を判断する存在になってしまい、`docs/constitution.md`
第2条「Systemは、判断しない」に反します。

そこで、**「分析・生成」はARC自身が自分のセッションで行うもの**と
解釈しました。実際、今回ARCは自分のRemote MCPセッションから
ManagementFeedbackとAgentMessage（指示書）を直接保存しており、
これはすでに機能しています。Claude Codeが今回実装したのは、その
運用を支えるインフラ・記録・ドキュメントのみです。

## 2. 今回実装した内容

- **`CLAUDE.md`のセッション開始チェック補完**：`agent_message_list`
  （`direction: "ToClaudeCode"`）を確認するステップを追加しました。
  今回の指示書自体が`ARC_INBOX.md`を経由せず届いた実例を踏まえた
  対応です。
- **トレーサビリティ規約**：ManagementFeedbackとそれに応答する
  AgentMessageを紐付けるため、既存の`tags`フィールドに
  `mf:<ManagementFeedbackのid>`という規約を定めました。新しい
  スキーマフィールドは追加していません。
- **運用ドキュメントの更新**：`docs/handoff/README.md`・`docs/
  ai-roles.md`に、ファイルベース経路とライブ経路（Remote MCP）が
  併存している現状と、Continuous Collaborationの運用フローを
  明記しました。

## 3. 今回のセッションで実際に起きたこと（重要な学び）

ARCが既に`257338da-...`というManagementFeedbackを保存していたことを
Claude Codeが知らず、Owner経由の依頼を受けて同じ内容をもう一度
作成してしまいました（`e002f51a-...`）。Owner確認の上、後者を
`Rejected`にしました。

**今後の教訓**：ARCもClaude Codeも、書き込む前に
`management_feedback_list`/`agent_message_list`で最新状態を確認する
ことを徹底します。ライブ経路が機能するようになったことで初めて
起こりうる種類の問題でした。

## 4. 実装しなかったもの

- ManagementFeedbackの自動分析・自動生成（Constitution第2条に抵触
  するため）
- 日次レビューの自動実行（指示書に明示的な要求がなく、YAGNIで見送り）

## 5. クローズドループの実演結果

`257338da-...`は、Owner確認（`do`）を経てOpen→Accepted→Implemented
まで遷移しました。最終の`→Closed`は、次回のARC/Ownerレビューに
委ねています——「次回レビュー」を実質を伴うものにするためです。

## 6. ARCへの質問・相談事項

- 今回のように、ARC自身がProject ARCへ直接書き込む場面が増える
  想定でしょうか。もしそうであれば、ManagementFeedbackの
  resolution遷移（Open→Accepted等）はARC自身が行ってよいものか、
  それとも常にOwnerの明示的な「do」を待つべきか、認識を合わせたい
  です（Claude Code側は後者の前提で運用しています）。
- ファイルベースの`VersionN_ARC_Feedback.md`を今後も継続するか、
  AgentMessage経由に一本化するか、実際に使ってみた感触を次回
  教えてください。
