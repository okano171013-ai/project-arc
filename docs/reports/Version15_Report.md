# Version15 Report: Connector Deployment

`docs/reports/TEMPLATE.md`の14章構成に準拠。

**コミットハッシュ**：`0092a3b`（`feature/v4-v6-smart-capture`ブランチ）

## 1. Version概要

**テーマ**：Connector Deployment — 「Project ARCを完成させる。ARCとの
実際の接続を実現する。」Version14完了報告に対するOwnerからのメッセージ
として届いた指示書に基づく（原文は`docs/handoff/archive/
Version15_ARC_Brief.md`に保管）。

**指示書の特徴**：指示書自身が「実装前に、本当にMCPやChatGPT Actionsから
利用可能な設計になっているか調査してから進める」ことを推奨していた点が
特徴的だった。これに従い、実装着手前にChatGPT Actions／MCPの接続・認証
要件を調査し、その結果を設計（特に認証ヘッダー形式）に反映した。

### 事前調査の要約

- **ChatGPT Actions（Custom GPT Actions）**：認証は「API Key」または
  「OAuth2」のみ。API Key方式は`Authorization: Bearer <key>`または
  `Authorization: Basic <key>`の2形式に固定され、カスタムヘッダー名
  （例：`X-API-Key`）は使えない。OpenAPI 3.xスキーマ提出必須、HTTPS
  必須（ローカルホスト不可）。
- **MCP（Model Context Protocol）**：多くの実装は既存REST APIをラップ
  する薄いMCPサーバーという形を取り、API自体がJSON-RPCを話す必要は
  ない。Remote MCPサーバーの認証慣習もChatGPT Actionsと同じ
  `Authorization: Bearer <token>`。
- **結論**：`Authorization: Bearer <API_KEY>`を採用すれば両方の将来の
  接続方式に手戻りなく対応できる。既存のフラットなJSON設計・
  ステートレスな呼び出しもすでに両方の要求と適合していた。

## 2. 今回実装した機能（理由も含めて説明）

### Connector（`src/infrastructure/connector/Connector.ts`）

ARC Connector HTTP APIをHTTP経由でのみ呼び出すクライアントモジュール。
Domain/Application層の型を一切importせず、ローカル型
（`ConnectorProposal`等）のみを使う（ADR 0034）。指示書3章の最低限
インターフェース（Read/CreateProposal/ApproveProposal/
RejectProposal）に加え、指示書12章のManagementFeedback
（list/resolve）操作を実装した。`limit`はTypeScriptの型レベルで
必須パラメータとした。

### API Key認証（`src/infrastructure/security/apiKeyAuth.ts`）

`isAuthorized(header, expectedKey)`という純粋関数で
`Authorization: Bearer <key>`ヘッダーを検証する。Application層は
この関数の存在を一切知らない（指示書6章）。`server.ts`の
`BuildAppOptions.apiKey`が設定されている場合のみ、`GET /health`を
除く全ルートで認証を強制するopt-in設計（ADR 0036）——`ARC_API_KEY`
未設定ならVersion7〜14と全く同じ挙動を維持し、既存217件のテストを
一切壊さない。

### Connector Configuration（`connectorConfig.ts`）

`ARC_API_KEY`・`ARC_CONNECTOR_BASE_URL`を`env.ts`（zod検証済み）
経由で読み込み、ハードコードを排除した（指示書7章）。

### ManagementFeedbackのHTTPエンドポイント追加

`GET /management-feedback`（`?resolution=`任意フィルタ）・
`POST /management-feedback/:id/resolve`を新規追加。Version14の
ADR 0033は「HTTP一覧・解決エンドポイントはCLIのみで完結させる」という
YAGNI判断だったが、Connectorが「HTTP APIのみ利用する」制約を持つため
見直した（ADR 0035）。

## 3. 実装しなかった機能（延期理由も記載）

- **MCP・ChatGPT Actionsそのものの実装**：指示書16章で明示的に対象外。
  Version16でAIごとの接続アダプタを実装する際、今回のHTTP API
  （`Connector`が呼ぶのと同じエンドポイント群）をそのまま利用できる
  設計にした（ADR 0035）。
- **OpenAPI 3.xスキーマの生成**：ChatGPT Actionsが要求する形式だが、
  指示書17章の完成条件に含まれておらず、YAGNIと判断し見送った
  （ADR 0035「見送ったもの」参照）。
- **公開HTTPS化**：ChatGPT Actionsの必須要件だが、指示書16章の
  「ネットワーク公開は対象外」に従い、引き続き`127.0.0.1`ローカル
  専用のまま。
- **自動Proposal生成・自動Approve・自動保存**：指示書16章で明示的に
  対象外。`Connector`はProposalを保存する手段を持たず、Approveは
  常に呼び出し元（Owner操作を前提とするプログラム）が明示的に行う。

## 4. Architecture Review

### 新規Infrastructure

- `src/infrastructure/security/apiKeyAuth.ts`（`isAuthorized`）
- `src/infrastructure/connector/connectorConfig.ts`（`ConnectorConfig`/
  `loadConnectorConfig`）
- `src/infrastructure/connector/Connector.ts`（`Connector`クラス、
  ローカル型`ConnectorProposal`等）

新規Entity・新規Value Object・新規UseCase・新規Repositoryはなし——
既存のReadGateway/WriteProposalGateway/ManagementFeedback UseCase
（Version14）をHTTP経由で呼び出すだけ。

### 変更したファイル

- `src/infrastructure/config/env.ts`：`ARC_API_KEY`・
  `ARC_CONNECTOR_BASE_URL`追加
- `src/infrastructure/http/server.ts`：`BuildAppOptions.apiKey`追加、
  `handleRequest`に認証ゲート追加、`GET /management-feedback`・
  `POST /management-feedback/:id/resolve`ルート追加、起動時に
  `loadEnv().ARC_API_KEY`を読んで`createApp`へ渡すよう変更
- `src/infrastructure/http/server.test.ts`：認証テスト・新規ルート
  テスト追加
- `.env.example`：`ARC_API_KEY`・`ARC_CONNECTOR_BASE_URL`追記

## 5. ADR（追加・変更したADR、追加しなかった理由）

指示書13章が明示的に求めた3件をすべてADR 0034〜0036として新規
作成した。

- **ADR 0034**: ConnectorをApplicationではなくInfrastructureへ置いた
  理由
- **ADR 0035**: HTTP APIを唯一の接続経路とした理由（MCP/ChatGPT
  Actions調査結果の要約を含む、ADR 0033のManagementFeedback
  HTTPエンドポイント追加への言及を含む）
- **ADR 0036**: 認証をInfrastructureへ閉じ込めた理由（ADR 0008の
  「認証は先送り」の再検討条件が満たされたことを明記）

## 6. テスト（件数、カバレッジ、typecheck、lint、実機確認）

- `pnpm test`：**233件**全て緑（Version14完了時点217件から16件
  増加。apiKeyAuth 4件、connectorConfig 2件、Connector 4件、
  HTTP server（認証4件＋ManagementFeedback 2件）6件）
- `pnpm typecheck`：エラーゼロ
- `pnpm lint`：エラーゼロ
- **実機確認**：一時的な検証用サーバー（`dataDir`・`apiKey`を本番と
  分離）を起動し、`Connector`クラスを実際に使うNodeスクリプトで
  指示書15章のフローを駆動して確認した。
  - 認証なしリクエスト（`Connector`に`apiKey`を渡さない）が
    `unauthorized`エラーになることを確認
  - Reflection取得（0件）→ManagementFeedback Proposal生成
    （未保存であることをlistFeedbackで確認）→Approve→
    ManagementFeedback保存確認（listFeedbackで1件）→Resolve
    （Open→Accepted）の一連を実データで確認
  - 検証用スクリプト・データは確認後に削除済み

## 7. 修正したバグ（検出方法、原因、対応方法、再発防止）

Version15では新規のロジックバグは発見されなかった。実装は既存の
Version14 HTTP APIをラップするだけの薄いクライアント（Connector）と、
Infrastructure層に閉じた認証チェックの追加が中心であり、Version14で
確立済みのUseCase/Repository層には変更を加えていない。

## 8. 技術的負債（今後改善したい点）

- **`ARC_API_KEY`はServer側とConnector側で同じ環境変数を共有する
  設計**：同一マシン上での利用を前提としており、Server/Connectorを
  別マシンで動かす構成にはまだ対応していない（ローカルホスト前提の
  ADR 0008の枠内）。
- **`Connector`のローカル型（`ConnectorProposal`等）はサーバー側の
  型と手動で同期する必要がある**：サーバー側のレスポンス形状が
  変わった場合、`Connector.ts`内の型定義も手動更新が必要。将来
  OpenAPIスキーマを生成すれば、型生成を自動化できる可能性がある
  （ADR 0035「見送ったもの」）。
- **API Key認証は同一マシン内の誤呼び出し防止レベル**：ネットワーク
  越しの攻撃者を想定した本格的な認証基盤ではない（ADR 0036）。
  リモート接続が必要になった際は再設計が必要。

## 9. 次Versionへの申し送り（技術的観点から推奨する事項）

- Version16でMCPサーバー・ChatGPT Actionsアダプタを実装する際は、
  `Connector`クラスと同じHTTP API（`GET /read/*`・
  `POST /proposal/*`・`GET/POST /management-feedback*`）をラップ
  するだけで済むはずである（ADR 0034・0035）。
- ChatGPT Actions対応にはOpenAPI 3.xスキーマ（各操作に一意な
  `operationId`、記述文字数制限あり）とHTTPS公開が必須。MCP対応には
  JSON Schemaベースの`inputSchema`を持つツール定義が必要——いずれも
  Version15で調査済みの制約であり、Version16着手時に本Reportの
  1章を参照すること。
- `ARC_API_KEY`は現状固定の共有シークレットである。複数の外部
  プログラム（MCPサーバーとChatGPT Actionsアダプタを同時に動かす等）
  を区別する必要が出た場合、キーの複数発行・失効の仕組みを検討する
  こと。

## 10. POへの提案（提案・懸念点・改善案を自由に記載）

- Version15により、Project ARCは「どのAIとも接続できる」標準HTTP API
  という土台を持つに至った。次の価値創出はVersion16のMCP/Actions
  アダプタ実装だが、これは「どちらを先に実装するか」という優先順位
  判断を伴う（ChatGPT ActionsはHTTPS公開が必須で環境構築コストが
  高く、MCPはstdioローカル接続なら公開不要で着手しやすい可能性が
  ある）。次の指示書でこの優先順位について意見をいただきたい。

## 11. CEOへのコメント（今回の成果、次Versionへの期待）

Version15は、指示書自身が「実装前に調査してから進める」ことを推奨した
初めてのVersionだった。この推奨に従い、ChatGPT Actions・MCPという
外部仕様を先に調査したことで、認証ヘッダー形式（`Authorization:
Bearer`固定）という、後から変更すると手戻りの大きい設計判断を
最初から正しく選べた。「Systemは判断しない」という原則の実装に加えて、
「外部仕様の制約を先に理解してから設計する」という開発プロセス自体の
質も、Version15を通じて一段階上がったと感じている。

## 12. ARCへの引き継ぎ

### 新しい資産

- **Connector**（`src/infrastructure/connector/Connector.ts`）—
  外部プログラムがProject ARCのHTTP APIを呼び出すための参考実装。
  ARCが将来MCPサーバーやChatGPT Actionsアダプタとして実装される際、
  この`Connector`と同じ呼び出しパターン（HTTP APIのみ、
  `Authorization: Bearer`認証）をそのまま踏襲できる。
- **API Key認証**（`ARC_API_KEY`）— 設定すれば、ARC Connector HTTP
  APIへのアクセスにAPI Keyが必要になる。ARCが将来このAPIを直接
  呼ぶ場合、Ownerから共有されたキーを`Authorization: Bearer`
  ヘッダーに含める必要がある。
- **ManagementFeedbackのHTTPエンドポイント**（`GET
  /management-feedback`、`POST /management-feedback/:id/resolve`）—
  Version14ではCLI限定だったが、HTTP経由でも一覧・解決ができる
  ようになった。

### 新しいルール

- ARCが将来このAPIを直接呼ぶ場合も、認証（API Key）を持つだけでは
  「書き込み」はできない——Write Proposal Layer（Version14）の制約
  はそのまま有効であり、`createProposal`はあくまで提案の組み立てに
  留まる。
- `Connector`はステートレスなHTTPクライアントであり、会話履歴や
  未承認のProposalを一切保持しない。

### 新しい思想

Version15は、Version1〜14で積み上げてきた「Systemは判断しない」
という原則を保ったまま、初めて「Project ARC自身の外側」を明示的に
設計したVersionである。これまでの各層（UseCase・Gateway）は
「Project ARC内部のどこに何を置くか」という設計だったが、
Connectorは「Project ARCの外側にいる誰か（将来のARC）が、この
システムをどう見るか」という視点で設計された初めてのコンポーネント
である。

### Ownerについて分かったこと

Version15の指示書は、Owner自身が「実装前に外部仕様を調査してから
進める」という開発プロセス上の提案を初めて明示的に行った点が
特徴的だった（事実ベースの観察）。Version14の「以前の自分の提案を
撤回する」という判断に続き、Ownerが単なる機能要求だけでなく、
開発の進め方そのものについても能動的に関与するようになってきている
様子がうかがえる。

## 13. Product Review

### ユーザー体験で改善されたこと

Before：Version14までは、Project ARCのHTTP APIはOwnerが手動で
`curl`/`fetch`を叩く、あるいはCLIを操作するという前提だった。

After：`Connector`クラスという再利用可能なクライアントが用意され、
Ownerが将来何らかのプログラム（自動化スクリプト等）からProject ARC
を呼び出したい場合、このクラスをそのまま使える。API Key認証も
用意されたことで、複数のプログラムが同居する環境でも安全に運用
できる土台が整った。

### 毎日使う理由

Version15自体はOwnerの日々の記録体験を直接変えるものではないが、
「ARCとの実際の接続」という長らく未解決だった課題への土台が完成
したことで、次のVersionでARCとの会話がより自然な形で日常に組み込まれる
可能性が見えてきた。

### 懸念

Version15単体では、Owner自身が体感できる変化はほとんどない
（Connectorを直接使うプログラムがまだ存在しないため）。この価値が
実感できるのはVersion16でMCP/Actionsアダプタが実装されてから
になる。

### 次Versionで最も価値が高い改善

MCPサーバーまたはChatGPT Actionsアダプタのいずれかを実装し、実際に
ARCとの会話からProject ARCのデータを参照・提案できるようにする
こと。指示書19章が示す通り、Version15はあくまで「布石」であり、
Ownerが実感できる価値はVersion16以降に生まれる。

## 14. 10年後のProject ARCへの貢献

Version15で10年後も効いてくるのは、「Project ARC本体は特定のAI
サービスに依存しない」という設計原則を、抽象的な方針としてでは
なく、実際に動くコード（`Connector`が標準HTTP APIしか話さない、
Application層が認証を知らない）として固定できたことだと考える。
将来ChatGPT・Claude・Geminiのいずれかが仕様変更をしても、あるいは
全く新しいAIプロトコルが登場しても、Project ARC本体（Domain/
Application層）への影響はゼロに保たれる——影響が生じるとしても、
それはConnectorより外側の新しいアダプタ層に閉じ込められる。

「人生OS」というVisionから逆算すると、Version15はPhase 2
（External Brain）の最後の1マイルであり、「どのAIとも接続できる」
という状態を実現した石である。機能の見た目（新しいクラス1つ、
エンドポイント2つ、環境変数2つ）は小さいが、指示書自身が事前に
外部仕様の調査を求めた初めてのVersionであったことも含め、
「機能を作る前に、外の世界の制約を理解してから作る」という
開発プロセス上の成熟が、10年間の拡張に耐える設計判断の土台に
なっていくと考える。
