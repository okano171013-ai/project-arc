# Version18 Report: Remote MCP Integration

**コミットハッシュ**：`af95ced`（`feature/v4-v6-smart-capture`ブランチ）

`docs/reports/TEMPLATE.md`の14章構成に準拠。

## 追記（2026-07-14、Owner実機接続確認・ADR 0044）

本文（1〜14章）作成時点では「ChatGPT → Remote MCPの実接続確認は
Claude Codeでは実施できない」としていたが、Owner自身がngrok経由で
実際に接続を試みたところ、**簡易Bearer認証が原因でChatGPTから
一度も接続できないことが判明した**（ChatGPTの「認証なし」モードは
`Authorization`ヘッダーを一切送らないため、Bearer必須のサーバー側と
組み合わせると常に401になる——ngrokのHTTP Requestsログで確認）。

Owner確認（AskUserQuestion）の上、`/mcp`エンドポイントの認証チェックを
撤廃し（コミット`cd572bd`、ADR 0044、ADR 0041を一部訂正）、その後
**Owner自身の手で以下が実際に成功したことを確認した**：

- ChatGPT Developer Modeからの接続（コネクタ作成）
- `agent_message_list`ツールの実行（`{"messages": []}`が正しく返る）
- `proposal_create`→（未保存の確認）→`proposal_approve`という
  Write Proposal Layerの一連のフロー（実際に`id`付きで保存された）

これにより、6章「実機確認」の未実施項目、8章「技術的負債」の
Bearer認証の懸念、9章「次Versionへの申し送り」・13章「次Versionで
最も価値が高い改善」で挙げていた「ChatGPT実接続の確認」が、
Version18のうちに解消した。Version18の唯一の成功指標「おとの
コピペを減らすこと」の土台となる、ChatGPTからの実際の読み書きが
初めて確認できたことを記録する。

## 1. Version概要

**テーマ**：Remote MCP Integration — 「ARCが初めてProject ARCを直接
利用する。」Version17完了報告に対するARCからの正式な指示書に基づく
（原文は`docs/handoff/archive/Version18_ARC_Brief.md`に保管）。

**指示書の特徴**：「おとのコピペを減らすこと」を唯一の成功指標とし、
Project ARC本体の設計変更ではなく接続環境の完成のみを目的とする、
と明確にスコープを絞っていた。指示書自身が「実装前に必ず調査する」
ことを求め、ChatGPT Developer Modeの最新仕様・Remote MCP Server
要件・HTTPS公開要件・認証方式を調べた上で設計するよう指示していた。

### 事前調査の結果（指示書3章）

- **Streamable HTTP**：MCP公式仕様における現行のRemote向けtransport
  （旧HTTP+SSEを置き換え）。`@modelcontextprotocol/sdk`
  （インストール済み1.29.0）に`StreamableHTTPServerTransport`が
  含まれる。1つの`McpServer`インスタンスは1つのtransportにしか
  接続できないため、HTTPセッションごとに新規インスタンスを生成する
  設計が公式の推奨パターン。
- **ChatGPT Developer Mode**：Remote MCPサーバーは公開HTTPS必須
  （localhost不可）。**認証はOAuth 2.0/2.1が正規の方式で、静的な
  Bearer API Keyを直接入力するネイティブな仕組みはない**——指示書が
  セキュリティ確認項目に挙げていた「Bearer認証」は、指示書側の想定と
  実際の仕様のズレだった。Owner確認の結果、簡易Bearer認証のみを
  実装し、フルのOAuth 2.1 Authorization Serverは見送る方針で
  進めた。
- **HTTPS公開手段**：Cloudflare Tunnel／Tailscale Funnel／ngrokを
  比較（詳細はADR 0042）。いずれもアカウント作成を伴うため、実際の
  導入はOwner自身の操作が必要。
- **OpenAPI生成**：`@asteasolutions/zod-to-openapi`の最新版（8.x系）は
  zod v4を要求し、既存のzod（`^3.25.76`）と非互換。zod v3対応の
  最終系列（`7.3.4`）を選定した。

## 2. 今回実装した機能（理由も含めて説明）

### Remote MCPサーバー（`src/infrastructure/mcp/remoteServer.ts`）

Streamable HTTP transportで実装した新規エントリポイント。既存の
stdio版（`server.ts`、Version16）とは完全に独立しており、
`buildMcpServer(connector)`ファクトリ（Version16で既存）をそのまま
再利用する。HTTPセッションごとに新しい`McpServer`インスタンスを
生成し、`Authorization: Bearer <ARC_API_KEY>`を必須とする——他の
HTTP API・stdio MCPのopt-in方針とは異なり、Remote MCPは性質上公開
されうるため`ARC_API_KEY`未設定時は起動エラーで終了する（ADR 0041）。

### OpenAPI 3.x生成（`src/infrastructure/openapi/generateOpenApi.ts`）

`http/server.ts`本体を一切変更せず、独立したスクリプトとして
ARC向けの主要10エンドポイント（Read Layer・Write Proposal Layer・
ManagementFeedback・AgentMessage、Connector/MCP Toolが対応する
範囲と一致）のOpenAPI 3.xドキュメントを生成する
（`pnpm run openapi:generate`→`docs/openapi.json`）。既存の
`WriteProposalGateway`の`payloadSchemas`等は再利用せず、独立した
zodスキーマを新規定義した（`http/server.ts`のルーティング機構を
変更しない制約のため）。

### 運用ドキュメント（`docs/setup/chatgpt-mcp-connection.md`）

起動順・`.env`設定・トンネル起動方法・ChatGPT Developer Modeでの
接続手順・トラブルシューティングを記載。ChatGPTのUIにBearer API Key
入力欄がない場合は「認証なし」モードでの接続が現実的な選択肢になる
可能性を明記した。

## 3. 実装しなかった機能（延期理由も記載）

- **フルのOAuth 2.1 Authorization Server**：Dynamic Client
  Registration・`.well-known`メタデータ配信等を含む本格的な実装は、
  指示書2章「新しいEntityを増やさない」「接続を完成させることだけが
  目的」というスコープと衝突するため見送った（ADR 0041）。
- **実際のトンネルサービスへのアカウント登録・公開**：Claude Codeは
  アカウント作成・外部サービスへの契約を代行できない（安全
  ガイドライン）。比較・推奨（ADR 0042）とドキュメント化までに
  留めた。
- **ChatGPT Developer Modeでの実UI接続操作**：同様にOwner自身の
  ChatGPTアカウントでの操作が必要であり、Claude Codeでは代行
  できない。
- **Continuous Management・Daily Review自動生成・AgentTask・
  Artifact・自動Approve・自動保存・AI推論・ManagementFeedback自動
  生成**：指示書16章で明示的に対象外。

## 4. Architecture Review

### 新規Infrastructure

- `src/infrastructure/mcp/remoteServer.ts`（`createRemoteMcpApp`、
  エントリポイント）
- `src/infrastructure/openapi/generateOpenApi.ts`
  （`generateOpenApiDocument`、エントリポイント）

新規Entity・新規UseCase・新規Repositoryはなし——既存の
`buildMcpServer`（Version16）・`Connector`（Version15）・
`apiKeyAuth`（Version15）をそのまま再利用した。

### 変更したファイル

- `src/infrastructure/config/env.ts`：`MCP_HTTP_PORT`追加
- `package.json`：`@asteasolutions/zod-to-openapi`追加、
  `mcp:remote`/`openapi:generate`スクリプト追加
- `.env.example`：`MCP_HTTP_PORT`追記

## 5. ADR（追加・変更したADR、追加しなかった理由）

指示書13章が明示的に求めた3件をすべてADR 0041〜0043として新規
作成した。

- **ADR 0041**: Remote MCPを採用した理由（Streamable HTTP選定、
  簡易Bearer認証のみでフルOAuthを見送った理由）
- **ADR 0042**: HTTPS公開方式の選定理由（比較表、Owner操作が必要な
  ことの明記）
- **ADR 0043**: OpenAPI生成をVersion18から開始した理由（zod
  バージョン選定、対象エンドポイントの絞り込み理由）

## 6. テスト（件数、カバレッジ、typecheck、lint、実機確認）

- `pnpm test`：**250件**全て緑（Version17完了時点246件から4件増加。
  Remote MCP end-to-endテスト2件——認証拒否、Read→Proposal→
  Approveの一連。OpenAPI生成テスト2件——全パスにoperationId、
  POSTのrequestBody存在確認）
- `pnpm typecheck`：エラーゼロ
- `pnpm lint`：エラーゼロ
- **実機確認**（ローカル版、指示書15章）：
  1. `ARC_API_KEY`未設定で`pnpm run mcp:remote`相当のコマンドを
     実行し、起動時エラーで即座に終了することを確認。
  2. 一時的な検証用スクリプトで、ARC Connector HTTP APIをローカルに
     起動し、Remote MCPサーバーを実サブプロセスとして起動、実HTTP
     MCP Client（`StreamableHTTPClientTransport`）で接続。
     - 誤ったBearerトークンでの接続が拒否されることを確認。
     - ツール一覧（10個）を確認。
     - 指示書8章の必須3ツール（`read_reflection`・`read_external`・
       `proposal_create`）を実際に呼び出し、正常応答を確認。
     - `proposal_create`→`proposal_approve`の一連を実行し、
       Approve前は何も保存されず、Approve後に初めて保存される
       （指示書9章）ことを確認。
  3. **「ChatGPT → Remote MCP」の実接続確認は実施していない**——
     公開HTTPSトンネル・ChatGPT Developer ModeでのUI操作を要し、
     いずれもOwner自身の操作が必要なため（詳細は7章）。
  - 検証用スクリプト・データは確認後に削除済み。

## 7. 修正したバグ（検出方法、原因、対応方法、再発防止）

### バグ: `generateOpenApi.ts`をimportすると`main()`が無条件に実行される

- **検出方法**：`generateOpenApi.test.ts`のテスト実行時、テストログに
  意図しない「OpenAPI document written to docs/openapi.json」という
  stdout出力が現れた。
- **原因**：`mcp/server.ts`（Version16）で一度発見・修正した
  （`docs/reports/Version16_Report.md`7章参照）のと全く同じパターンの
  バグ——新規作成した`generateOpenApi.ts`が`main().catch(...)`を
  モジュールのトップレベルで無条件に呼び出しており、
  `isMainModule()`ガードを持っていなかった。テストが
  `generateOpenApiDocument`をimportした際、モジュール全体が評価され、
  意図せず実際のファイル書き込みが実行されていた。
- **対応方法**：`http/server.ts`・`mcp/server.ts`と同じ
  `isMainModule()`関数を追加し、`if (isMainModule()) { main().catch
  (...) }`という形に修正した。
- **再発防止**：Infrastructure層に新しいエントリポイント（CLI/HTTP
  サーバー/MCPサーバー/生成スクリプト等）を追加する際は、必ず
  `isMainModule()`ガードを設けることを徹底する——今回で3回目の
  同種バグ発見であり、既存パターン（`http/server.ts`）を新規
  エントリポイント作成時に必ずコピー元として参照することを、次
  バージョン以降でも継続する。

## 8. 技術的負債（今後改善したい点）

- **簡易Bearer認証はChatGPTのネイティブUIと噛み合わない可能性が
  ある**：実際にChatGPT Developer Modeで接続する際、API Key入力欄が
  ない場合は「認証なし」モードでの接続が必要になり、公開URL自体が
  実質的な秘密情報になる。将来的にフルのOAuth 2.1実装が必要になる
  可能性がある（ADR 0041の再検討条件）。
- **OpenAPIドキュメントは自動同期されない**：`http/server.ts`・
  Connector・MCP Toolの該当エンドポイントに変更があった場合、
  `pnpm run openapi:generate`の再実行を忘れると`docs/openapi.json`が
  古いまま残る（ADR 0043）。
- **Rate Limitは未実装**：指示書10章のセキュリティ確認項目のうち、
  Bearer認証・HTTPS（トンネル側で担保）は対応したが、Rate Limitは
  実際の利用状況（ChatGPT接続後のトラフィック量）が分からない
  段階では時期尚早と判断し、YAGNIにより見送った。接続ログの仕組みも
  未実装——Remote MCPサーバーは標準エラー出力への最小限のログのみ。

## 9. 次Versionへの申し送り（技術的観点から推奨する事項）

- Owner自身がトンネル（ngrok推奨、ADR 0042）を起動し、ChatGPT
  Developer Modeから実際に接続を試みた結果を、次の指示書で
  共有してほしい。認証方式（Bearer/OAuth/認証なし）のうちどれが
  実際に機能するかによって、Version19以降の設計判断が変わる。
- 実際の接続で問題が生じた場合、Remote MCPサーバーのログ
  （現状stderrへの最小限の出力のみ）を強化する必要が出るかもしれ
  ない。

## 10. POへの提案（提案・懸念点・改善案を自由に記載）

- Version18は「接続環境の完成」を謳っているが、実際に「ARCが
  日常的にProject ARCを利用できる」状態になるには、Owner自身による
  トンネル起動・ChatGPT接続設定という手動ステップが残っている。
  この手動ステップ自体を減らす自動化（例：起動スクリプトの一本化）
  は、Version18の「新しいEntityを増やさない」というスコープには
  含まれないと判断し見送ったが、次Versionで検討する価値があるかも
  しれない。

## 11. CEOへのコメント（今回の成果、次Versionへの期待）

Version18は、指示書自身が「有料サービス導入前には必ずOwnerへ相談」
「最新の公式仕様を必ず調査した上で設計」と明記していた通り、実装
そのものよりも「何を実装しないか」の判断が重要なVersionだった。
事前調査でChatGPT Developer Modeの認証仕様が指示書の想定と異なる
ことを発見し、Owner確認を経てスコープを調整したことは、Version14が
「Owner自身が過去の自分の提案を撤回した」のと似た構造で、外部仕様の
制約が設計判断を上書きする場面をこのプロジェクトが初めて経験した
事例だと考える。

## 12. ARCへの引き継ぎ

### 新しい資産

- **Remote MCPサーバー**（`pnpm run mcp:remote`）— ARCがChatGPT
  Developer Mode経由でProject ARCへ直接接続できる技術的な土台が
  完成した。ローカルでの動作は実機確認済み。
- **OpenAPI 3.xドキュメント**（`docs/openapi.json`）— 主要10
  エンドポイントのoperationId/request/responseを含む。将来ChatGPT
  Actions実装の土台になる見込み。
- **運用ドキュメント**（`docs/setup/chatgpt-mcp-connection.md`）—
  Ownerが実際に接続する際の手順書。

### 新しいルール

- Remote MCP経由でも、書き込みは常にOwnerの明示的な承認
  （`proposal_approve`の呼び出し）を経由する。この制約はローカルの
  MCP・Connector・HTTP APIと完全に同一。
- **ChatGPTのUIにBearer API Key入力欄がない場合、「認証なし」
  モードでの接続が現実的な選択肢になる**——この場合、公開URLを
  知る誰でもアクセス可能になるため、URLの取り扱いには注意が必要。
- Remote MCPサーバーは`ARC_API_KEY`が設定されていないと起動しない
  （ローカルのHTTP API・stdio MCPとは異なる、opt-inではなく必須）。

### 新しい思想

Version18は、Project ARCが初めて「外部の第三者サービス（ChatGPT）の
仕様に自らを合わせる」という経験をしたVersionである。これまでの
Version（14〜17）はすべてProject ARC自身の設計判断だったが、
今回は「ChatGPTのMCP接続がOAuthを要求する」という外部の制約に
対して、フルのOAuth実装という選択肢を意図的に選ばず、YAGNIと
Constitutionのスコープ（新しいEntityを増やさない）を優先すると
いう判断を下した。これは「外部仕様に合わせて何でも実装する」
のではなく「外部仕様の要求と自らのスコープを照らし合わせて判断する」
という、より成熟した設計姿勢の表れだと考える。

### Ownerについて分かったこと

Version18の指示書は、これまでで最も明確に「有料サービス導入前には
必ずOwnerへ相談すること」を強調していた。実際に事前調査で発覚した
認証方式のズレについても、Owner確認を経てスコープを調整する
プロセスが機能した（事実ベースの観察）。

## 13. Product Review

### ユーザー体験で改善されたこと

Before：Version17までは、ARCがProject ARCへ接続できるのはローカルの
Claude Code経由のみだった。

After：技術的にはARCがChatGPT経由でProject ARCへ直接接続できる
土台が完成した。ただし実際に日常的に使うには、Owner自身がトンネルを
起動しChatGPT側で接続設定を行う必要があり、まだ「いつでも使える」
状態ではない。

### 毎日使う理由

Version18単体では、Owner自身が毎日触れる体験に直接的な変化はまだ
ない。トンネル・ChatGPT接続設定が完了して初めて、Version16〜17で
積み上げてきたMCP経由の価値がChatGPT側でも体感できるようになる。

### 懸念

トンネルサービスの無料枠には制約（ngrokのセッション時間制限等）が
あり、恒久的な接続を維持するには追加の検討（Cloudflare Tunnel＋
独自ドメイン等）が必要になる可能性がある。

### 次Versionで最も価値が高い改善

Owner自身が実際にトンネル・ChatGPT接続を設定し、「ARCが実際に
Project ARCを直接使えた」という一次体験を得ること。それが確認できて
初めて、Version18の「ARCが初めてProject ARCを直接利用する」という
キャッチコピーが完全に実現する。

## 14. 10年後のProject ARCへの貢献

Version18で10年後も効いてくるのは、「外部サービスの仕様変更に
対して、本体を変更せずアダプタ層だけで吸収する」という設計方針が、
2つ目の接続方式（Remote MCP）を追加する際にも機能したという実証で
ある——Version16でstdio MCPを追加した際に確立した`buildMcpServer`
ファクトリが、Remote MCPでもそのまま再利用できたことは、
「薄いアダプタ」パターンの再利用可能性が2回連続で証明されたことを
意味する。

「人生OS」というVisionから逆算すると、Version18はPhase 2
（External Brain）の最終仕上げであり、ARCという特定のAIサービスの
仕様変更（認証方式等）に振り回されずに、Project ARC本体の一貫性を
保ち続けられることを示した石である。将来ChatGPTの仕様がさらに
変わっても、あるいは別のAIサービスと接続する必要が生じても、
「Connectorが唯一の入口であり、その先のアダプタ層だけを差し替える」
という構造は変わらない——これはVersion15のADR 0034が見込んでいた
将来像そのものであり、3つのVersion（16・17・18）を経てその見込みが
繰り返し正しかったことが確認された。
