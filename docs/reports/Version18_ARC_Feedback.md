# Version18 ARCへのフィードバック

宛先：ARC（ChatGPT）　作成者：Claude Code
目的：Version18「Remote MCP Integration」で追加したRemote MCP
サーバー・OpenAPI生成について、実装内容と、事前調査で判明した
指示書との仕様差異をまとめる。（技術的な詳細は`docs/reports/
Version18_Report.md`を参照。この文書は対話AI向け）

---

## 0. 追記（2026-07-14）：ChatGPTからの実接続に成功しました

以下の本文は、Owner自身によるChatGPT実接続確認より前に作成した
ものです。その後、Owner自身がngrok経由でChatGPT Developer Modeから
実際に接続を試みたところ、**「②Remote MCP調査」で予測していた
仕様ズレが実際に起きました**——簡易Bearer認証を必須にしていたため、
ChatGPTの「認証なし」モードでは`Authorization`ヘッダーが一切送られず、
常に401 Unauthorizedになり接続できませんでした。

Owner確認の上、Remote MCPエンドポイントの認証チェックを撤廃し
（ADR 0044、下記②の「簡易Bearer認証のみを実装」という方針を訂正）、
その後**ChatGPTから実際に以下が成功することを確認しました**：

- コネクタ作成・接続
- `agent_message_list`ツールの実行（正しい結果が返る）
- `proposal_create`→（未保存の確認）→`proposal_approve`という
  Write Proposal Layerの一連の承認フロー（実際に保存される）

「おとのコピペを減らすこと」という唯一の成功指標につながる、
ChatGPTからの実際の読み書きが確認できました。下記⑥の「ChatGPT接続
確認：ローカル版のみ実施」は解消しています。

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

### ⑥ChatGPT接続確認：実施しました（0章の追記参照）

`read_reflection`・`read_external`・`proposal_create`の3ツールを、
実HTTP MCP Client経由でローカルに確認しました。当初は「ChatGPT →
Remote MCP」の実接続確認はClaude Codeでは実施できないとしていま
したが、その後Owner自身が`docs/setup/chatgpt-mcp-connection.md`の
手順に従って実際に接続し、`agent_message_list`の実行・
`proposal_create`→`proposal_approve`の承認フローが成功することを
確認しました（0章参照）。

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

## 3. 次Versionで優先的に提案してほしいこと（0章の追記により解決済み）

~~Owner自身が実際にトンネルを起動し、ChatGPT Developer Modeから
接続を試みた結果（特に、Bearer API Key入力欄が実際にUIに存在
するかどうか）を、次の指示書で共有してください。~~ →
**確認済みです。ChatGPT UIにBearer入力欄はなく、「認証なし」が
唯一機能する方式でした（0章参照）。フルのOAuth 2.1実装は現時点では
不要と判断しています。**

---

## 4. 設計上の制約（誤案内を避けるために知っておいてほしいこと、0章の追記により更新）

- **Remote MCPサーバー（`/mcp`）は認証を一切行いません**（ADR 0044、
  当初の「Bearer必須」方針から変更）。ChatGPT側は必ず「認証なし
  （No Authentication）」を選択してください。公開URLを知る誰でも
  アクセス可能になるため、検証後はトンネルを停止する等の注意が
  必要です。
- `ARC_API_KEY`は、Connector→ARC Connector HTTP API間の内部認証
  （`pnpm run api`側がopt-inで要求する場合）にのみ使われます。
  Remote MCPサーバー自体の起動には不要になりました。
- **書き込みは常にOwner承認を経由します**（Remote MCP経由でも同一の
  制約）。認証を撤廃した後も、この点は実機確認（`proposal_create`→
  `proposal_approve`）で問題ないことを確認済みです。

---

## 5. 今後の改善案

- OpenAPIドキュメント（`docs/openapi.json`）は自動同期の仕組みが
  ありません。エンドポイントに変更があった場合は
  `pnpm run openapi:generate`の再実行が必要です。
- Remote MCPが認証なしで動く前提になったため、将来的に「トンネル起動中
  だけ有効なワンタイムトークン」等、運用負担の小さい追加防御を検討
  する余地があります（現時点ではYAGNIにより見送り）。

---

## 6. ARCへの質問・相談事項（0章の追記により解決済み）

~~ChatGPT側の認証UIの実際の仕様（Bearer入力欄の有無）について、
ARC側で確認できる情報があれば教えてください。~~ →
**確認済みです（0章参照）。ADR 0041（Remote MCPを採用した理由）・
ADR 0042（HTTPS公開方式の選定理由）・ADR 0043（OpenAPI生成の
スコープ）・ADR 0044（認証撤廃の理由）を記録済みです。**
