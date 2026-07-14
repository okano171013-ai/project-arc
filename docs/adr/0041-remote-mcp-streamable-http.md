# ADR 0041: Remote MCPを採用した理由

## ステータス

承認済み（**一部訂正**：「簡易Bearer認証のみを実装」「`ARC_API_KEY`を
必須にする」の2点は、実機接続検証の結果ADR 0044により訂正——
ChatGPTの「認証なし」モードは`Authorization`ヘッダーを一切送らない
ため、Bearer必須のままではChatGPTから接続不可能なことが判明した。
Streamable HTTP transport採用・フルOAuth 2.1を実装しない、という
他の決定はそのまま有効）

## 関連Principle

- Principle 9（段階的拡張／YAGNI）
- ADR 0034（ConnectorをApplicationではなくInfrastructureへ置いた理由）
- ADR 0038（MCP ToolをConnectorのみに依存させた理由）

## コンテキスト

Version18指示書は「ChatGPT（ARC）がProject ARCへ直接接続できる環境」
の完成を求めた。Version16で実装済みのMCPサーバー（`server.ts`）は
stdio transportのみで、ローカルのMCPクライアント（Claude Desktop・
Claude Code）専用だった。ChatGPTのRemote MCP接続には別のtransportが
必要であり、実装前に指示書自身が求める通り事前調査を実施した。

## 決定

### Streamable HTTP transportを採用する

MCP公式仕様における現行のRemote向けtransport
（`StreamableHTTPServerTransport`、`@modelcontextprotocol/sdk`
1.29.0に同梱）を新規エントリポイント`src/infrastructure/mcp/
remoteServer.ts`として追加する。stdio版（`server.ts`）は一切変更
しない——2つの独立したエントリポイントとして共存させる
（指示書12章「Claude Codeとの共存」）。

両者は既存の`buildMcpServer(connector)`ファクトリ（Version16）を
共有する。SDKの制約上、1つの`McpServer`インスタンスは1つの
transportにしか接続できないため、Remote MCP側はHTTPセッション
ごとに新しい`McpServer`インスタンスを生成する（公式サンプルが
示す推奨パターン）。

### 簡易Bearer認証のみを実装し、フルのOAuth 2.1は実装しない

事前調査の結果、ChatGPT Developer Modeのネイティブな接続方式は
OAuth 2.0/2.1または「認証なし」であり、静的なBearer API Keyを
直接入力する仕組みはUIに用意されていないことが判明した。指示書は
セキュリティ確認項目に「Bearer認証」を挙げていたが、これは指示書
作成時点の想定と実際の仕様のズレである。Owner確認の結果、以下の
方針で進める：

- Remote MCPサーバー自体は、既存の`apiKeyAuth.ts`（Version15、
  `isAuthorized`）を再利用したBearer認証を実装する。
- Dynamic Client Registration・`.well-known`メタデータ配信等を
  含むフルのOAuth 2.1 Authorization Serverは実装しない
  （指示書2章「新しいEntityを増やさない」「接続を完成させることが
  目的」というスコープと、Principle 9のYAGNIに基づく判断）。
- ChatGPTの公式UIから実際に接続する際は、Bearer認証フィールドが
  提供されない場合「認証なし」モードでの接続を検討する必要がある
  ——この制約は`docs/setup/chatgpt-mcp-connection.md`に明記する。

### `ARC_API_KEY`をopt-inではなく必須にする

`http/server.ts`・stdio版MCPサーバーは`ARC_API_KEY`未設定時に
認証なしで動作するopt-in設計（ADR 0036）だが、Remote MCPサーバーは
性質上、公開HTTPSトンネル経由で外部から到達しうる。安全側に倒し、
`ARC_API_KEY`が未設定の場合はプロセス起動時にエラーで落とす。

## 根拠

- `Connector`（ADR 0034）・MCP Tool（ADR 0038）が確立した「薄い
  アダプタ」パターンをそのまま踏襲できることが、Remote MCP
  transportを追加する際の実装コストを最小化した——`buildMcpServer`
  をそのまま再利用でき、9個から10個に増えたツール自体にも変更は
  不要だった。
- フルOAuth実装は、指示書自身が明示する「新しいEntityを増やさない」
  「目的は接続を完成させることだけ」という制約と真っ向から矛盾する
  規模の新規実装になる。簡易Bearer認証は、ローカルの`http/server.ts`
  で既に実績のある設計（ADR 0036）を再利用するだけで済み、
  Constitution・Principleとの整合性を保ったまま「接続環境の完成」
  という目的を達成できる。
- Remote MCPのデフォルト必須認証は、ローカル専用（127.0.0.1バインド）
  だった従来のHTTP API・stdio MCPとは異なり、実際に外部公開される
  ことを前提とした設計変更が必要という判断に基づく。

## 影響

- `pnpm run mcp:remote`は`ARC_API_KEY`が`.env`に設定されていないと
  起動しない。
- 実際にChatGPTから接続する際、Bearer認証フィールドがUI上に
  存在しない場合は「認証なし」モードでの接続検証が現実的な選択肢に
  なる——この場合、公開URLを知る第三者からもアクセス可能になるため、
  トンネルURLの取り扱いに注意が必要（`docs/setup/
  chatgpt-mcp-connection.md`参照）。
- 将来ChatGPT側の仕様変更でOAuth必須になった場合、本ADRを見直し、
  フルのOAuth 2.1 Authorization Server実装に着手すること。
