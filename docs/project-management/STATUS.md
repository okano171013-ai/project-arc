# Project ARC — PM Status

最終監査日: 2026-07-20（Version38時点に更新）  
基準HEAD: Version38コミット（`docs/reports/Version38_Report.md`参照）  
作業ツリー: `.claude/settings.local.json`のみ未追跡（ローカル設定、対象外）。

## 5分サマリー

Version1〜38まで完了。local生活記録、Google連携、検索・意思決定支援、HTTP/MCP、提案承認、Agent協調、Life Log、行動介入、Study Session、Capability Registry、Runner Control Plane、Data Durability、Program A（読み取り専用公開）、**Program B Mobile Ingress（ローカル完成＋Cloudflare Workers実装をローカルエミュレータで実機検証）**まで到達した。設計思想はOwner主権、Systemは判断しない、local-first、層境界の維持。

Owner優先順位（2026-07-19）により、Version35からProgram B
（Mobile Daily Capture）を最優先で進めた。Version35〜37でローカル
MVP・セキュリティ強化・退避ログImporterを完成させた（ADR 0064〜
0068）。**Version38は、ARCがGit経由で送った指示書（2026-07-20、
`docs/handoff/archive/Version38_ARC_Brief.md`）**を受け、Cloudflare
Workers実装（`cloudflare/src/worker.ts`）をCloudflareの公式local
emulator（Miniflare、実`workerd`ランタイム）で実機検証した——
アカウント作成・ログイン・デプロイは一切実施していない。二段階
token（DEVICE_TOKEN／PULL_TOKEN）による最小権限read契約、
`pnpm mobile-sync pull`によるcloud→localのreconciliation、
NutritionLogのQuick Capture対応も実装した。**クラウド契約・課金・
本番公開・秘密情報設定・認証済みLAN公開の有効化は一切実施して
いない**（Owner指示通り）。

Owner向け判断事項は`docs/project-management/
Version35_Decision_Packet.md`・`Version37_Decision_Packet.md`・
新設の`docs/project-management/Version38_Activation_Packet.md`
（実デプロイの1ページ実行チェックリスト）に集約した。

## 現在の進捗

| 項目 | 状態 |
|---|---|
| Version1〜34 | 完了 |
| Version35 | 完了（Program B Architecture Gate整理、Mobile Ingressデータ契約確定、ローカルMVP実装・実機確認） |
| Version36 | 完了（Quick Capture UI、`MOBILE_INGRESS_HOST` opt-in、sync自動化スクリプト） |
| Version37 | 完了（Mobile Ingressセキュリティ強化、退避ログJSONL Importer、Cloud Adapter境界整理） |
| Version38 | 完了（Cloudflare Worker実装・Miniflare実機検証、最小権限read契約、pull/reconciliation、NutritionLog対応） |
| Typecheck / Lint | 2026-07-20合格（Version38時点で再確認、`cloudflare:typecheck`も合格） |
| Build | 不合格。TS2742と`dist`書込競合（Version31以降スコープ外、ARC-PM-005として継続） |
| Test | Version38時点640件合格（メイン）＋14件合格（`pnpm cloudflare:test`、別ゲート） |
| Remote MCP | 認証の実装・テストは完備（Version22）。**本番は今なお無認証**（ADR 0051の「有効化した」という記録は誤りだったとVersion30で判明、訂正済み）。MCP Tool数26（Version34から変化なし——Mobile IngressはRemote MCPの一部ではない） |
| Program A | DevelopmentGrant・AgentTaskが読み取り専用でARCから確認可能。write操作は未公開（変化なし） |
| Program B | ローカルMobile Ingress完成（認証・rate limit・監査ログ・退避ログImporter）。Cloudflare Worker実装をMiniflareで実機検証済み・未デプロイ。実デプロイはOwner確認待ち（`Version38_Activation_Packet.md`） |
| Data Durability | `pnpm backup create/list/restore`が動作。`data/ingress-records.json`も自動的にbackup対象に含まれることを実機で確認済み |
| Bridge Layer | MealLog/NutritionLog/WeightLog/FinanceLog/StudySessionのImport/Export対応を追加（Version9〜27間のギャップ解消） |

## Open Issues

| ID | Priority | Issue | 状態 / 完了条件 |
|---|---|---|---|
| ARC-PM-001 | P0 | 公開Remote MCPが無認証 | **実装済み・テスト済み（Version22、Version30でsecurity review完了）。本番`.env`有効化のみ未実施** — Owner Actionのみ残存。手順は`docs/setup/remote-mcp-oauth-migration.md`（Version30改訂、one-shot checklist） |
| ARC-PM-004 | P0 | Version29未コミット・未検証 | Version30時点で解消（wipコミットにより確定・push済み） |
| ARC-PM-005 | P1 | Build再現不能 | clean環境とCIでbuild成功 |
| ARC-PM-006 | P1 | Roadmap / README / DoD / Reportsの重複・矛盾 | 本文書を現況の唯一の入口にする |
| ARC-PM-007 | P1 | OpenAPIが主要10 endpoint限定 | API契約の単一情報源と差分検知 |
| ARC-PM-008 | P1 | `server.ts`等の巨大化と多層同期漏れ | module分割、contract test |
| ARC-PM-009 | P1 | StudyLog / StudySession / Task未整理 | ADRでcanonical modelを決定 |
| ARC-PM-010 | P1 | package `0.20.0`とProject Version不一致 | release identity規約 |
| ARC-PM-011 | P2 | ADR status・形式不統一 | ADR indexとtemplate |
| ARC-PM-012 | P2 | AGENTS / CLAUDE重複、Claude偏重 | 共通規約へ集約 |
| ARC-PM-013 | P2 | `apiKeyAuth.ts`（ARC Connector）が非timing-safe比較 | Version30 security reviewでの観察。ローカル専用のため実害は限定的。次回機会に`timingSafeEqual`化を検討 |

解決済み（Open Issuesから除外）：
- **ARC-PM-003**（Claude許可設定の`rm -rf data`）：OwnerがWindowsローカル側で該当許可2件を除去し、JSON正常性を確認済み（Version30、2026-07-19）。
- **ARC-PM-002**（JSON生活データのbackup/restore/schema migration契約なし）：Version31で解決。`jsonStore.ts`のatomic書き込み化、`BackupService`・`pnpm backup create/list/restore`、世代retention（既定10世代）を実装し、実機で復元演習を確認済み。schemaVersionはmanifestレベル（`"1"`）のみ、行レベルは次Version以降（ADR 0058「未決定」参照）。
- **ARC-PM-014**（「現在退避中の16件」の実体不明）：Version37で解決。実データはOwnerのCodex workspaceに保管されており、取り込み形式・重複防止規則をADR 0067として確定、`pnpm import-pending-logs`を実装・テスト済み（合成データのみ、実データはこのリポジトリに含まれない）。実際の取り込みはOwner自身が実行する。

## 現在の目標・次のマイルストーン

**Program B**: Architecture Gate論点整理（ADR 0064）、Mobile Ingressデータ契約（ADR 0065）、ローカルMVP、Quick Capture UI・sync自動化（Version36）、セキュリティ強化・退避ログImporter・Cloud Adapter境界（Version37）、Cloudflare Worker実装のMiniflare実機検証・pull/reconciliation（Version38）まで完了。次はOwner確認事項（`MOBILE_INGRESS_HOST`のLAN公開＋トークン設定、実際の16件の取り込み、Cloudflare実デプロイ）の回答を受けての実地確認。契約・課金・秘密情報設定・実デプロイは`Version38_Activation_Packet.md`の手順が確定するまで未実施のまま凍結する。

**Stability Gate**: 残りARC-PM-005〜010を閉じる。ARC-PM-001は本番反映（Owner Action）のみ残存、ARC-PM-002〜004・014は解消済み。外部公開、認証、秘密情報、データ削除はOwner承認が必要。

## 技術的負債

- P0: なし（ARC-PM-002は解決、ARC-PM-001は本番反映のみ残存）
- P1: build、契約同期、巨大module、model重複、release管理、文書正本
- P2: 命名・template・歴史資料、Docker/Supabase説明、apiKeyAuthのtiming-safe化、Entity行レベルschemaVersion、未対応type（RewardSystem等7種）へのEntity設計要否（Owner/ARC判断待ち）

## 停止中タスク

- OAuth本番有効化: 準備完了（Version30）。Owner承認と接続再設定待ち——`docs/setup/remote-mcp-oauth-migration.md`のチェックリストで一度で実行できる
- Program B（Mobile Ingress）クラウドActivation Gate: ローカルMVPは完成済み（Version35〜37）。Cloudflare Worker実装はMiniflareで実機検証済み・未デプロイ（Version38、ADR 0069）。実デプロイの実行手順は`Version38_Activation_Packet.md`（1ページ）に整理済み——実行はOwner確認待ち
- `MOBILE_INGRESS_HOST`のLAN公開＋`MOBILE_INGRESS_API_TOKEN`設定の有効化: Owner確認事項（確認事項3、`Version35_Decision_Packet.md`）——スマホからの実送信に必要。認証機構は実装済み（fail-closed、ADR 0066）
- 実際の16件の取り込み: Owner自身が`pnpm import-pending-logs`を実行（Importerは実装済み、ADR 0067）
- `STUDY_TIMER_API_TOKEN`と実timer疎通: Owner作業
- StudyLog配線: StudySessionとのmodel判断待ち

## 更新ルール

Version開始・完了、Priority変更、Owner判断、停止・再開時に更新する。履歴はReport / Developer Feedbackへ置き、ここには現在形だけを書く。
