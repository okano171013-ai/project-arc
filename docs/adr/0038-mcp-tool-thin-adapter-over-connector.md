# ADR 0038: MCP ToolをConnectorのみに依存させ、Application層を一切importしない理由

## ステータス

承認済み

## 関連Principle

- ADR 0034（ConnectorをApplicationではなくInfrastructureへ置いた理由）
- ADR 0035（HTTP APIを唯一の接続経路とした理由）
- ADR 0031（Write Proposal Layer——Proposal全体の再送という制約）

## コンテキスト

Version16のARC指示は「MCPサーバーは『薄いアダプタ』として実装し、
Connector・HTTP API・ReadGateway・WriteProposalGatewayというVersion15
までに完成した構造をそのまま利用してください。そうすれば、将来
ChatGPT Actionsや他のAI（Claude、Geminiなど）を追加するときも、
Project ARC本体は変更せず、アダプタを追加するだけで済みます」と
明記していた。この方針をどう実装に落としたかを記録する。

## 決定

`src/infrastructure/mcp/`配下の全ファイル（`server.ts`・
`tools/*.ts`）は、`src/infrastructure/connector/Connector.ts`
（Version15）のみに依存する。Application層（UseCase・Repository）・
Domain層（Entity・Value Object）は一切importしない。

9個のMCP Toolは、いずれも対応する`Connector`メソッドを1回呼ぶだけの
薄いラッパーとして実装した（`read_reflection`→
`connector.readReflection()`等）。新しい判断ロジック・新しい
バリデーションロジックは一切追加していない——`Connector`が返す
成功/失敗をそのまま`{content, isError}`というMCPの結果形状に
変換するだけ（`toolResult.ts`の`runTool()`、`http/server.ts`の
`ok()`/`fail()`と同じ役割）。

`proposal_approve`/`proposal_reject`のinputSchemaは、
`proposal_create`が返すProposal全体（`type`/`target`/`payload`/
`reason`/`createdAt`）をそのまま受け取る形にした——IDだけで承認する
経路は用意しない。これはWrite Proposal Layerの「Proposalは保存せず、
呼び出し元が全体を再送する」という制約（ADR 0031）を、MCP Tool層
でも一切崩さないための設計判断である。

MCPサーバー自身はHTTPサーバーを内包しない。ARC Connector HTTP API
（`pnpm run api`）が別プロセスとして起動済みであることを前提とする。

## 根拠

- **「薄いアダプタ」という指示を型レベルで強制する**：ADR 0034が
  `Connector`について確立した「外部プログラムから見た入口は、
  Project ARCのTypeScript内部型を一切知らない」という設計を、
  MCP Tool層でも継続する。MCP Toolが仮にApplication層のUseCaseを
  直接importできてしまうと、「薄いアダプタ」という制約はコード上で
  守られていても意味的には破られる——将来のChatGPT Actionsアダプタ
  実装時に同じ制約を守れる保証がなくなる。
- **将来のアダプタ追加コストを最小化する**：MCP Toolが
  `Connector`だけに依存する構成にしておけば、ADR 0035が想定した
  「Version17でChatGPT Actionsアダプタを追加する際、Connectorが
  呼ぶのと同じHTTP APIをラップするだけで済む」という見込みが、
  MCP実装によって裏付けられたことになる。実際、`src/
  infrastructure/mcp/tools/*.ts`の各ファイルは`Connector`の
  メソッドシグネチャをそのままzodスキーマ化しただけであり、
  Version17でHTTP直接呼び出し・別のAIプロトコル対応を追加する際も
  同じパターンを踏襲できる。
- **テストもConnector.test.tsと同じ「実物を起動して駆動する」
  流儀を踏襲**：`server.test.ts`（MCP）はSDKが提供する
  `InMemoryTransport`で実際の`McpServer`・`Client`を接続し、実際の
  HTTP APIサーバー（`createApp()`）に対して9ツール全てをend-to-end
  で検証する——モックに頼らず、実際のJSON Schema検証・HTTPリクエスト
  往復を含めて確認する（ADR 0034の`Connector.test.ts`と同じ設計判断）。

## 影響

- MCP Tool層に新しいバグが混入した場合も、原因は「Connectorの
  呼び出し方」か「zodスキーマの形状」のいずれかに限定される
  ——Application/Domain層のロジックまで疑う必要がない。
- 将来Version17でChatGPT Actionsアダプタを追加する場合、
  `src/infrastructure/actions/`（仮）のような新しいディレクトリを
  同じ設計原則（Connectorのみに依存、Application層を知らない）で
  追加すればよい。
