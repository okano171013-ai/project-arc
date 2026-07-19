# Project ARC — PM Status

最終監査日: 2026-07-19（Version30時点に更新）  
基準HEAD: Version30コミット（commit hashはVersion30_Report.md参照）  
作業ツリー: `.claude/settings.local.json`のみ未追跡（ローカル設定、対象外）。

## 5分サマリー

Version1〜30まで完了。local生活記録、Google連携、検索・意思決定支援、HTTP/MCP、提案承認、Agent協調、Life Log、行動介入、Study Session、Capability Registry、Runner Control Planeまで到達した。設計思想はOwner主権、Systemは判断しない、local-first、層境界の維持。

Version30でRemote MCP OAuthの本番移行準備（security review・記録整合・活性化チェックリスト）を完了した。**本番`.env`への反映・プロセス再起動・ChatGPT Connector再設定はOwner Action待ちのまま**（実施していない）。新機能より、JSONデータ復旧、build再現性、文書の単一情報源化を引き続き優先する。

## 現在の進捗

| 項目 | 状態 |
|---|---|
| Version1〜29 | 完了 |
| Version30 | 完了（Remote MCP OAuth本番移行準備。本番反映はOwner Action待ち） |
| Typecheck / Lint | 2026-07-19合格（Version30時点で再確認） |
| Build | 不合格。TS2742と`dist`書込競合（Version30スコープ外、ARC-PM-005として継続） |
| Test | Version30時点512件合格 |
| Remote MCP | 認証の実装・テストは完備（Version22）。**本番は今なお無認証**（ADR 0051の「有効化した」という記録は誤りだったとVersion30で判明、訂正済み） |

## Open Issues

| ID | Priority | Issue | 状態 / 完了条件 |
|---|---|---|---|
| ARC-PM-001 | P0 | 公開Remote MCPが無認証 | **実装済み・テスト済み（Version22、Version30でsecurity review完了）。本番`.env`有効化のみ未実施** — Owner Actionのみ残存。手順は`docs/setup/remote-mcp-oauth-migration.md`（Version30改訂、one-shot checklist） |
| ARC-PM-002 | P0 | JSON生活データにbackup / restore / schema migration契約がない | 自動backup、世代保持、復旧演習、schemaVersion |
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

解決済み（Open Issuesから除外）：**ARC-PM-003**（Claude許可設定の`rm -rf data`）はOwnerがWindowsローカル側で該当許可2件を除去し、JSON正常性を確認済み（Version30、2026-07-19）。

## 現在の目標・次のマイルストーン

**Stability Gate**: 残りARC-PM-002・005〜010を閉じる。ARC-PM-001は本番反映（Owner Action）のみ残存、ARC-PM-003・004は解消済み。外部公開、認証、秘密情報、データ削除はOwner承認が必要。

## 技術的負債

- P0: データ耐久性（ARC-PM-002）
- P1: build、契約同期、巨大module、model重複、release管理、文書正本
- P2: 命名・template・歴史資料、Docker/Supabase説明、apiKeyAuthのtiming-safe化

## 停止中タスク

- OAuth本番有効化: 準備完了（Version30）。Owner承認と接続再設定待ち——`docs/setup/remote-mcp-oauth-migration.md`のチェックリストで一度で実行できる
- `STUDY_TIMER_API_TOKEN`と実timer疎通: Owner作業
- StudyLog配線: StudySessionとのmodel判断待ち
- 新機能: Stability Gate完了まで原則停止を推奨

## 更新ルール

Version開始・完了、Priority変更、Owner判断、停止・再開時に更新する。履歴はReport / Developer Feedbackへ置き、ここには現在形だけを書く。
