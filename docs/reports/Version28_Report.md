# Version28 Report: Remote MCP Capability Registry

**コミットハッシュ**：`b72b2ff`（`feature/v4-v6-smart-capture`ブランチ）

## Outcome

ローカルstdio・Remote MCP・ChatGPTでMCP構成の差異を検出するため、読み取り専用Tool `capability_registry_get` を実装した。

## Completed functionality

- Capability Registry schema `1.0.0`
- Project ARC Version、起動中build commit、Tool数・Tool名、Proposal型を一括取得
- `MCP_TOOL_NAMES`による24 Toolの単一正本化
- `PROPOSAL_TYPES`を再利用し、Proposal型の二重定義を回避
- Git commitは`ARC_BUILD_COMMIT`優先、`.git/HEAD`フォールバック、取得不能時`unknown`
- stdioとRemote MCPで同一Registryを提供
- Registry一覧と実際の`tools/list`が一致する統合テスト

## Verification

- TypeScript typecheck: 合格
- ESLint（Version28変更ファイル）: 合格
- 実stdio MCP Client: 24 Toolを取得
- `capability_registry_get`: toolCount 24、Proposal型16、buildCommit `c0b375383c6e47f02c4080406db2c3a70b8ec34b` を取得
- 実装時点ではCodex隔離環境でesbuildがリポジトリ親ディレクトリを読めず、
  Vitest設定ロード前に停止していた（コード起因の失敗ではない）。
  Claude Code側の別セッションで`pnpm test`を実行した結果、505件全て
  緑（Version27完了時点504件から+1件）であることを確認済み

## Security and scope

本Versionは読み取り専用診断情報のみを追加した。秘密情報、認証変更、外部公開範囲、有料サービス、不可逆操作、Constitution/Principles変更はない。commit hashは公開リポジトリ状態の識別子として扱い、認可には利用しない。

## Follow-up

Version29 Runner Control PlaneでRegistryを起動時に読み、古いbuild・Tool差異を検出した場合に再起動候補として通知する。自動停止・自動再起動はkill switchと復旧設計を伴うためVersion28では実装しない。
