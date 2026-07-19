# Project ARC — PM Status

最終監査日: 2026-07-19  
基準HEAD: `8e1a9eb`（Version28）  
作業ツリー: Version29 Runner Control Planeが未コミットで進行中。PM監査では既存差分を編集していない。

## 5分サマリー

Version1〜28まで完了。local生活記録、Google連携、検索・意思決定支援、HTTP/MCP、提案承認、Agent協調、Life Log、行動介入、Study Session、Capability Registryまで到達した。設計思想はOwner主権、Systemは判断しない、local-first、層境界の維持。

ただし機能拡張が運用基盤を上回った。新機能より、Remote MCP認証、JSONデータ復旧、Version29安全完了、build再現性、文書の単一情報源化を優先する。

## 現在の進捗

| 項目 | 状態 |
|---|---|
| Version1〜28 | 完了 |
| Version29 | 進行中・未コミット・全ゲート未完了 |
| Typecheck / Lint | 2026-07-19合格 |
| Build | 不合格。TS2742と`dist`書込競合 |
| Test | V28時点505件合格の記録。V29全件は未完了 |
| Remote MCP | 稼働実績あり・無認証公開設計 |

## Open Issues

| ID | Priority | Issue | 状態 / 完了条件 |
|---|---|---|---|
| ARC-PM-001 | P0 | 公開Remote MCPが無認証 | Owner Action。認証強制と否定テスト |
| ARC-PM-002 | P0 | JSON生活データにbackup / restore / schema migration契約がない | 自動backup、世代保持、復旧演習、schemaVersion |
| ARC-PM-003 | P0 | Claude許可設定に`rm -rf data` | 許可除去、削除をOwner専権化 |
| ARC-PM-004 | P0 | Version29未コミット・未検証 | 差分review、全gate、独立commit |
| ARC-PM-005 | P1 | Build再現不能 | clean環境とCIでbuild成功 |
| ARC-PM-006 | P1 | Roadmap / README / DoD / Reportsの重複・矛盾 | 本文書を現況の唯一の入口にする |
| ARC-PM-007 | P1 | OpenAPIが主要10 endpoint限定 | API契約の単一情報源と差分検知 |
| ARC-PM-008 | P1 | `server.ts`等の巨大化と多層同期漏れ | module分割、contract test |
| ARC-PM-009 | P1 | StudyLog / StudySession / Task未整理 | ADRでcanonical modelを決定 |
| ARC-PM-010 | P1 | package `0.20.0`とProject Version不一致 | release identity規約 |
| ARC-PM-011 | P2 | ADR status・形式不統一 | ADR indexとtemplate |
| ARC-PM-012 | P2 | AGENTS / CLAUDE重複、Claude偏重 | 共通規約へ集約 |

## 現在の目標・次のマイルストーン

**Stability Gate**: ARC-PM-001〜005を閉じる。外部公開、認証、秘密情報、データ削除はOwner承認が必要。

## 技術的負債

- P0: 公開認証、データ耐久性、破壊的許可、V29未完了
- P1: build、契約同期、巨大module、model重複、release管理、文書正本
- P2: 命名・template・歴史資料、Docker/Supabase説明

## 停止中タスク

- OAuth本番有効化: Owner承認と接続再設定待ち
- `STUDY_TIMER_API_TOKEN`と実timer疎通: Owner作業
- StudyLog配線: StudySessionとのmodel判断待ち
- 新機能: Stability Gate完了まで原則停止を推奨

## 更新ルール

Version開始・完了、Priority変更、Owner判断、停止・再開時に更新する。履歴はReport / Developer Feedbackへ置き、ここには現在形だけを書く。
