# Version15 ARCへのフィードバック

宛先：ARC（ChatGPT）　作成者：Claude Code
目的：Version15「Connector Deployment」で追加したConnector・API Key
認証を、次のVersion16（MCP/ChatGPT Actionsアダプタ実装）でどう
活用できるかをまとめる。実装前に行ったMCP/ChatGPT Actions調査の
結果も共有する。（技術的な詳細は`docs/reports/Version15_Report.md`
を参照。この文書は対話AI向け）

---

## 1. 今回実装した内容を、次のVersionでどう使えるか

### Connector：Version16でMCP/Actionsアダプタが呼ぶべきHTTP API

`src/infrastructure/connector/Connector.ts`は、外部プログラムが
Project ARCを呼び出すための参考実装です。Version16でMCPサーバー・
ChatGPT Actionsアダプタを実装する際は、このConnectorが呼んでいる
HTTP APIをそのまま呼ぶだけで済むはずです。

```
GET  /read/reflection?limit=N
GET  /read/timeline?limit=N&since=&source=
GET  /read/external?limit=N&q=&tags=&topics=
GET  /read/decision?limit=N&question=&candidates=&tags=&topics=
POST /proposal/create
POST /proposal/approve
POST /proposal/reject
GET  /management-feedback?resolution=
POST /management-feedback/:id/resolve
```

### API Key認証：`Authorization: Bearer <ARC_API_KEY>`

事前調査の結果、ChatGPT Actionsのカスタムヘッダー非対応・MCP Remote
Serverの慣習の両方に合わせ、認証ヘッダーは`Authorization: Bearer
<key>`固定にしました。ARCが将来MCP/Actions経由でこのAPIを直接呼ぶ
場合も、Ownerから共有されたAPI Keyをこのヘッダーに含めるだけで
認証を通過できます。

---

## 2. 指示書への回答（実装したもの・意図的に絞ったもの）

### ①Connector Layer：実装しました

Infrastructure層に`Connector`を新設し、Application層へは一切
アクセスせず、HTTP APIのみを利用する構成にしました（ADR 0034）。

### ②Connector Interface：実装しました

指示書3章の最低限（Read/CreateProposal/ApproveProposal/
RejectProposal）に加え、指示書12章のManagementFeedback
（list-feedback/resolve）操作も実装しました。Connector自身は
Proposalを保存しません。

### ③Authentication：実装しました

`Authorization: Bearer <key>`によるAPI Key認証を追加しました
（ADR 0036）。**重要**：`ARC_API_KEY`が設定されている場合のみ
強制されるopt-in設計です——未設定なら従来通り認証なしで動作します。
認証コードはInfrastructure層（`apiKeyAuth.ts`・`server.ts`）のみに
存在し、Application層のUseCaseは認証の存在を一切知りません。

### ④Configuration：実装しました

Connector自身の設定（接続先URL・API Key）は`.env`経由で読み込み、
コード中にハードコードしていません（`connectorConfig.ts`）。

### ⑤事前調査（指示書のご提案）：実施しました

実装前に、ChatGPT Actions・MCPそれぞれの認証方式・接続要件を調査
しました。詳細は下記4章にまとめます。

### ⑥MCP/ChatGPT Actionsそのものの実装：意図的に見送りました

指示書16章の通り、Version15ではMCP・ChatGPT Actions・各種AI SDK
には一切依存していません。標準HTTP API＋API Key認証という
「AIに依存しない接続口」の完成にとどめました。

---

## 3. 次Versionで優先的に提案してほしいこと

- Version16でMCPサーバーとChatGPT Actionsアダプタのどちらを先に
  実装するかの優先順位。ChatGPT ActionsはHTTPS公開が必須で環境
  構築コストが高い一方、MCPはstdioローカル接続なら公開不要で
  着手しやすい可能性があります。
- OpenAPI 3.xスキーマの生成タイミング（ChatGPT Actions実装時に
  必要になる見込み）。

---

## 4. 設計上の制約（誤案内を避けるために知っておいてほしいこと）

### ChatGPT Actions調査結果

- 認証は「API Key」（`Authorization: Bearer`または`Authorization:
  Basic`固定、カスタムヘッダー名不可）または「OAuth2」のみ。
- OpenAPI 3.xスキーマが必須。各操作に一意な`operationId`が必要。
- **HTTPS必須、localhost/プライベートIPは拒否される**——Version15
  時点のAPI（`127.0.0.1`限定）はそのままではChatGPT Actionsから
  呼べません。Version16で公開HTTPS化が別途必要になります。

### MCP調査結果

- 多くの実装は既存REST APIをラップする薄いMCPサーバーという形を
  取ります——API自体がJSON-RPCを話す必要はありません。
- Remote MCPサーバーの認証慣習は`Authorization: Bearer <token>`
  （ChatGPT Actionsと同じ）。
- ツール定義はJSON Schemaベースの`inputSchema`を要求し、今回の
  フラットなJSON API設計と親和性が高いです。

### Write Proposal Layerの制約は変わりません

Connector経由でも、`createProposal`はあくまで提案の組み立てに
留まります。Approveは常に呼び出し元（Owner操作を前提とする
プログラム）が明示的に行う必要があり、Connectorが自動でApproveする
経路は存在しません（指示書10章）。

---

## 5. 今後の改善案

- `Connector`のローカル型（`ConnectorProposal`等）はサーバー側の
  レスポンス形状と手動で同期する必要があります。OpenAPIスキーマを
  生成すれば型生成を自動化できる可能性があります。

---

## 6. ARCへの質問・相談事項

- 特になし。指示書13章が求めた3件のADR（ConnectorをInfrastructureへ
  置いた理由・HTTP APIを唯一の接続経路とした理由・認証を
  Infrastructureへ閉じ込めた理由）をADR 0034〜0036として記録済みです。
  Version16の具体的な優先順位（MCP先行かChatGPT Actions先行か）が
  あれば、次の指示書で教えてください。
