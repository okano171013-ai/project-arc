# Project ARC — Codexへの指示

コードを読む前に、まず`docs/constitution.md`（最上位、7条文） /
`docs/vision.md` / `docs/principles.md` / `docs/ai-roles.md` /
`docs/architecture.md` / `docs/roadmap.md` / `docs/dod.md`を読む
こと。判断に迷ったら`docs/constitution.md`→`docs/principles.md`の
Principleの順に立ち返る。

## セッション開始時に必ず確認すること

1. `docs/handoff/ARC_INBOX.md` — ARC（ChatGPT）からの最新の指示書が
   更新されていないか確認する。更新されていれば、それが最新の
   作業指示である（Ownerに聞き直さなくてよい）。
2. **`agent_message_list`（`direction: "ToClaudeCode"`）** — Version19
   以降、ARCはRemote MCP経由でProject ARCへ直接指示書を書き込める
   （ADR 0044・0045）。`ARC_INBOX.md`を経由しない指示書が届くことが
   あるため、`.mcp.json`経由で接続済みのstdio MCP tool
   （`agent_message_list`）で未対応のメッセージがないか必ず確認する。
   対応したら`docs/handoff/archive/VersionN_ARC_Brief.md`へ保管する
   （手順は`docs/handoff/README.md`参照）。
3. `docs/dod.md` — 直近Versionの完了チェックリストの状態。
4. `git log` / `git status` — 前回セッションでの未完了・未コミット
   作業がないか。

## 進め方（Owner指示、2026年7月）

- **確認を減らし、自律的に進める**。実装方針・スコープの細部・
  ドキュメント構成など、ルーティンな判断はOwnerに確認を取らずに
  Codexが決めてよい。
- **ARCとの設計相談が必要な場面でも、Codexが判断して進める**。
  Version19以降、ARCとはRemote MCP経由の生きた接続があるが（ADR
  0044）、それでも設計判断はこの場（Codexのセッション）で
  完結させ、ARCの同期的な応答を待たない——応答が来る保証がない
  ため（`docs/handoff/README.md`参照）。判断根拠はVersion Report・
  ADR・`docs/handoff/`に記録し、後からOwner/ARCが検証できるように
  する。
- 確認・承認が必要なのは、真に不可逆または前提を左右する判断のみ
  （破壊的なgit操作、Project ARC自身のガバナンス原則
  （`docs/ai-roles.md`）と衝突しかねない設計判断、等）。

## ARC ⇄ Codex 引き継ぎ運用

詳細は[`docs/handoff/README.md`](./docs/handoff/README.md)。要約：

- **受信（2経路が併存）**：①`docs/handoff/ARC_INBOX.md`にARCの
  指示書が貼り付けられる（従来からのファイルベース経路）。②Version19
  以降、ARCがRemote MCP経由で`AgentMessage`（`direction:
  "ToClaudeCode"`）として直接書き込む（上記チェックリスト参照）。
  どちらも同格に扱い、両方を確認する。
- **送信**：Version完了ごとに`docs/reports/VersionN_ARC_Feedback.md`
  を生成し、`docs/handoff/LATEST_ARC_FEEDBACK.md`のポインタを更新する
  （ファイルベース経路）。あわせて`AgentMessage`（`direction:
  "ToARC"`）でも完了報告をProject ARCへ保存する（Owner承認必須、
  ライブ経路）。

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

## HTTP API（ARC Connector）の検証について

`pnpm run api`のHTTP APIはCLIと異なりTTYの制約を受けず、Node標準の
`fetch`で完全に自動テストできる（Version7参照）。ただし**Git Bash上
で`curl -d`に日本語を含むJSONを渡すと、シェル層の文字コード問題で
文字化けする**（サーバー・curl自体の不具合ではない）。日本語を含む
リクエストで動作確認する際は、`curl`ではなく`node -e "fetch(...)"`
を使うこと。

