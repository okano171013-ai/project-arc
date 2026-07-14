# Version18 ARCへのフィードバック

宛先：ARC（ChatGPT）　作成者：Claude Code
目的：Version18「Remote MCP Integration」で追加したRemote MCP
サーバー・OpenAPI生成について、実装内容と、事前調査で判明した
指示書との仕様差異をまとめる。（技術的な詳細は`docs/reports/
Version18_Report.md`を参照。この文書は対話AI向け）

---

## 1. 今回実装した内容を、日常的にどう使えるか

### Remote MCPサーバー：`pnpm run mcp:remote`

ARCがChatGPT Developer Mode経由でProject ARCへ直接接続できる技術的な
土台が完成しました。ローカルでの動作は実機確認済みです——実際に
ChatGPTから接続するには、Owner自身がトンネル（ngrok等）を起動し、
ChatGPT側で接続設定を行う必要があります（`docs/setup/
chatgpt-mcp-connection.md`参照）。

提供するツールは既存の10個（stdio版と同一）で、新しいツールは
追加していません。

### OpenAPI 3.xドキュメント：`docs/openapi.json`

`pnpm run openapi:generate`で生成できます。ARCが実際に利用する
主要10エンドポイントのみを対象としています。

---

## 2. 指示書への回答（実装したもの・意図的に絞ったもの）

### ①Remote MCP調査：実施しました

事前調査の結果、**重要な発見がありました**。ChatGPT Developer Mode
のネイティブな認証方式はOAuth 2.0/2.1または「認証なし」であり、
指示書がセキュリティ確認項目に挙げていた「Bearer認証」を、UIから
直接入力する仕組みはネイティブには存在しないようです。この点は
指示書側の想定と実際の仕様にズレがありました。

### ②Remote MCP：実装しました（ローカル版・Remote版の共存）

MCP公式仕様の現行Remote transport（Streamable HTTP）で実装し、
既存のstdio版（Claude Code用）とは独立したエントリポイントとして
共存させました（指示書12章の「Claude Codeとの共存」を満たす）。

### ③HTTPS：比較のみ実施、導入は見送りました

Cloudflare Tunnel／Tailscale Funnel／ngrokを比較し、初回検証はngrok・
恒久運用はCloudflare Tunnelを推奨する結論に至りました（ADR 0042）。
**実際のアカウント登録・導入は行っていません**——Claude Codeは
外部サービスへのアカウント作成・契約を代行できないため（安全
ガイドライン上の制約）、Owner自身の操作が必要です。

### ④OpenAPI：実装しました（Actions実装は対象外）

`@asteasolutions/zod-to-openapi`を新規依存として追加し、主要10
エンドポイントのoperationId/request/responseを生成できるように
しました。ただしzod v4を要求する最新版（8.x系）は既存のzod
（v3系）と非互換だったため、v3対応の最終系列（`7.3.4`）を選定
しています。

### ⑤MCP Adapter：既存構成を維持しました

`Connector → HTTP API → Project ARC`という構成は一切変更していません。
Remote MCPサーバーも既存の`buildMcpServer`ファクトリをそのまま
再利用する薄いアダプタです。

### ⑥ChatGPT接続確認：ローカル版のみ実施しました

`read_reflection`・`read_external`・`proposal_create`の3ツールを、
実HTTP MCP Client経由でローカルに確認しました。**「ChatGPT →
Remote MCP」という実際の接続確認は、公開HTTPS・ChatGPT Developer
ModeでのUI操作を要するため、Claude Codeでは実施できていません**。
Owner自身が`docs/setup/chatgpt-mcp-connection.md`の手順に従って
確認する必要があります。

### ⑦Proposal確認：実施しました

`proposal_create`→（未承認の間は何も保存されない）→
`proposal_approve`→（ここで初めて保存される）という一連を実機で
確認しました。

### ⑧Security：Bearer認証・接続ログ以外は見送りました

Bearer認証は実装しました（`ARC_API_KEY`必須、opt-inではない）。
HTTPSはトンネル側で担保される前提です。Rate Limit・詳細な接続ログは、
実際の利用状況が分からない段階では時期尚早と判断し、YAGNIにより
見送りました。

### ⑨運用ドキュメント：作成しました

`docs/setup/chatgpt-mcp-connection.md`に起動順・`.env`設定・
トンネル起動方法・ChatGPT接続手順・トラブルシューティングを
まとめました。

---

## 3. 次Versionで優先的に提案してほしいこと

- Owner自身が実際にトンネルを起動し、ChatGPT Developer Modeから
  接続を試みた結果（特に、Bearer API Key入力欄が実際にUIに存在
  するかどうか）を、次の指示書で共有してください。これによって
  Version19以降、フルのOAuth 2.1実装が必要かどうかを判断できます。

---

## 4. 設計上の制約（誤案内を避けるために知っておいてほしいこと）

- **ChatGPTのUIにBearer API Key入力欄がない場合、「認証なし」
  モードでの接続が現実的な選択肢になります**。この場合、公開URLを
  知る誰でもアクセス可能になるため、検証後はトンネルを停止する等の
  注意が必要です。
- **Remote MCPサーバーは`ARC_API_KEY`必須です**。ローカルのHTTP API・
  stdio MCPと異なり、未設定では起動しません。
- **書き込みは常にOwner承認を経由します**（Remote MCP経由でも同一の
  制約）。

---

## 5. 今後の改善案

- OpenAPIドキュメント（`docs/openapi.json`）は自動同期の仕組みが
  ありません。エンドポイントに変更があった場合は
  `pnpm run openapi:generate`の再実行が必要です。

---

## 6. ARCへの質問・相談事項

- ChatGPT側の認証UIの実際の仕様（Bearer入力欄の有無）について、
  ARC側で確認できる情報があれば教えてください。ADR 0041（Remote
  MCPを採用した理由）・ADR 0042（HTTPS公開方式の選定理由）・
  ADR 0043（OpenAPI生成のスコープ）を記録済みです。
