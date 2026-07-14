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

### 実機登録で発覚した制約：ログオントリガーの登録には対話的セッションが必要

`register-scheduled-tasks.ps1`の実機実行時、**15分間隔で実行する
`ProjectARC-CollaborationRunner`タスクは登録に成功したが、ログオン
トリガーの`ProjectARC-AutoStart`タスクは「Access is denied」で登録
できなかった**。PowerShellの`Register-ScheduledTask`コマンドレット・
`schtasks.exe`の両方で同一のエラーとなり、原因はスクリプトの不備では
なく、Claude Codeがコマンドを実行している自動化ツールの実行コンテキスト
（対話的なデスクトップセッションではない）がログオントリガー登録に
必要な権限を持たないためと判断した。

このため、`ProjectARC-AutoStart`タスクの登録は、**Owner自身が通常の
PowerShellウィンドウ（デスクトップで直接開いたもの）から
`scripts/register-scheduled-tasks.ps1`を一度実行する**、という
1ステップの手動作業として残す（`docs/setup/collaboration-runner.md`に
手順を明記）。時刻ベースのトリガー（Collaboration Runner）は
Claude Codeが問題なく登録できた——これは自動化ツールの実行コンテキスト
がログオン関連の登録のみ制限されていることを示す。

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
- ログオントリガー登録の制約は、Claude Codeの実行環境固有の限界で
  あり、Owner自身が同じスクリプトを対話的セッションから実行すれば
  問題なく登録できる見込み（時刻ベースのトリガーは同一環境から
  問題なく登録できたことから、Task Scheduler自体やスクリプトの
  内容に起因する問題ではないと判断）。

## 影響

- `pnpm run api`・`pnpm run mcp:remote`・`ngrok http 3940`の自動起動
  （`ProjectARC-AutoStart`タスク）は、Owner自身が
  `scripts/register-scheduled-tasks.ps1`を一度実行するまで有効に
  ならない。
- `ProjectARC-CollaborationRunner`（15分間隔の新着検知）は既に
  有効。
- 停止方法：`Disable-ScheduledTask -TaskName 'ProjectARC-AutoStart'`
  （Runnerも同様）、または`scripts/stop-all.ps1`で起動中のプロセスを
  個別に停止する。
