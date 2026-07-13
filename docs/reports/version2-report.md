# Project ARC — Version2 完了報告

作成者：Claude Code　/　宛先：ARC（ChatGPT）・Owner
日付：2026年7月10日

---

## 1. 概要

Version2のテーマ「**ARCと一日を始め、ARCと一日を終える**」に沿って、
Project ARCを初めて「毎日使えるプロダクト」にした。機能数よりUXを
優先する方針のもと、3つの機能を実装し、いずれもOwnerの実機（Windows）
での動作確認まで完了している。

**結論：Version2のDefinition of Doneを全項目達成し、完了。**

---

## 2. 実装した機能

### ① Morning Brief（`pnpm morning`）

今日の日付・曜日、今日の予定/やること/フォーカス（3件）、前日の
勉強時間・支出、メッセージを表示する。予定・タスク・フォーカスは
Version2時点ではダミーデータ（Google Calendar未連携のため）だが、
少林寺拳法の固定曜日（火・金・日）だけは実際のスケジュールと
矛盾しないよう反映した。前日の勉強時間・支出は、Evening Reflectionで
記録した実データを参照して表示する。

### ② Evening Reflection（`pnpm reflect`）

記録項目を拡張：今日頑張ったこと・授業/塾講師出席・予定達成・
勉強時間・支出・睡眠時間・気分・明日の目標。記録の最後に
**100点満点の参考スコア**を算出して表示する。

スコアは基準点50点に対し、勉強時間（最大+20）・予定達成（+10）・
授業出席（+10）・睡眠6時間以上（+10）・気分（-10〜+10）を加減点する
機械的な指標であり、「その日の価値を断定する評価ではない」ことを
CLI上にも明記している（Principles: 推測は推測として扱う）。

### ③ Life Inventory（`pnpm inventory`）

持ち物管理のMVP。カテゴリ（財布・傘・シェーバー・スキンケア・靴・
服・ガジェット・その他）ごとに追加・一覧・更新ができる。
写真保存・画像解析はVersion3以降に延期。

---

## 3. アーキテクチャ上の判断

### ADR 0003：ローカルJSON永続化を採用

Version1のADR 0001で「Supabase CLIによるローカルPostgres」を決定
していたが、実際のセットアップ（Docker含む）はまだ完了していない
状態だった。Version2は「今すぐ毎日使えること」が目的のため、
セットアップ不要な**ローカルJSONファイル**（`data/`配下）を
既定の永続化先とした。

Repositoryパターンにより、この変更はAdapters層の追加のみで完結し、
Domain/Application層への影響はない。Supabase経路（`--db=supabase`）
も引き続き利用可能な状態で残している。

---

## 4. 品質保証（Definition of Done）

| 項目 | 結果 |
|---|---|
| `pnpm test`（13件） | ✅ 全て成功 |
| `pnpm typecheck` | ✅ エラーゼロ |
| `pnpm lint` | ✅ エラーゼロ |
| `pnpm morning` | ✅ 実機動作確認済み |
| `pnpm reflect` | ✅ 実機動作確認済み（スコア表示含む） |
| `pnpm inventory -- add/list/update` | ✅ 実機動作確認済み |

テストは、Reflectionのスコア計算（境界値含む）、Inventoryの
追加・絞り込み・更新・異常系、Morning Briefの前日データ有無の
両パターンをカバーしている。

---

## 5. 実装中に見つけて修正した不具合

CTOレビュー（実装時の目視レビュー・実機での対話デバッグ）を通じて、
以下を検出・修正した。いずれもリリース前に解消済み。

1. **Supabaseアダプタの型不整合** — `didMartialArts`等をVersion2で
   任意項目化した影響で、Supabase保存時の型エラーが発生 → デフォルト
   値で解消。あわせて新フィールド（頑張ったこと等）がSupabase側に
   保存されない欠落も修正。
2. **InventoryItemの更新日時が保存時にリセットされるバグ** —
   永続化からの復元時に`updatedAt`が`createdAt`と同一になっていた
   → 復元専用の`restore()`ファクトリを追加して解消。
3. **CLIのサブコマンド判定漏れ** — `pnpm inventory -- add`実行時、
   pnpmが渡す`--`という文字列自体を誤ってサブコマンドとして
   認識していた → `--`を除外するよう修正。
4. **全角スペースによるLintエラー** — 表示整形のために使っていた
   全角スペースが`no-irregular-whitespace`に抵触 → 半角スペースに
   置き換え。

---

## 6. 環境構築で発生した問題（開発環境側の記録）

Owner環境（Windows）での初回セットアップ時、以下が障害になった。
Version3以降のセットアップ手順書に活かす。

- Node.js未インストール状態からのインストール
- `corepack enable`が権限エラー（`Program Files`書き込み不可）で
  失敗 → `npm install -g pnpm`で代替
- `esbuild`のビルドスクリプトがpnpmの`ignoredBuilds`により
  ブロックされ続けた → `pnpm-workspace.yaml`に
  `allowBuilds: { esbuild: true }`を明記することで恒久的に解消
  （`onlyBuiltDependencies`だけでは不十分だった）

---

## 7. Version3への申し送り事項

- Google Calendar / Google Tasks連携（Morning Briefのダミーデータを
  実データに置き換え）
- Supabaseクラウド同期（ローカルJSON → Supabaseへの移行、ADR 0003の
  見直し）
- Life Inventoryへの写真保存・画像解析
- Decision Engine、通知機能

---

*本報告書はClaude Codeの責務範囲（システム構築・実装）に基づき作成。
優先順位判断・次バージョンの意思決定はARCおよびOwnerに委ねる
（`docs/ai-roles.md`参照）。*
