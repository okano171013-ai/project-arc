# ADR 0056: Version29 Runner Control Plane

## Status

Accepted（2026-07-18）

## Context

Collaboration Runner（Version20）とCheck-In Prompter（Version26）は、ロックとログの一部を共有していたが、共通の稼働状態、build識別、停止制御を持たなかった。また、共通`isMainModule()`が自分自身の`import.meta.url`を比較していたため、Runner本体から呼んでも常にfalseとなり、CLI実行が処理を開始せず正常終了する既存不具合が実機確認で判明した。

## Decision

`runnerControlPlane.ts`を追加し、両Runnerを共通の`executeControlledRun()`で包む。

- 全Runner共通kill switch: `data/runner-control/disabled.json`
- Runner別状態: `data/runner-control/status/<runner>.json`
- 状態にはrunId、outcome、開始/終了時刻、Project ARC Version、buildCommit、失敗理由を記録
- 既存のRunner別lock/logパスは後方互換のため維持
- 状態ファイルをRunner別に分け、同時実行時の上書き競合を避ける
- `pnpm runner-control status|disable|enable`で人間が観測・停止・再開できる
- 自動再起動やプロセス終了は行わない。Version28 Registry由来のbuild情報を記録し、判断材料のみ提供する

`isMainModule(moduleUrl)`へ呼び出し元URLを明示的に渡すよう修正し、Windowsのドライブ文字大小差も正規化する。

## Consequences

- 両Runnerの成功・失敗・重複スキップ・停止状態を同じ形式で確認できる。
- kill switchは次回Runner起動をfail-closedで停止する。実行中プロセスの強制終了はしない。
- 古いbuildは状態から検出可能だが、自動再起動はしないため不可逆・高影響操作を増やさない。
- 認証、外部公開範囲、秘密情報、Constitution/Principlesは変更しない。
