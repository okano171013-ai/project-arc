# ADR 0037: MCP SDKを新規依存として追加した理由

## ステータス

承認済み

## 関連Principle

- Principle 9（段階的拡張／YAGNI）
- ADR 0002（AIプロバイダー抽象化はVersion1では見送り）
- ADR 0008（ARC Connector HTTP API化、新規外部依存を追加しない方針）

## コンテキスト

Project ARCはVersion1から「具体的な必要性が確認できるまで依存を
増やさない」という運用を続けてきた（ADR 0002・0008）。Version16では
ARCの指示に基づき、MCP（Model Context Protocol）サーバーを実装する
必要があり、これには公式TypeScript SDK
（`@modelcontextprotocol/sdk`）という新規外部依存の追加を伴う。
過去のADRが積み重ねてきた「新規依存を安易に増やさない」という
節制方針との整合性を検討した。

## 決定

`@modelcontextprotocol/sdk`（`^1.29.0`）を新規依存として追加する。
自前でMCPのJSON-RPCプロトコル（stdio transport、ツール定義の
JSON Schema検証、初期化ハンドシェイク等）を実装することはしない。

あわせて、SDKが要求する`zod: ^3.25 || ^4.0`という依存範囲を満たす
ため、プロジェクトの`zod`を`^3.23.8`から`^3.25.76`（最新安定3.x、
npm registryで確認済み）へ引き上げる——SDKの`registerTool()`は
呼び出し側が渡すzodスキーマをそのままJSON Schemaへ変換するため、
プロジェクト側とSDK内部で異なるバージョンのzodインスタンスが
混在すると、スキーマ変換が正しく動作しない可能性がある。同一
インスタンスを共有することで、この種の不整合を避ける。

## 根拠

- **ADR 0002・0008が退けてきたのは「具体的必要性のない先取りの
  抽象化」であり、「標準プロトコルの実装」ではない**：ADR 0002は
  AIプロバイダーを切り替え可能にする抽象化を、中身のあるユース
  ケースが存在しない段階で導入することを見送った。ADR 0008は
  HTTP APIサーバーをExpress等のフレームワークなしで実装する
  判断だった。今回はどちらとも性質が異なる——MCPは既に確立された
  標準プロトコル（JSON-RPCベースの初期化・ツール呼び出し・
  スキーマ検証）であり、これを自前実装することは車輪の再発明で
  あり、プロトコル準拠のバグを生みやすい。公式SDKを使うことは
  「機能を先取りする」のではなく「確立済みの標準への準拠コストを
  最小化する」判断であり、Principle 9の精神（過剰な一般化を避ける）
  にはむしろ合致する。
- **依存の重さは許容範囲**：SDKは`express`・`hono`・`cors`等、
  HTTP/SSE transportやOAuth認可フロー向けの依存も併せ持つが、
  今回利用するのは`server/mcp.js`・`server/stdio.js`サブパスの
  みであり、実行時にimportされるのはstdio transportに必要な部分
  だけである。`node_modules`のサイズは増えるが、Project ARCは
  Version1から「新規外部依存の追加」自体よりも「Domain/Application
  層をその依存の詳細から守ること」を重視してきた（ADR 0002の
  「Domain/Application層がAIプロバイダーの詳細を知らない設計に
  なっていれば、後から抽象化を導入するコストは低い」という論理と
  同じ）——今回もMCP SDKへの依存は`src/infrastructure/mcp/`配下に
  閉じ込め、Domain/Application層は一切importしない（ADR 0038）。

## 影響

- `package.json`の`dependencies`に`@modelcontextprotocol/sdk`が
  追加され、`zod`のバージョン範囲が引き上げられた。既存の
  `env.ts`・`WriteProposalGateway.ts`等のzod利用はv3内の
  マイナーバージョン差分のみであり、typecheck/testで破壊的変更が
  ないことを確認済み。
- 将来Version17でChatGPT Actions対応（OpenAPIスキーマ生成）を
  追加する際も、同じ「標準への準拠コストを最小化する」という
  判断基準で新規依存の要否を検討すること。
