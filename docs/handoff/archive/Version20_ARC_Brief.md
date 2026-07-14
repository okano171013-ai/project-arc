# Version20 指示書（原文、AgentMessage経由）

Version19と同様、`docs/handoff/ARC_INBOX.md`への貼り付けを経由せず、
ARCが自分のRemote MCPセッションから直接Project ARCへ保存した。

## 主たる指示（Version20の主題）

- **id**: `33274dc6-2553-4b4d-9d9b-30f5de74c053`
- **direction**: `ToClaudeCode`
- **relatedVersion**: `Version19`（発信元のタグ付けはVersion19のまま
  だが、内容・時刻からVersion20の指示として扱った）
- **createdAt**: `2026-07-14T14:09:48.225Z`

> Collaboration Runnerと常駐運用基盤を最優先で実装してください。
> 目的は、PCを起動したまま放置しても、Project ARC上の未読
> AgentMessage・ManagementFeedback・承認済みTaskを監視し、承認不要の
> 範囲でClaude Codeによる開発・テスト・ADR・Report更新・Feedback
> 返却を進めることです。あわせて、pnpm run api / pnpm run mcp:remote
> / ngrok http 3940 を毎回手動起動しなくて済むよう、Windowsログオン時
> またはPC起動時に自動起動する仕組みを設計してください。候補は
> Windowsタスクスケジューラ、常駐Runner、必要ならサービス化です。
> 承認が必要な事項（有料サービス、外部公開拡大、認証変更、破壊的
> 変更、個人情報の外部送信、Constitution変更）は必ず停止してOwnerに
> 確認してください。まずは無料・ローカル・安全な構成を優先し、
> 再起動後の復旧、ログ保存、失敗時再試行、重複実行防止、停止方法を
> 含めてください。

## 参考：同日届いた長期バックログ（今回は実装対象外、参照のみ）

- **id**: `8df72fe4-c2f6-445a-b488-a36db3f3ce99`
- **direction**: `ToClaudeCode`
- **relatedVersion**: `LongTerm-Roadmap`
- **createdAt**: `2026-07-14T14:03:51.729Z`

Owner指令として、A〜Jの10カテゴリ・100項目の長期バックログが提示
された（自律協調・通知、AgentTask・開発管理、Artifact・文書管理、
Runner・自動実行、セキュリティ・ガバナンス、Continuous Management、
学習OS、健康・生活OS、知識・意思決定、長期人生OS）。「すべてを一括
実装せず、最小縦切りで進める」と明記されており、推奨実装順の
①〜⑤（AgentEvent/未読管理→AgentTask→Runner→日次レビュー→Owner
Approval Policy）ではRunnerは3番目に位置づけられていたが、より新しく
具体的な指示（上記`33274dc6-...`）がRunnerを「最優先」としたため、
今回はRunnerを主題とし、100項目全文は`docs/roadmap.md`の長期セクション
へ要約を記録するに留めた（全項目の個別評価はしない、YAGNI）。

## Claude Codeによる解釈・スコープ調整

指示書の「開発・テスト・ADR・Report更新・Feedback返却を進める」を
無人のまま実行するには、Runnerが未読内容を「解釈」する必要があり、
`docs/constitution.md`第2条・ADR 0045の境界に抵触しかねない。着手前に
Ownerへ2点確認し、「Runnerは監視・下書き作成まで（実際のコード変更・
commitはOwnerの`do`まで実行しない）」「ngrokを含め全サービスを
ログオン時自動起動する」という回答を得た上で、Runner v1を機械的な
検知・通知のみに限定した（ADR 0046）。ログオン時自動起動タスクの
登録は、Claude Codeの実行環境の制約により完遂できず、Owner自身が
一度`scripts/register-scheduled-tasks.ps1`を実行する手順として
引き継いだ（ADR 0047）。詳細は`docs/reports/Version20_Report.md`参照。
