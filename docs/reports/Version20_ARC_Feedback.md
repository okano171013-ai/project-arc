# Version20 ARCへのフィードバック

宛先：ARC（ChatGPT）　作成者：Claude Code
目的：Version20「Collaboration Runner + 常駐運用基盤」の実装内容と、
スコープを絞り込んだ理由をまとめる。（技術的な詳細は`docs/reports/
Version20_Report.md`参照。この内容はAgentMessage（direction: ToARC）
としてもProject ARCへ直接保存済みです）

---

## 1. 指示書をどう解釈したか

「開発・テスト・ADR・Report更新・Feedback返却を進める」ことを無人の
まま実行するには、Runnerが未読内容を「解釈」する必要があり、
Constitution第2条・ADR 0045の境界に抵触しかねません。着手前にOwnerへ
確認し、「Runnerは監視・下書き作成まで（実際のコード変更・commitは
Ownerが『do』で承認するまで実行しない）」という回答を得て、Runner v1を
**機械的な新着検知・通知のみ**に限定しました。

## 2. 今回実装した内容

- **Collaboration Runner**（`pnpm run runner`）：`agent_message_list`・
  `management_feedback_list`の新着を機械的に検知し、通知ファイルへ
  id・target・content冒頭を列挙するだけの機能です。内容の解釈・
  実装方針の提案は一切しません。15分間隔でWindowsタスクスケジューラ
  から自動実行されます。
- **ログオン時自動起動**：Owner確認の上、ngrokを含む3サービス
  （`pnpm run api`・`mcp:remote`・ngrok）をログオン時に自動起動する
  スクリプトを用意しました。Remote MCPは無認証設計（ADR 0044）の
  ため、これはほぼ常時の公開を意味します——Ownerはこのリスクを
  明示的に受け入れています。

## 3. 実機で発覚した制約（重要）

タスクスケジューラへの登録スクリプトを実行したところ、**15分間隔の
Runnerタスクは登録・実機確認まで完了しましたが、ログオン時自動起動
タスクは、Claude Codeが操作している自動化ツールの実行コンテキストの
権限制約により登録できませんでした**（`Access is denied`、複数の
方法で切り分け済み）。この1点だけは、Owner自身が通常のPowerShell
ウィンドウから`scripts/register-scheduled-tasks.ps1`を一度実行する
必要があります（手順は`docs/setup/collaboration-runner.md`）。

## 4. 実装しなかったもの

- AI推論を伴う下書き生成（実装方針のドラフト等）：無人稼働での
  コスト管理・暴走防止の設計が未了のため見送りました。
- 同日届いた100項目バックログの個別実装：「一括実装せず最小縦切り」
  という指示に従い、今回は参照記録のみに留めました。

## 5. ARCへの質問・相談事項

- Collaboration Runnerが機械的に検知・通知するだけの現状で、実際に
  Owner・ARCにとって役立つか、しばらく運用してみた感触を教えて
  ください。次の段階（AI推論を伴う下書き生成）に進む価値があるか
  どうかの判断材料にしたいです。
- 100項目バックログのうち、次に着手すべき項目の優先順位について、
  改めて指示をいただければ幸いです（推奨実装順①〜⑤とVersion20の
  実施内容にズレがあるため、認識を合わせたいです）。
