# ADR 0047: ログオン時自動起動（ngrok含む）とWindowsタスクスケジューラの採用

## ステータス

承認済み（Owner確認済み、AskUserQuestionによる選択）

## 関連Principle

- Principle 9（段階的拡張／YAGNI）
- ADR 0042（HTTPS公開方式の選定理由）
- ADR 0044（Remote MCPエンドポイントのBearer認証必須を撤回）

## コンテキスト

Version20の指示（AgentMessage `33274dc6-...`）は、`pnpm run api`・
`pnpm run mcp:remote`・`ngrok http 3940`を毎回手動起動しなくて済むよう、
Windowsログオン時またはPC起動時に自動起動する仕組みを求めた。

Remote MCPエンドポイントは無認証設計（ADR 0044）——これはOwnerが検証の
たびにトンネルを手動起動・停止する運用を前提に許容したリスクだった。
ログオン時に毎回ngrokを自動起動するということは、**Owner不在時も
含めてほぼ常時、無認証のRemote MCPエンドポイントが公開HTTPS経由で
到達可能になる**ことを意味し、前提が変わる。

着手前にOwnerへ確認したところ（AskUserQuestion）、「すべて自動起動
（ngrokも含む）」を選択し、常時公開のリスクを明示的に受け入れた。

## 決定

### ngrokを含む3サービスをログオン時に自動起動する

`scripts/start-all.ps1`が、ポート使用状況を確認しながら
`pnpm run api`→`pnpm run mcp:remote`→`ngrok http 3940`の順に起動する。
現在の公開URLは`data/current-tunnel-url.txt`へ書き出す。

### 独自の常駐デーモンではなく、Windowsタスクスケジューラに委ねる

Node.jsプロセス自身に無限ループ・プロセス監視・再起動・重複起動防止
ロジックを実装するのではなく、Windowsタスクスケジューラの標準機能
（ログオントリガー、`-MultipleInstances IgnoreNew`、
`-StartWhenAvailable`）に委ねる（`scripts/register-scheduled-
tasks.ps1`）。独自実装を最小化し（YAGNI）、OS標準の枯れた機能を
利用する。

### 実機登録で発覚した制約：ログオントリガーの登録にはWindows 11 Homeで管理者権限が必要

`register-scheduled-tasks.ps1`の実機実行時、**15分間隔で実行する
`ProjectARC-CollaborationRunner`タスクは（Claude Codeの実行環境から
非管理者権限で）登録に成功したが、ログオントリガーの
`ProjectARC-AutoStart`タスクは「Access is denied」で登録できなかった**。

当初はClaude Codeの実行環境（対話的デスクトップセッションではない）
固有の制約と判断したが、Owner自身が通常のPowerShellウィンドウ
（管理者権限なし）から同じスクリプトを実行しても同一のエラーが
再現し、**PowerShellを管理者として実行**したところ登録に成功した
——原因はClaude Codeの実行環境ではなく、**このマシン（Windows 11
Home）で`Register-ScheduledTask`によるログオントリガー登録に管理者
権限が必要**という、Windows側の制約だったと判明した（当初の診断は
誤りであり、本ADRで訂正する）。時刻ベースのトリガー
（Collaboration Runner）は非管理者権限でも登録できたため、
制約はトリガー種別（ログオン vs. 時刻ベース）に依存する。

このため、`ProjectARC-AutoStart`タスクの登録は、**Owner自身が
PowerShellを「管理者として実行」した上で
`scripts/register-scheduled-tasks.ps1`を一度実行する**、という
1ステップの手動作業として残す（`docs/setup/collaboration-runner.md`に
手順を明記）——管理者権限での登録が必要なだけで、登録後のタスク
実行自体は現在のユーザー権限で行われる（`Register-ScheduledTask`の
既定の`Principal`設定）。

### ngrok無料プランのURL非固定性

ngrok無料プランは再起動のたびに公開URLが変わる。自動起動しても、
再起動後はChatGPT側のコネクタ設定を手動更新する必要があり、
「コピペを減らす」というVersion18以来の目標を完全には満たさない。
`data/current-tunnel-url.txt`に現在のURLを書き出すことで確認だけは
容易にするが、恒久的な固定URLが必要であれば、ADR 0042が既に示した
通りCloudflare Tunnel＋独自ドメイン（Owner自身の契約が必要）への
移行を検討すること——これは本Versionのスコープ外とする。

## 根拠

- Owner自身が常時公開のリスクを明示的に受け入れた以上、その判断を
  尊重し実装する。ただし本ADRにリスクの内容（無認証・常時公開）を
  明記し、将来の判断材料として残す。
- タスクスケジューラの標準機能に委ねることで、「再起動後の復旧」
  「重複実行防止」「失敗時再試行」という指示書の要求の大部分を
  独自コードなしで満たせる。
- ログオントリガー登録の制約は、実機検証によりWindows 11 Home側の
  権限要件（管理者権限が必要）と判明した。スクリプト自体・Task
  Scheduler機能そのものには問題がなく、実行方法（管理者権限の有無）
  だけが結果を左右した。

## 追記（2026-07-15）：ログオン後もサービスが実際には起動していなかった不具合の修正

タスク登録（上記）を終えてOwnerがPCを再起動したところ、
`ProjectARC-AutoStart`タスクは`State: Ready`で存在するにもかかわらず、
`LastTaskResult: 1`（失敗）で終了しており、API（3939）・Remote
MCP（3940）・ngrokのいずれも実際には起動していなかった。連動して
`ProjectARC-CollaborationRunner`タスクも`fetch failed`で失敗していた
（ローカルAPIが上がっていないため）。

原因は`scripts/start-all.ps1`の`Start-Process -FilePath 'pnpm'`。この
マシンの`pnpm`はPATH上に`pnpm.ps1`（と`pnpm.cmd`）が存在するが、
`Start-Process -FilePath`はWin32の`CreateProcess`相当の解決しか行わず、
拡張子を省略した`'pnpm'`では`.ps1`を実行できず「`%1 is not a valid
Win32 application`」で例外を投げる。`$ErrorActionPreference = 'Stop'`
によりスクリプトはAPI起動の直後で停止し、MCP・ngrokの起動やURL書き出し
まで到達していなかった（ログファイルは作成されるが空、というのが
症状だった）。

`-FilePath 'pnpm'`を`-FilePath 'pnpm.cmd'`に変更し（API・MCP双方の
呼び出し）、`scripts/start-all.ps1`を手動実行して3サービスすべての
起動と`agent_message_list`の正常応答を確認した。次回ログオン時の
`ProjectARC-AutoStart`タスクでも同じ経路を通るため、この修正で解消
される見込み。

## 影響

- `pnpm run api`・`pnpm run mcp:remote`・`ngrok http 3940`の自動起動
  （`ProjectARC-AutoStart`タスク）は、Owner自身が管理者権限で
  `scripts/register-scheduled-tasks.ps1`を実行し、登録済み
  （`State: Ready`、2026-07-14実機確認）。
- `ProjectARC-CollaborationRunner`（15分間隔の新着検知）も登録済み。
- 停止方法：`Disable-ScheduledTask -TaskName 'ProjectARC-AutoStart'`
  （Runnerも同様）、または`scripts/stop-all.ps1`で起動中のプロセスを
  個別に停止する。
