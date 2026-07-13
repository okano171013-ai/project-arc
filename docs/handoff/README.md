# ARC ⇄ Claude Code 引き継ぎ運用

ARC（ChatGPT）とClaude CodeはAPI連携していない（2026年7月時点）。
両者のやり取りはOwnerの手動コピー＆ペーストを介するが、以下の
ファイル運用により、Claude Code側の「読む・書く」は自動化する。

## 受信：ARCからの指示書

`docs/handoff/ARC_INBOX.md` にOwnerがARCの最新の指示書を貼る。
Claude Codeは新しいセッション開始時、このファイルに前回から更新が
あればそれを最新の指示として自動的に読み込み、着手する（Ownerに
「指示書を貼ってください」と聞き直さない）。

## 送信：Claude CodeからARCへのフィードバック

各Versionの完了後、`docs/reports/VersionN_ARC_Feedback.md` を生成する
（既存の運用）。これが「送信箱」であり、Ownerはこの内容をコピーして
ARCとの会話に貼るだけでよい。最新版には
[`docs/handoff/LATEST_ARC_FEEDBACK.md`](./LATEST_ARC_FEEDBACK.md) から
たどれるようにする（各Version完了時にClaude Codeが更新する）。

## 自動化の限界

- ARCへメッセージを直接送信することはできない（Owner経由の貼り付けが必要）。
- ARCからの指示を能動的に「取得しにいく」こともできない（Owner側で
  `ARC_INBOX.md` を更新してもらう必要がある）。
- 将来メール/Slack等のコネクタを接続すれば、この往復をさらに自動化
  できる可能性がある（Owner希望があれば検討する）。
