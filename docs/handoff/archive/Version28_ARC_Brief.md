# Version28 ARC Brief

## Theme

Remote MCP Capability Registry

## Goal

ChatGPT、ローカルstdio、公開Remote MCPでTool定義やProposal型が異なる状態を
機械的に検出する。

## Acceptance criteria

- schemaVersion/buildCommit/toolCount/toolNames/proposalTypesを取得できる
- Registryと実際のMCP Tool一覧が一致する
- stdioとRemote MCPで同一結果を返す
- 認証・公開範囲・書き込み経路を変更しない

## Result

`capability_registry_get`を追加し、24 Tool・16 Proposal型の単一正本を実装。
実stdio MCP Client、typecheck、lintで検証済み。詳細はVersion28 Reportと
ADR 0055を参照。
