# ADR 0035: HTTP APIを唯一の接続経路とした理由

## ステータス

承認済み

## 関連Principle

- Principle 9（段階的拡張／YAGNI）
- ADR 0008（ARC Connector HTTP API化）
- ADR 0033（ManagementFeedbackをCLIのみで完結させた理由——本ADRで一部見直す）

## コンテキスト

Version15指示書8章・9章は「MCP・ChatGPT Actions・Claude・Geminiには
依存しない。代わりに外部プログラムから呼び出せる標準HTTP APIとして
完成させる」ことを求めていた。指示書自身も「実装前に、本当にMCPや
ChatGPT Actionsから利用可能な設計になっているか調査してから進める」
ことを推奨していたため、実装前に調査を行った。調査結果を踏まえた
設計判断を記録する。

## 決定

### 調査結果の要約

- **ChatGPT Actions（Custom GPT Actions）**：認証は「API Key」または
  「OAuth2」のみサポートされ、API Key方式では`Authorization: Bearer
  <key>`または`Authorization: Basic <key>`の2形式に固定されている
  ——カスタムヘッダー名（例：`X-API-Key`）は使えない。OpenAPI 3.x
  スキーマの提出が必須で、各操作に一意な`operationId`が必要。HTTPS
  必須（ローカルホストは不可、今回は対象外）。
- **MCP（Model Context Protocol）**：多くの実装は、既存のREST APIを
  ラップする薄いMCPサーバーという形を取る——API自体がJSON-RPCを話す
  必要はない。Remote MCPサーバーの認証慣習は、ChatGPT Actionsと同じ
  `Authorization: Bearer <token>`。ツール定義はJSON Schemaベースの
  `inputSchema`を要求し、フラットで型の明確なJSONボディを持つREST
  APIとの親和性が高い。

### 設計への反映

1. **認証ヘッダーは`Authorization: Bearer <key>`に固定する**
   （ADR 0036）。この1つの形式が、ChatGPT ActionsのAPI Key認証と
   MCP Remote Serverの慣習の両方を同時に満たす。
2. **既存のフラットなJSONリクエスト/レスポンス設計をそのまま踏襲する**
   ——Version7〜14で確立したエンドポイント設計（`record`フィールドに
   構造化データを持つ、ステートレスな1リクエスト1レスポンス）は、
   すでにMCPツール・GPT Action双方の要求と適合しているため、
   Version15での設計変更は不要だった。
3. **`Connector`はHTTP APIのみを利用する**（指示書2章、ADR 0034）
   ——外部プログラムから見た唯一の入口をHTTP APIに限定することで、
   将来MCPサーバー・ChatGPT Actionsアダプタのいずれを追加する場合も、
   このHTTP APIをラップするだけで済む構造にした。
4. **ManagementFeedbackのHTTPエンドポイントを追加した**
   （`GET /management-feedback`、`POST /management-feedback/:id/
   resolve`）——Version14のADR 0033は「HTTP一覧・解決エンドポイントは
   CLIのみで完結させる」というYAGNI判断だったが、`Connector`が
   「HTTP APIのみを利用する」という制約を持つ以上（指示書2章）、
   指示書12章が求める`list-feedback`/`resolve`をConnector経由で
   呼べるようにするには、この判断を見直す必要があった。ADR 0033が
   想定していた「具体的な必要性が確認できるまで先取りしない」という
   条件が、Connectorという形で今回満たされたと判断した（Principle 9）。

### 見送ったもの

- **OpenAPI 3.xスキーマの生成**：ChatGPT Actionsが要求する形式だが、
  指示書17章の完成条件に含まれておらず、Version16でMCP/Actions
  アダプタを実装する際に具体的な必要性が確定してから着手する方が
  手戻りが少ない（YAGNI）。調査結果は`docs/reports/Version15_Report.md`
  に記録し、Version16への申し送り事項とする。
- **公開HTTPS化**：ChatGPT Actionsの必須要件だが、Version15は
  引き続き`127.0.0.1`ローカル専用のままとする（指示書16章、ネットワーク
  公開は対象外）。

## 根拠

外部プログラムとの接続方式は複数存在しうる（MCP、ChatGPT Actions、
将来登場する未知のプロトコル）が、Project ARC本体がそのどれか特定の
方式に依存してしまうと、AIサービス側の仕様変更のたびにProject ARC
本体への影響が生じる。指示書9章が明記する通り「Connector側はAIを
知らない」——標準的なHTTP APIという抽象化レイヤーを挟むことで、
AIサービス固有の実装はすべてConnectorより外側（将来のアダプタ層）に
閉じ込められる。

## 影響

- Version16でMCPサーバー・ChatGPT Actionsアダプタを追加する際は、
  今回のHTTP API（`GET /read/*`・`POST /proposal/*`・
  `GET/POST /management-feedback*`）をそのまま呼び出すだけで済む
  はずである。
- OpenAPIスキーマが必要になった時点で、既存のルート定義
  （`server.ts`の`route()`呼び出し）から手動で書き起こすか、
  自動生成ツールの導入を検討すること。
