# ARC ⇄ Claude Code 引き継ぎ運用

2026年7月時点で、ARC（ChatGPT）とClaude Codeの間には**2つの経路が
併存**している。

- **ファイルベース経路**（Version1〜18で確立）：Owner経由の手動
  コピー＆ペースト。下記「経路A」参照。
- **ライブ経路**（Version18のRemote MCP・Version19のAgentMessageで
  確立）：ARCがChatGPT Developer Mode経由でProject ARCへ直接
  読み書きする。下記「経路B」参照。

どちらか一方に統一されたわけではなく、**両方を確認する必要がある**
——特にライブ経路は、Owner自身がトンネル（ngrok等）を起動している
間しか機能しないため、ファイルベース経路が完全に不要になったわけ
ではない。

## 経路A：ファイルベース（コピー＆ペースト）

### 受信：ARCからの指示書

`docs/handoff/ARC_INBOX.md` にOwnerがARCの最新の指示書を貼る。
Claude Codeは新しいセッション開始時、このファイルに前回から更新が
あればそれを最新の指示として自動的に読み込み、着手する（Ownerに
「指示書を貼ってください」と聞き直さない）。

### 送信：Claude CodeからARCへのフィードバック

各Versionの完了後、`docs/reports/VersionN_ARC_Feedback.md` を生成する
（既存の運用）。これが「送信箱」であり、Ownerはこの内容をコピーして
ARCとの会話に貼るだけでよい。最新版には
[`docs/handoff/LATEST_ARC_FEEDBACK.md`](./LATEST_ARC_FEEDBACK.md) から
たどれるようにする（各Version完了時にClaude Codeが更新する）。

## 経路B：ライブ（Remote MCP経由、Version19〜）

### 受信：ARCからの指示書

ARCは自分のChatGPT Developer Modeセッションから、`proposal_create`
（`type: "AgentMessage"`, `direction: "ToClaudeCode"`,
`relatedVersion: "VersionN"`）→ Owner承認 → `proposal_approve`という
Write Proposal Layerの手順で、Project ARCへ直接指示書を保存できる
（Constitution第2条・第4条により、Owner承認は経路Bでも省略されない）。

Claude Codeは新しいセッション開始時、`ARC_INBOX.md`に加えて
**`agent_message_list`（`direction: "ToClaudeCode"`）を必ず確認する**
（`CLAUDE.md`のセッション開始チェックリスト参照）——Version19の
実際の指示書自身が、`ARC_INBOX.md`を経由せずこの経路だけで届いた
実例がある。

### 送信：Claude CodeからARCへのフィードバック

実装完了後、`proposal_create`（`type: "AgentMessage"`, `direction:
"ToARC"`, `relatedVersion: "VersionN"`）→ Owner承認 →
`proposal_approve`で完了報告を保存する。ARCは次回接続時に
`agent_message_list`で直接読める。

### トレーサビリティ：ManagementFeedback ↔ AgentMessage

ARCがManagementFeedbackを起点に指示書を書いた場合、対応する
AgentMessageの`tags`に`mf:<ManagementFeedbackのid>`を付与する規約
とする（Version19、ADR 0045）。スキーマ変更は行わず、既存の
`tags?: string[]`を再利用する——新しいフィールドは追加しない
（Principle 9のYAGNI）。

## 自動化の限界（両経路共通）

- どちらの経路でも、**書き込みは必ずOwnerの明示的な承認
  （Write Proposal Layerのapprove）を経由する**——ARCが直接
  「判断」して保存することはない（Constitution第2条・第4条）。
- 経路Bはトンネル起動中しか機能しない。Owner不在時・トンネル未起動時
  は経路Aが唯一の手段になる。
- 将来メール/Slack等のコネクタを接続すれば、経路Aの往復もさらに
  自動化できる可能性がある（Owner希望があれば検討する）。
