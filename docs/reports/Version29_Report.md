# Version29 Report: Runner Control Plane

## Outcome

Collaboration RunnerとCheck-In Prompterを共通Control Planeへ接続し、build-aware状態記録、単一インスタンス制御、共通kill switch、状態CLIを実装した。

## Completed functionality

- `executeControlledRun()`による共通実行ライフサイクル
- outcome: running / succeeded / failed / skipped-locked / disabled
- Version28 Capability Registry由来のprojectVersion・buildCommit記録
- Runner別状態ファイルによる同時書込競合回避
- 既存lock/logパスを維持した重複実行防止
- 全Runner共通kill switch
- `pnpm runner-control status|disable|enable`
- Windows CLIが無処理で終了していた`isMainModule`既存不具合の修正

## Verification

- TypeScript typecheck: 合格
- ESLint（Version29変更ファイル）: 合格
- 実CLI `pnpm runner-control status`: `disabled: false`を表示し正常終了
- Control Plane、CLI、kill switch、成功・失敗・ロックスキップの自動テストを追加
- Vitestは当該Codex隔離環境でesbuild設定ロード前に親ディレクトリ読取を拒否され未実行。別のGit書込可能セッションで全件確認してからコミットする

## Security and scope

kill switchは停止方向にのみ作用し、実行中プロセスを強制終了しない。自動再起動、タスクスケジューラ変更、外部公開、認証、秘密情報、有料サービス、Constitution/Principles変更は行っていない。

## Follow-up

実運用では各Runnerを1回実行し、状態ファイルとbuildCommitが正しく記録されることを確認する。将来の自動再起動は、本番変更・誤停止リスクを伴うため別VersionでOwner承認を得て検討する。
