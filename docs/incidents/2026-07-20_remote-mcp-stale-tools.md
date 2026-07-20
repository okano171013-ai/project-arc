# 診断：公開Remote MCPが旧10ツールのまま（2026-07-20）

Owner緊急指示（`docs/handoff/archive`未収録、`docs/handoff/ARC_INBOX.md`
コミット`e65960c`）への対応記録。**読み取り専用診断のみ**——Remote MCP/
ngrokの再起動、URL変更、OAuth有効化、`.env`変更、外部公開範囲変更は
一切実行していない。

## 1. 症状（Owner報告）

別のChatGPTチャットから接続すると、公開Remote MCPのツール一覧が
旧10件のままで、`capability_registry_get`およびMealLog / NutritionLog /
WeightLog / FinanceLogが見えない。夕食のMealLog 1件は代替保存せず
非公開待機キューへ保護済み（待機総数17件、実データはこのリポジトリに
含まれない）。

## 2. このセッションから確認できたこと（ソースコード・現在のGit HEAD）

- **現在のリポジトリのコードは26ツールを公開する設計**
  （`src/infrastructure/mcp/capabilityRegistry.ts`の`MCP_TOOL_NAMES`）。
  Version28（`capability_registry_get`追加）以降26ツール、Version34
  時点（`agent_task_list`・`development_grant_list`追加）から変化なし。
- **本セッションのサンドボックス上で`pnpm run api`＋`pnpm run mcp:remote`を
  実際に起動し、新設した`scripts/diagnose-remote-mcp.mjs`で
  `http://127.0.0.1:3940/mcp`へ実MCP client接続して確認**：
  `tool count: 26`、`capability_registry_get`の`buildCommit`は起動時点の
  git HEADと一致。**現在のソースコードからビルドし直せば26ツールに
  なることは実機で確認済み**。
- **「旧10ツール」という症状の手がかり**：Version18（`af95ced`、
  2026-07-14）は「ARC向け主要10エンドポイント」として実装された
  （`docs/reports/Version18_Report.md`・当時のOpenAPI生成コメント参照）。
  `capability_registry_get`自体がVersion28で新規追加されたツールで
  あることも踏まえると、Owner側で見えている「10件・
  capability_registry_getなし」という症状は、**Version18〜27の
  どこかの時点のbuildが、その後一度も再起動・再ビルドされずに
  動き続けている可能性が最も高い**。

## 3. このセッションから直接確認できないこと（Owner側の実行環境）

このセッションはクラウド上の隔離されたコンテナで動作しており、
Owner実機（Windows、`C:\Users\okano\project-arc`、`docs/setup/
collaboration-runner.md`に記載の`ProjectARC-AutoStart`常駐タスク・
ngrokトンネル）には一切アクセスできない。以下はOwner自身が確認する
必要がある。

- 実際に稼働中の`pnpm run mcp:remote`プロセスの起動時刻・実行パス
- 現在のngrok公開URL（`data\current-tunnel-url.txt`）
- ChatGPT側に実際に登録されているコネクタURLとの一致
- ChatGPT側のconnector cacheが古い可能性（MCPクライアント一般に
  見られる既知の挙動——ツール一覧を初回接続時にキャッシュし、
  サーバー側が更新されても明示的な再接続まで反映しないクライアントが
  ある）

## 4. Ownerが実行する診断手順（安全・読み取り専用）

新設した`scripts/diagnose-remote-mcp.mjs`（本セッションで実装・実機
検証済み）をOwner自身のPCで実行する。

```powershell
cd C:\Users\okano\project-arc
node scripts/diagnose-remote-mcp.mjs http://127.0.0.1:3940/mcp (Get-Content data\current-tunnel-url.txt)/mcp
```

出力される`tool count`・`buildCommit`をlocalhostと公開URLで比較する。
併せて以下も確認する（設定変更なし）。

```powershell
git log -1 --format=%H                                    # 現在のリポジトリのHEAD
Get-Process -Name node | Select-Object Id,StartTime,Path   # 稼働中nodeプロセスの起動時刻
Get-ScheduledTaskInfo -TaskName ProjectARC-AutoStart       # 自動起動タスクの最終実行時刻
```

## 5. 切り分けの読み方

| localhost | 公開URL | 判定 | 対応 |
|---|---|---|---|
| 26件 | 26件 | 実は両方最新。ChatGPT側connector cacheが古い | ChatGPTでコネクタを削除→再登録、または明示的な「更新」操作（再起動・秘密情報操作は不要） |
| 26件 | 古い/接続失敗 | tunnelが別process/portを指している | `data\current-tunnel-url.txt`と実際にChatGPTへ登録済みのURLの一致を確認。tunnel（ngrok）だけ再起動が必要な可能性——**実行前にOwnerの承認を得る** |
| 古い | 古い | 稼働中の`pnpm run mcp:remote`自体が長期間再起動されていない | `.\scripts\stop-all.ps1` → `.\scripts\start-all.ps1`で全体再起動が必要——**実行前にOwnerの承認を得る**（本番反映に相当） |

## 6. Ownerが行う必要のある最小操作（本診断の結論）

1. まず上記4章のコマンドを実行し、5章の表でどのケースに該当するか
   判定する。
2. 「ChatGPT側cache」のケースであれば、ChatGPT側の操作のみで解決し、
   Project ARC側の変更は不要。
3. 「再起動が必要」と判明した場合、`.\scripts\stop-all.ps1` →
   `.\scripts\start-all.ps1`の実行そのものはOwner自身の環境の運用
   操作であり、Claude Codeはこのセッションから代行できない
   （実行環境が異なるため）。実行前に一度、現在のtunnel URLが
   変わる可能性がある点（ngrok無料枠は再起動のたびにURLが変わる、
   `docs/setup/collaboration-runner.md`4章）を踏まえてOwnerが判断
   すること。

## 7. Version39との関係

この診断はVersion39着手前に対応すべき指示だったが、リモートへの
追記（`e65960c`）に気づかず、先にVersion39の実装（`61f0055`）を完了
させてしまった。Version39自体はローカル・Miniflareのみの安全な工程で
あり、この診断結果とは独立して有効なため取り消していない
（`docs/handoff/ARC_INBOX.md`に注記済み）。今後は「do」の起点ごとに
`docs/handoff/ARC_INBOX.md`をファイル全体で再確認し、作業中に追記が
あった場合は都度`git fetch`で検知する運用を徹底する。
