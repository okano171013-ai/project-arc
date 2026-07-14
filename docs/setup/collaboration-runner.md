# Collaboration Runner・常駐運用の使い方（Version20）

`docs/setup/chatgpt-mcp-connection.md`で構築したRemote MCP接続を、
毎回手動起動しなくて済むようにする常駐運用と、Project ARC上の新着を
機械的に検知するCollaboration Runnerの使い方。

## 1. 全体像

- **自動起動**（`ProjectARC-AutoStart`タスク）：ログオン時に
  `pnpm run api`・`pnpm run mcp:remote`・`ngrok http 3940`を起動する。
- **Collaboration Runner**（`ProjectARC-CollaborationRunner`タスク）：
  15分間隔で新着のAgentMessage（`direction: "ToClaudeCode"`）・
  ManagementFeedback（`resolution: "Open"`）を検知し、通知ファイルを
  書き出す。**内容の解釈・実装方針の提案は一切しない**（ADR 0046）
  ——実際の対応はOwnerが次にセッションを開いたときに行う。

**重要な注意（ADR 0047）**：ngrokも自動起動する設計のため、
**PCがログオンしている間、無認証のRemote MCPエンドポイントがほぼ
常時公開HTTPS経由で到達可能になります**。これはOwner確認済みの
リスク許容ですが、心当たりのない挙動に気づいた場合は
`scripts/stop-all.ps1`で即座に停止してください。

## 2. セットアップ（初回のみ、Owner自身の操作が必要）

Collaboration Runnerタスク（15分間隔）はClaude Codeが登録済みです。
**ログオン時自動起動タスク（`ProjectARC-AutoStart`）は、Claude Codeの
実行環境の制約により登録できませんでした**——通常のPowerShell
ウィンドウ（デスクトップで直接開いたもの）から、以下を一度実行して
ください。

```powershell
cd C:\Users\okano\project-arc
.\scripts\register-scheduled-tasks.ps1
```

成功すると以下が表示されます。

```
[register] ProjectARC-AutoStart registered
[register] ProjectARC-CollaborationRunner registered
[register] done. Verify with: Get-ScheduledTask -TaskName 'ProjectARC-*'
```

確認：

```powershell
Get-ScheduledTask -TaskName 'ProjectARC-*' | Select-Object TaskName, State
```

両方とも`State: Ready`になっていれば成功です。

## 3. 手動での起動・停止

自動起動を待たずに今すぐ起動したい場合：

```powershell
.\scripts\start-all.ps1
```

停止する場合：

```powershell
.\scripts\stop-all.ps1
```

（ポート3939・3940・4040を使っているプロセスのみを個別に停止します
——他の無関係なプロセスは終了しません）

## 4. 現在の公開URLを確認する

```powershell
Get-Content data\current-tunnel-url.txt
```

ngrok無料プランは**再起動のたびにURLが変わります**。ChatGPT側の
コネクタ設定は、再起動後にこのファイルの内容で更新してください。

## 5. ログの見方

| ファイル | 内容 |
|---|---|
| `data\logs\api.out.log` / `api.err.log` | ARC Connector HTTP APIの出力 |
| `data\logs\mcp-remote.out.log` / `mcp-remote.err.log` | Remote MCPサーバーの出力 |
| `data\logs\ngrok.out.log` / `ngrok.err.log` | ngrokの出力 |
| `data\runner.log` | Collaboration Runnerの実行ログ（実行時刻・検出件数・エラー） |
| `data\runner-notifications\*.md` | 新着検知時の通知ファイル（機械的な一覧のみ） |
| `data\runner-state.json` | Runnerが記録している「最後に確認した時刻」 |

## 6. 停止・無効化方法

一時的に無効化（設定は残る）：

```powershell
Disable-ScheduledTask -TaskName 'ProjectARC-AutoStart'
Disable-ScheduledTask -TaskName 'ProjectARC-CollaborationRunner'
```

再度有効化：

```powershell
Enable-ScheduledTask -TaskName 'ProjectARC-AutoStart'
Enable-ScheduledTask -TaskName 'ProjectARC-CollaborationRunner'
```

完全に削除：

```powershell
Unregister-ScheduledTask -TaskName 'ProjectARC-AutoStart' -Confirm:$false
Unregister-ScheduledTask -TaskName 'ProjectARC-CollaborationRunner' -Confirm:$false
```

## 7. トラブルシューティング

| 症状 | 原因・対処 |
|---|---|
| `register-scheduled-tasks.ps1`が`Access is denied`で失敗する | 管理者権限では**なく**、通常のユーザーとしてデスクトップから直接開いたPowerShellウィンドウで実行しているか確認する |
| ログオンしてもサービスが起動しない | `Get-ScheduledTask -TaskName 'ProjectARC-AutoStart'`で`State`が`Ready`か確認。`data\logs\`の各ログを確認 |
| Collaboration Runnerが新着を検知しない | `pnpm run api`が起動しているか確認（Runnerも内部でHTTP API経由でProject ARCへアクセスする） |
| ngrokのURLが毎回変わって困る | 無料プランの仕様。恒久的な固定URLが必要な場合はADR 0042・0047を参照（Cloudflare Tunnel等、Owner自身の契約が必要） |
