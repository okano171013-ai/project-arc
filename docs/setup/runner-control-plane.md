# Runner Control Plane 運用手順

## 状態確認

```powershell
pnpm runner-control status
```

Collaboration RunnerとCheck-In Runnerの最終outcome、実行時刻、build commit、Project ARC Versionを表示する。状態がまだないRunnerは未実行。

## 全Runnerの停止（kill switch）

```powershell
pnpm runner-control disable "メンテナンス理由"
```

次回以降のRunner実行は処理本体へ入る前に停止する。現在実行中のプロセスを強制終了しないため、安全に停止したい場合は実行終了を待つ。

## 再開

```powershell
pnpm runner-control enable
```

kill switchを解除する。Runner自体の起動は既存のWindowsタスクスケジューラが担当する。

## 状態ファイル

- `data/runner-control/disabled.json`
- `data/runner-control/status/collaboration.json`
- `data/runner-control/status/check-in.json`

状態の`buildCommit`が現在の`git rev-parse HEAD`またはMCP `capability_registry_get`と異なる場合、古いプロセスまたは古い実行結果として扱う。自動再起動せず、Owner承認が必要な本番変更として個別に対応する。
