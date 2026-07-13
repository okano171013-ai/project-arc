# Project ARC — Claude Codeへの指示

コードを読む前に、まず`docs/vision.md` / `docs/principles.md` /
`docs/ai-roles.md` / `docs/architecture.md` / `docs/roadmap.md` /
`docs/dod.md`を読むこと。判断に迷ったら`docs/principles.md`の
Principleに立ち返る。

## セッション開始時に必ず確認すること

1. `docs/handoff/ARC_INBOX.md` — ARC（ChatGPT）からの最新の指示書が
   更新されていないか確認する。更新されていれば、それが最新の
   作業指示である（Ownerに聞き直さなくてよい）。
2. `docs/dod.md` — 直近Versionの完了チェックリストの状態。
3. `git log` / `git status` — 前回セッションでの未完了・未コミット
   作業がないか。

## 進め方（Owner指示、2026年7月）

- **確認を減らし、自律的に進める**。実装方針・スコープの細部・
  ドキュメント構成など、ルーティンな判断はOwnerに確認を取らずに
  Claude Codeが決めてよい。
- **ARCとの設計相談が必要な場面でも、Claude Codeが判断して進める**。
  ARC（ChatGPT）とは現時点でAPI連携がなく、この場から直接相談する
  ことはできない（`docs/handoff/README.md`参照）。判断根拠は
  Version Report・ADR・`docs/handoff/`に記録し、後からOwner/ARCが
  検証できるようにする。
- 確認・承認が必要なのは、真に不可逆または前提を左右する判断のみ
  （破壊的なgit操作、Project ARC自身のガバナンス原則
  （`docs/ai-roles.md`）と衝突しかねない設計判断、等）。

## ARC ⇄ Claude Code 引き継ぎ運用

詳細は[`docs/handoff/README.md`](./docs/handoff/README.md)。要約：

- **受信**：`docs/handoff/ARC_INBOX.md`にARCの指示書が来る。
- **送信**：Version完了ごとに`docs/reports/VersionN_ARC_Feedback.md`
  を生成し、`docs/handoff/LATEST_ARC_FEEDBACK.md`のポインタを更新する。

## Version完了時の標準フロー

1. `pnpm test` / `pnpm typecheck` / `pnpm lint` を緑にする
2. 必要なADRを追加・更新する
3. `docs/roadmap.md` / `docs/dod.md` / `README.md`を実態に合わせて更新
4. `docs/reports/VersionN_Report.md`（13章構成、`docs/reports/TEMPLATE.md`
   準拠）と`docs/reports/VersionN_ARC_Feedback.md`を生成
5. `docs/handoff/LATEST_ARC_FEEDBACK.md`のポインタを更新
6. コミット（対話式CLIの実機確認が必要な変更は、可能な限り
   `child_process.spawn`ベースの擬似expectドライバで駆動して確認する
   — サンドボックス環境ではreadline/promisesが非TTY入力を正しく
   処理できないため、単純なパイプ入力では検証できない）

## 対話式CLIの実機確認について

このプロジェクトのCLIは全て`readline/promises`による対話式。
Node.jsの`readline/promises`は非TTY標準入力（パイプ・ファイル
リダイレクト）に対して複数の`rl.question()`を連続で呼ぶと2問目以降を
取りこぼす（Version6で原因特定）。検証する際は、プロンプト文字列の
出力を検知してから次の回答を送る簡易自動化スクリプト（本セッションで
使用したパターン、`child_process.spawn`ベース）を都度作成して駆動する。
検証用データ・スクリプトは確認後に削除する。
