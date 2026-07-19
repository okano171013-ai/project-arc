# Project ARC — PM Status

最終監査日: 2026-07-19（Version35時点に更新）  
基準HEAD: `0b7db63`（Version35、`docs/reports/Version35_Report.md`参照）  
作業ツリー: `.claude/settings.local.json`のみ未追跡（ローカル設定、対象外）。

## 5分サマリー

Version1〜35まで完了。local生活記録、Google連携、検索・意思決定支援、HTTP/MCP、提案承認、Agent協調、Life Log、行動介入、Study Session、Capability Registry、Runner Control Plane、Data Durability、Program A（読み取り専用公開）、**Program B Mobile Ingressローカルモデル**まで到達した。設計思想はOwner主権、Systemは判断しない、local-first、層境界の維持。

Owner優先順位（2026-07-19）により、Version35からProgram B
（Mobile Daily Capture）を最優先で進めた。Architecture Gate論点
（無料枠優先・月額上限0円を初期既定、ADR 0064）を整理し、Mobile
Ingress（受信・idempotency・競合検出・待機/失敗状態）のデータ契約
（ADR 0065）を確定、**完全ローカルのMVPとして実装**した
（`pnpm mobile-ingress` + `pnpm mobile-sync`）。実機で
受信→再送無視→sync→競合検出→Owner確認による解決、の一連を確認
済み。**クラウド契約・課金・本番公開・秘密情報設定は一切実施して
いない**（Owner指示通り）。

Owner向け判断事項は`docs/project-management/
Version35_Decision_Packet.md`に集約した。

## 現在の進捗

| 項目 | 状態 |
|---|---|
| Version1〜34 | 完了 |
| Version35 | 完了（Program B Architecture Gate整理、Mobile Ingressデータ契約確定、ローカルMVP実装・実機確認） |
| Typecheck / Lint | 2026-07-19合格（Version35時点で再確認） |
| Build | 不合格。TS2742と`dist`書込競合（Version31以降スコープ外、ARC-PM-005として継続） |
| Test | Version35時点602件合格 |
| Remote MCP | 認証の実装・テストは完備（Version22）。**本番は今なお無認証**（ADR 0051の「有効化した」という記録は誤りだったとVersion30で判明、訂正済み）。MCP Tool数26（Version34から変化なし——Mobile IngressはRemote MCPの一部ではない） |
| Program A | DevelopmentGrant・AgentTaskが読み取り専用でARCから確認可能。write操作は未公開（変化なし） |
| Program B | Mobile Ingress・Sync Workerのローカルモデル完成（`pnpm mobile-ingress`・`pnpm mobile-sync`）。クラウドデプロイ・本番URL公開はActivation Gate待ち |
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
| ARC-PM-014 | P2 | 「現在退避中の16件」の実体不明 | Version35でOwner指示にあった16件のimport対象を全リポジトリ検索したが該当データ・形式仕様を発見できず。`Version35_Decision_Packet.md`でOwner確認事項として提起済み。判明次第、既存Bridge Layer（`ImportLogsUseCase`）で取り込む方針は決定済み（ADR 0065） |

解決済み（Open Issuesから除外）：
- **ARC-PM-003**（Claude許可設定の`rm -rf data`）：OwnerがWindowsローカル側で該当許可2件を除去し、JSON正常性を確認済み（Version30、2026-07-19）。
- **ARC-PM-002**（JSON生活データのbackup/restore/schema migration契約なし）：Version31で解決。`jsonStore.ts`のatomic書き込み化、`BackupService`・`pnpm backup create/list/restore`、世代retention（既定10世代）を実装し、実機で復元演習を確認済み。schemaVersionはmanifestレベル（`"1"`）のみ、行レベルは次Version以降（ADR 0058「未決定」参照）。

## 現在の目標・次のマイルストーン

**Program B**: Architecture Gate論点整理（ADR 0064）とMobile Ingressデータ契約（ADR 0065）は完了。ローカルMVP（`pnpm mobile-ingress` / `pnpm mobile-sync`）を実装・実機確認済み。次はVersion36として同じローカルMVPの完成度を上げる（Owner指示により継続可）。クラウドへのActivation Gate（vendor選定・実デプロイ・本番URL公開）はOwner確認事項（`Version35_Decision_Packet.md`）待ちで、契約・課金・秘密情報設定は未実施のまま凍結する。

**Stability Gate**: 残りARC-PM-005〜010を閉じる。ARC-PM-001は本番反映（Owner Action）のみ残存、ARC-PM-002〜004は解消済み。外部公開、認証、秘密情報、データ削除はOwner承認が必要。

## 技術的負債

- P0: なし（ARC-PM-002は解決、ARC-PM-001は本番反映のみ残存）
- P1: build、契約同期、巨大module、model重複、release管理、文書正本
- P2: 命名・template・歴史資料、Docker/Supabase説明、apiKeyAuthのtiming-safe化、Entity行レベルschemaVersion、「16件」の実体不明（ARC-PM-014）

## 停止中タスク

- OAuth本番有効化: 準備完了（Version30）。Owner承認と接続再設定待ち——`docs/setup/remote-mcp-oauth-migration.md`のチェックリストで一度で実行できる
- Program B（Mobile Ingress）クラウドActivation Gate: ローカルMVPは完成済み（Version35）。vendor選定（ADR 0064はCloudflare Workersを暫定候補と仮置きのみ）・実デプロイ・cost上限確定はOwner確認事項（`Version35_Decision_Packet.md`）待ち
- 「現在退避中の16件」の実体確認: Owner確認事項（ARC-PM-014、`Version35_Decision_Packet.md`）
- `STUDY_TIMER_API_TOKEN`と実timer疎通: Owner作業
- StudyLog配線: StudySessionとのmodel判断待ち

## 更新ルール

Version開始・完了、Priority変更、Owner判断、停止・再開時に更新する。履歴はReport / Developer Feedbackへ置き、ここには現在形だけを書く。
