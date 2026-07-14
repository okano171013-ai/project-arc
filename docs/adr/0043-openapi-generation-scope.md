# ADR 0043: OpenAPI生成をVersion18から開始した理由

## ステータス

承認済み

## 関連Principle

- Principle 9（段階的拡張／YAGNI）
- ADR 0037（MCP SDKを新規依存として追加した理由——依存追加の判断基準の先例）
- ADR 0008（Project ARC本体へ新規Webフレームワークを追加しない方針）

## コンテキスト

Version18指示書6章は「ChatGPT Actionsを見据え、OpenAPI 3.xスキーマ
生成を開始する。最低限operationId・request・responseを生成可能に
する。Actions実装までは不要」と定めていた。

## 決定

### `@asteasolutions/zod-to-openapi`（`^7.3.4`）を新規依存として追加する

事前調査の結果、最新版（8.x系）はzod v4を要求し、Project ARCの
既存zod（`^3.25.76`、Version16で導入、`@modelcontextprotocol/sdk`が
要求する範囲）とは互換性がない。zod v3系に対応する最終系列
（`7.x`、`zod: ^3.20.2`要求）を選び、zodのメジャーバージョンを
分裂させない（ADR 0037と同じ判断基準：同一zodインスタンスを共有し、
スキーマ変換の不整合を避ける）。

### 独立した生成スクリプトとして実装し、`http/server.ts`は変更しない

`src/infrastructure/openapi/generateOpenApi.ts`を新設し、
`pnpm run openapi:generate`で`docs/openapi.json`を生成する
静的ドキュメント生成スクリプトとした。既存の`http/server.ts`の
手製正規表現ルーター（ADR 0008）自体は一切変更しない——指示書7章
「Project ARC本体は変更しない」という制約に従う。HTTPサーバーが
`/openapi.json`等を自動配信する新規ルートも追加しない。

### 対象エンドポイントをARC向けの主要API群10個に絞る

Project ARC全体では30近いHTTPエンドポイントが存在するが、
OpenAPIドキュメントの対象は、`Connector`（Version15）・MCP Tool
（Version16〜17）が既に対応している10エンドポイント（Read Layer
4本・Write Proposal Layer 3本・ManagementFeedback 2本・
AgentMessage 1本）に絞った。

## 根拠

- **zodバージョンの分裂回避**：ADR 0037で確立した「SDKが要求する
  zodバージョンと同一のインスタンスを共有する」という判断基準を
  そのまま適用した。8.x系を使うためだけにzod v4への破壊的移行を
  行うことは、指示書の「Actions実装までは不要」というスコープに
  対して過大なコストである。
- **本体不変更の原則**：`http/server.ts`のルーティング機構に
  OpenAPIメタデータを埋め込む形（zodスキーマでルートを再定義する等）
  も検討したが、既存の30近いルート全てに手を入れる大規模な
  リファクタリングになり、「Project ARC本体は変更しない」という
  指示書7章の制約と、Principle 9のYAGNIの両方に反する。独立した
  生成スクリプトとして実装することで、本体のルーティングには
  一切触れずに済んだ。
- **対象エンドポイントの絞り込み**：指示書6章は「最低限」の生成を
  求めており、全エンドポイントの網羅は要求していない。ARCが実際に
  利用する経路（Connector/MCP Toolが対応する範囲）に絞ることで、
  「ChatGPT Actionsが実際に必要とする範囲」と一致させ、無駄な
  スキーマ定義を増やさない。

## 影響

- `docs/openapi.json`はリポジトリにコミットされた静的ファイルであり、
  自動同期の仕組みはない——`http/server.ts`・Connector・MCP Toolの
  該当エンドポイントに変更があった場合は、`pnpm run
  openapi:generate`を再実行して手動更新する必要がある。
- 将来Version19以降でChatGPT Actions実装に着手する際、この
  `docs/openapi.json`をベースにできる見込みだが、Actions側が要求する
  追加のメタデータ（認証スキーム定義等）は別途必要になる。
