# Version29 ARC向けFeedback

Version29「Runner Control Plane」を実装しました。

Collaboration RunnerとCheck-In Runnerは、実行のたびに共通形式で状態を残します。`pnpm runner-control status`で最終結果、時刻、Project ARC Version、build commitを確認できます。緊急停止時は`pnpm runner-control disable "理由"`、再開時は`pnpm runner-control enable`を使用します。

実機確認で、既存の共通`isMainModule()`がRunner本体ではなく`runnerLock.ts`のURLを比較しており、`pnpm runner`・`pnpm checkin-runner`が処理を実行せず終了し得る不具合を発見しました。呼び出し元URLを明示する形へ修正し、Windowsのパス大小差も吸収しています。

本Versionは自動再起動や強制終了を行いません。古いbuildは状態から検出できますが、再起動は本番変更としてOwner確認境界を維持します。認証・外部公開・秘密情報・Constitution/Principles変更はありません。

詳細: `docs/reports/Version29_Report.md`、ADR 0056、`docs/setup/runner-control-plane.md`。
