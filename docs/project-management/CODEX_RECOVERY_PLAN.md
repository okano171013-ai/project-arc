# Codex Recovery Plan

Claude CodeとCodexが同じブランチ（`feature/v4-v6-smart-capture`）に
書き込む際の衝突回避と、Codex側で発生した既知の制約からの復旧手順を
まとめる。`docs/governance/DEVELOPMENT_RULES.md`（Claude Code・Codex
共通規約）を前提とし、本文書はそれをCodex固有の運用に絞って補う。

## 1. 背景

- Codexの実行環境は、リポジトリの親ディレクトリ読み取りが制限されて
  おり、Vitestのesbuild設定ロードが失敗して`pnpm test`を実行できない
  （Version28・Version29の両方で実際に発生、`docs/reports/
  Version29_Report.md`「Verification」節に記録あり）。
- このため、Codexが実装した変更は、typecheck/lintはCodex環境で確認
  できても、**test実行だけは別セッション（Claude Codeの通常セッション、
  またはtestが通る別環境）での確認が必要**という非対称な制約が
  恒常的に存在する。
- Version28では、Codexが実装・未コミットのまま残していた変更を、
  別セッションのClaude Codeがレビュー・全テスト確認した上でコミット
  した前例がある。本文書はこのパターンを再現可能な手順として明文化
  する。

## 2. 同一ブランチへの同時書き込みを避ける基本ルール

1. **一度に書き込むのは1エージェントのみ**とする。Claude Codeが
   Versionに着手する際は、Owner経由でCodexに書き込み停止を依頼し、
   Codexは`git add` / `git commit` / `git push`を控える
   （2026-07-19、Version30着手時に実施した運用そのもの）。
2. 書き込みを再開してよいのは、以下のいずれかが揃ってから。
   - 作業中のエージェントがVersionを完了しpush済み
   - Owner本人が明示的に「再開してよい」と伝えた
3. 停止中のCodexは、ローカルの作業ツリーに変更を貯めておいてよい
   （コミットもしない）。貯めた変更は3章の手順で安全に合流させる。

## 3. Codex側の変更を安全に合流させる手順

Codexが書き込み停止中に作業を進めていた場合（またはCodex環境の制約で
未検証のまま残っている場合）：

1. Codex側で`git status`を確認し、コミットしていない変更点を把握する。
2. Codex環境で実行可能な範囲（`pnpm typecheck` / `pnpm lint`）を先に
   確認する。
3. **`pnpm test`はCodex環境では信頼しない**——2章の制約により、
   Codex環境での「テストが通った」という報告だけでコミット済みとは
   扱わない。
4. Claude Codeの別セッション（または`pnpm test`がフルセットで動く
   環境）で、Codexの変更を取り込んだ状態から`pnpm test` /
   `pnpm typecheck` / `pnpm lint` / `pnpm build`を全て実行し、
   グリーンを確認してから初めてコミットする（Version28の前例と
   同じ手順）。
5. コミットメッセージに「Codex側で実装・レビューはClaude Code」の
   旨を明記する（Version28のコミットメッセージが前例）。

## 4. `git pull`で衝突した場合の復旧

Claude Codeが先にpushし、Codex側のローカルが古いHEADのまま変更を
貯めていた場合：

1. Codex側は**force pushしない**（過去の履歴を破壊しないため、
   DEVELOPMENT_RULES.mdの破壊的git操作禁止と同じ理由）。
2. `git fetch origin feature/v4-v6-smart-capture`で最新を取得。
3. Codexのローカル変更を`git stash`で退避し、`git pull --ff-only`
   （またはCodex環境のPull相当操作）でfast-forwardする。
4. `git stash pop`で変更を戻し、コンフリクトがあれば手動解消する
   （Codexが解消できない場合は、Owner経由でClaude Codeセッションに
   引き継ぐ）。
5. 3章の手順（Codex環境ではtestを信頼せず、別セッションで全gate
   確認してからコミット）を再度適用する。

## 5. Owner確認が必要な場合

以下に該当する場合は、どちらのエージェントも単独判断で進めず、
Owner確認を挟む（`docs/governance/DEVELOPMENT_RULES.md`のOwner専権
境界と同じ基準）。

- CodexとClaude Codeの変更が同じファイルの同じ範囲で意味的に矛盾する
  （機械的なdiff解消では済まない）
- どちらの変更を正とするか、実装意図から判断できない
- 復旧のために強制的な履歴書き換え（rebase -i、force push等）が
  必要に見える場合——本文書はそれを許可しない。必要になった時点で
  Owner確認に切り替える

## 6. 今後の改善候補（本文書のスコープ外）

- Codex実行環境のVitest制約自体を解消できないか（`esbuild`設定の
  読み込み経路を変える等）は、Version30のスコープ外の技術的負債
  として別途調査する。
- エージェントごとの書き込み権限をブランチ保護やCIで機械的に強制する
  仕組みは、ARC-PM-005（build再現性）・ARC-PM-008（module分割）の
  後で検討する。
