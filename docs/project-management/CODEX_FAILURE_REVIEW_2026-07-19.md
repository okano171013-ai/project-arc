# Codex Failure Review and Recovery Plan

作成日: 2026-07-19  
対象: PM監査セッションで発生したGit状態の誤報、意図しない入れ子複製、並行作業リスク、build結果の混同

## 失敗

1. 最終報告前にGitを再確認せず、push済み成果物を「未commit」と報告した。
2. repository外からの絶対path編集で、意図しない`project-arc/`入れ子複製を発生させた。
3. Claude Code / Codexが同一branchを扱う可能性を、編集前に明示的に調整しなかった。
4. build失敗について、sandboxの書込制限・生成物競合・実codeのTS2742を十分に分離しなかった。

## 根本原因

- 作業開始時の確認は行ったが、編集後・報告直前の再検証gateがなかった。
- toolのpath解決仕様を検証せず、大きなpatchを一度に実行した。
- branch ownershipが口頭運用で、lockやhandoff状態として管理されていなかった。
- commandの終了結果より途中出力を先に解釈した。

## 恒久対策

### 3点Git確認

- 作業開始時: branch、HEAD、upstream、status、既存差分
- 編集直後: 自分が追加したpath、想定外の未追跡file/directory、diff
- 最終報告直前: branch、HEAD、ahead/behind、commit/push状態、status

Git状態は推測や過去の観測ではなく、最終確認結果だけを報告する。

### File操作

- repository root外から編集する場合、最初に1つの小さな検証fileでpath解決を確認する。
- 大規模patchを分割し、各patch後に`git status --short`を確認する。
- 想定外directoryを検出したら作業を止め、生成時刻と作業前statusから所有関係を確認する。
- destructive削除ではなく、可能なら検証済み一時領域へ退避する。

### 並行開発

- 1 branch 1 writerを原則とする。
- PMがVersionごとに主担当をClaude Code / Codexのどちらかへ割り当てる。
- 非担当Agentはread-only review、相談、計画に限定する。
- 引継ぎ時はbranch、HEAD、未commit差分、担当、禁止操作を明記する。

### 検証結果の分類

失敗を以下へ分けて報告する。

- Code failure: 型、test、lint、contract違反
- Environment failure: sandbox、permission、runtime不足
- Contention failure: lock、稼働process、生成物競合
- Not executed: 実行していない、または完了を確認できない

複数原因がある場合は併記し、未完了commandを成功扱いしない。

## 今後の確認チェックリスト

- [ ] 作業開始時Git確認
- [ ] branch writerの明示
- [ ] 小規模path検証
- [ ] patchごとのstatus確認
- [ ] code / environment / contentionの分類
- [ ] 想定外artifactの確認
- [ ] 報告直前Git確認
- [ ] commit / push状態を実測値で報告

## 今回の是正状況

- 入れ子複製: repository外の一時領域へ退避済み
- PM成果物: commit `6f6c47c`へ含まれ、remoteへpush済みと再確認
- Version30 branch writer: Claude Code
- Codex: Version30中は同一branchへの実装書込を停止
- ARC-PM-003: Windows local Claude設定から`rm -rf data`を含む2つの許可を除去
