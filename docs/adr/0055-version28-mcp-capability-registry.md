# ADR 0055: Version28 Remote MCP Capability Registry

## Status

Accepted（2026-07-18）

## Context

Project ARCのMCP ToolはVersion16以降継続的に増えたが、ChatGPTの既存チャットや長寿命のRemote MCPプロセスが、更新前のTool定義を保持する事象が発生した。実装済みのTool数とProposal型を利用者が確認する標準経路がなく、ローカルstdio・Remote MCP・ChatGPT間の差異を人手で判定していた。

## Decision

読み取り専用MCP Tool `capability_registry_get` を追加する。返却値は次の通り。

- `schemaVersion`: Registryレスポンス形式の版
- `projectVersion`: Registryを導入したProject ARC Version
- `buildCommit`: 起動中プロセスが読み込んだGit commit。`ARC_BUILD_COMMIT`があれば優先し、なければローカル`.git/HEAD`を読む。取得不能時のみ`unknown`
- `toolCount` / `toolNames`: 正式なMCP Tool一覧
- `proposalTypes`: `proposal_create`が受け付ける正式な型一覧

Tool一覧は`MCP_TOOL_NAMES`を単一の正本とし、MCPの`tools/list`結果と完全一致することを統合テストで保証する。stdioとRemote MCPは同じ`buildMcpServer()`を利用するため、Registry実装を分岐させない。

## Consequences

- 新規クライアントは接続直後にRegistryを読み、期待するschema/build/tool構成と比較できる。
- 旧プロセスにはRegistry自体が存在しないため、Version28未満の状態も即座に検出できる。
- `buildCommit`は診断情報であり、認可判断には使用しない。
- 書き込み経路、認証方式、外部公開範囲、Constitution/Principlesは変更しない。

## Rejected alternatives

- READMEのTool数だけを更新する: 実行中プロセスとの差異を検出できない。
- Remote MCP専用のHTTP health endpointを増やす: stdioとの単一正本が崩れ、公開面も増える。
- 起動時に自動再起動する: Runner Control Planeの責務であり、本Versionでは行わない。
