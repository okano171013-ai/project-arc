# Project ARC — PM Status

最終監査日: 2026-07-19（Version32時点に更新）  
基準HEAD: `db0378b`（Version32）  
作業ツリー: `.claude/settings.local.json`のみ未追跡（ローカル設定、対象外）。

## 5分サマリー

Version1〜32まで完了。local生活記録、Google連携、検索・意思決定支援、HTTP/MCP、提案承認、Agent協調、Life Log、行動介入、Study Session、Capability Registry、Runner Control Plane、Data Durabilityまで到達した。設計思想はOwner主権、Systemは判断しない、local-first、層境界の維持。

Version30でRemote MCP OAuthの本番移行準備を完了（**本番`.env`反映はOwner Action待ち**）。Version31でdata foundation（atomic書き込み・汎用backup/restore・retention・restore drill）を完了し、ARC-PM-002を解決した。Version32でProgram A/B着手前ADR6本すべて（0058〜0063）が出揃った。

**Version33以降はProgram A（Owner非介在の自律共同開発環境）の
基盤工程に着手する**（Owner指示、2026-07-19）：ADR 0060・0061に
基づきDevelopmentGrant・AgentTask Entityを実装する。Program B
（Mobile Daily Capture）はADR 0062のArchitecture Gate
（cloud候補・cost上限のOwner確認）待ちのまま。

## 現在の進捗

| 項目 | 状態 |
|---|---|
| Version1〜31 | 完了 |
| Version32 | 完了（Program A/B着手前ADR4本：0060〜0063、設計のみ・コード変更なし） |
| Typecheck / Lint | 2026-07-19合格（Version31時点で再確認） |
| Build | 不合格。TS2742と`dist`書込競合（Version31スコープ外、ARC-PM-005として継続。Version31起因ではないことを確認済み） |
| Test | Version31時点527件合格 |
| Remote MCP | 認証の実装・テストは完備（Version22）。**本番は今なお無認証**（ADR 0051の「有効化した」という記録は誤りだったとVersion30で判明、訂正済み） |
| Data Durability | `pnpm backup create/list/restore`が動作。実機で復元演習（backup→データ削除→restore→内容一致）を確認済み |

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

## 現在の目標・次のマイルストーン

**Stability Gate**: 残りARC-PM-005〜010を閉じる。ARC-PM-001は本番反映（Owner Action）のみ残存、ARC-PM-002〜004は解消済み。外部公開、認証、秘密情報、データ削除はOwner承認が必要。Version32以降はOwner Priority Programsに従いProgram A/Bへ移行する（Architecture Gateでcloud候補・cost上限をOwner確認してから実装着手）。

## 技術的負債

- P0: なし（ARC-PM-002は解決、ARC-PM-001は本番反映のみ残存）
- P1: build、契約同期、巨大module、model重複、release管理、文書正本
- P2: 命名・template・歴史資料、Docker/Supabase説明、apiKeyAuthのtiming-safe化、Entity行レベルschemaVersion

## 停止中タスク

- OAuth本番有効化: 準備完了（Version30）。Owner承認と接続再設定待ち——`docs/setup/remote-mcp-oauth-migration.md`のチェックリストで一度で実行できる
- Program B（Mobile Ingress）実装: Architecture Gate（cloud候補・cost上限・data保管地域のOwner確認）待ち——ADR 0059はProposedで設計のみ完了
- `STUDY_TIMER_API_TOKEN`と実timer疎通: Owner作業
- StudyLog配線: StudySessionとのmodel判断待ち

## 更新ルール

Version開始・完了、Priority変更、Owner判断、停止・再開時に更新する。履歴はReport / Developer Feedbackへ置き、ここには現在形だけを書く。
