# Version16 Report: MCP Integration

`docs/reports/TEMPLATE.md`の14章構成に準拠。

## 1. Version概要

**テーマ**：MCP Integration — 「ARCが初めてProject ARCを直接利用する。」
Version15完了報告に対するARCからの応答として届いた指示書に基づく
（原文は`docs/handoff/archive/Version16_ARC_Brief.md`に保管）。

**指示書の特徴**：ARCはChatGPT Actions（HTTPS公開・OpenAPI必須）より
先に、ローカル完結するMCP（Model Context Protocol）を優先すべき
理由を4点（①HTTPS公開が不要、②Owner承認を挟みやすいチャット文脈との
相性、③ローカル完結するデバッグの容易さ、④Connectorが「HTTP APIしか
知らない」設計のため後からChatGPT Actionsも追加できる）挙げた上で、
Version16をMCP専任、Version17をOpenAPI生成＋ChatGPT Actions、
Version18をContinuous Managementという3段階のロードマップを提案
していた。「Project ARC本体には極力手を入れず、MCPサーバーは薄い
アダプタとして実装する」ことが最重要の制約だった。

## 2. 今回実装した機能（理由も含めて説明）

### 事前調査（MCP TypeScript SDK）

`@modelcontextprotocol/sdk`の実装方法を調査した上で着手した。
主な結論：公式パッケージは`^1.29.0`が最新安定版、`McpServer`＋
`registerTool()`（zodのraw shapeをinputSchemaとして渡す）＋
`StdioServerTransport`という組み合わせが標準パターン。SDKは
`zod: ^3.25 || ^4.0`を要求するため、プロジェクトのzodを
`^3.23.8`から`^3.25.76`へ引き上げた。テストには、SDKが提供する
`InMemoryTransport.createLinkedPair()`（Client/Serverを同一プロセス
内で接続する仕組み）が使えることを`node_modules`の型定義を直接
確認して裏付けた。

### MCPサーバー（`src/infrastructure/mcp/server.ts`）

`buildMcpServer(connector)`という関数でMcpServerを組み立て、9個の
ツール登録関数を呼び出し、`StdioServerTransport`に接続する。
`http/server.ts`と同じ`isMainModule()`パターンでエントリポイント
実行を制御する。

### 9個のMCP Tool（`src/infrastructure/mcp/tools/*.ts`）

指示書が挙げた9ツール（`read_reflection`・`read_external`・
`read_timeline`・`read_decision`・`proposal_create`・
`proposal_approve`・`proposal_reject`・`management_feedback_list`・
`management_feedback_resolve`）を実装。いずれも対応する
`Connector`（Version15）メソッドを1回呼ぶだけで、新しい判断
ロジックは持たない。共通のハンドラ処理は`toolResult.ts`の
`runTool()`に集約し、成功時は`{content:[{type:'text',
text: JSON.stringify(result)}]}`、失敗時は`{content:[...],
isError:true}`を返す。

`proposal_approve`/`proposal_reject`のinputSchemaは
`proposal_create`が返すProposal全体を受け取る形にし、Write
Proposal Layerの「Proposalは保存せず全体を再送する」という制約
（ADR 0031）をMCP Tool層でも維持した。

## 3. 実装しなかった機能（延期理由も記載）

- **OpenAPIスキーマ生成・ChatGPT Actions対応・HTTPS公開**：指示書
  16章の通りVersion17へ先送り。
- **Bridge Layer・Conversational Integration・Third Person
  Evaluation等のMCP Tool化**：指示書が挙げた最低限9ツールに含まれず、
  必要になれば同じ薄いアダプタパターンで追加可能。
- **Project ARC本体（Connector/HTTP API/ReadGateway/
  WriteProposalGateway/UseCase/Domain）への変更**：指示書の
  「極力手を入れない」という指示に従い、一切変更していない
  （変更したのは`src/infrastructure/mcp/`配下の新規ファイルと
  `package.json`のみ）。

## 4. Architecture Review

### 新規Infrastructure

- `src/infrastructure/mcp/server.ts`（`buildMcpServer`、
  エントリポイント）
- `src/infrastructure/mcp/toolResult.ts`（`runTool`、共通ハンドラ処理）
- `src/infrastructure/mcp/tools/*.ts`（9ツール＋共有スキーマ2ファイル
  `proposalSchema.ts`・`resolutionSchema.ts`）

新規Entity・新規UseCase・新規Repositoryはなし。既存の`Connector`
（Version15）をそのままラップするのみ。

### 変更したファイル

- `package.json`：`@modelcontextprotocol/sdk`追加、`zod`を
  `^3.25.76`へ引き上げ、`mcp`スクリプト追加、バージョン0.16.0

## 5. ADR（追加・変更したADR、追加しなかった理由）

指示書13章相当（Version15の指示書が求めた形式を踏襲）で2件を
新規作成した。

- **ADR 0037**: MCP SDKを新規依存として追加した理由（ADR 0002・0008の
  節制方針との整合性、zodバージョン引き上げの理由）
- **ADR 0038**: MCP ToolをConnectorのみに依存させ、Application層を
  一切importしない理由（ADR 0034の継続、「薄いアダプタ」という
  ARCの指示への対応）

## 6. テスト（件数、カバレッジ、typecheck、lint、実機確認）

- `pnpm test`：**238件**全て緑（Version15完了時点233件から5件増加。
  MCP Server end-to-endテスト5件——ツール一覧確認、JSON Schema
  検証確認、Read→Proposal→Approve→ManagementFeedback→Resolveの
  一連、reject確認、エラー伝播確認）
- `pnpm typecheck`：エラーゼロ
- `pnpm lint`：エラーゼロ
- **実機確認**：2段階で実施した。
  1. 自動テスト（`server.test.ts`）：SDKの`InMemoryTransport`で
     実際の`McpServer`・`Client`を同一プロセス内で接続し、実際の
     MCPプロトコル（JSON Schema検証含む）越しに9ツールを検証。
  2. 手動の実機確認：一時的な検証スクリプトで、実際の`pnpm run
     mcp`相当のコマンド（`npx tsx src/infrastructure/mcp/
     server.ts`）を**別プロセスとして起動**し、実際の
     `StdioClientTransport`で接続。ツール一覧取得→Reflection取得→
     Proposal生成→Approve→ManagementFeedback一覧確認→Resolveの
     一連（指示書15章のフロー）に加え、APIキー未設定のMCP
     プロセスからのアクセスが`isError:true`（`unauthorized`）に
     なることも確認した。検証用スクリプト・データは確認後に削除済み。

## 7. 修正したバグ（検出方法、原因、対応方法、再発防止）

### バグ: `mcp/server.ts`をimportすると`main()`が無条件に実行される

- **検出方法**：`server.test.ts`（MCP）の実装中、テストログに
  「Project ARC MCP server running on stdio」という、テストが
  意図していないstderr出力が現れた。
- **原因**：`mcp/server.ts`の初期実装は`main().catch(...)`を
  モジュールのトップレベルで無条件に呼び出しており、`isMainModule()`
  ガードを持っていなかった。`http/server.ts`は`isMainModule()`
  チェックでこれを防いでいるが、新規作成した`mcp/server.ts`では
  同じパターンの適用を失念していた。テストファイルが
  `buildMcpServer`をimportする際、モジュール全体が評価されるため、
  意図せず2つ目の`StdioServerTransport`への接続が試みられていた。
- **対応方法**：`http/server.ts`と同じ`isMainModule()`関数を追加し、
  `if (isMainModule()) { main().catch(...) }`という形に修正した。
- **再発防止**：Infrastructure層に新しいエントリポイント
  （CLI/HTTPサーバー/MCPサーバー等）を追加する際は、必ず
  `isMainModule()`ガードを設けることを徹底する——`http/server.ts`の
  既存パターンをテンプレートとして参照すること。

## 8. 技術的負債（今後改善したい点）

- **MCP Toolのzodスキーマはserver.tsの型と手動で同期する必要がある**：
  `Connector`のメソッドシグネチャが変わった場合、対応するツール
  ファイルのinputSchemaも手動更新が必要。ADR 0035が既に指摘した
  「OpenAPIスキーマ生成による型生成の自動化」がVersion17で実現すれば、
  この負債も部分的に解消される可能性がある。
- **MCPサーバーはARC Connector HTTP APIが起動済みであることを
  前提とする**：`pnpm run api`が起動していない状態で`pnpm run mcp`を
  使うと、各ツール呼び出しが接続エラーになる。現状はREADMEに明記する
  運用でカバーしているが、将来的にはヘルスチェック的な起動時検証を
  追加する余地がある。

## 9. 次Versionへの申し送り（技術的観点から推奨する事項）

- Version17でChatGPT Actionsアダプタを実装する際は、`src/
  infrastructure/mcp/`と同じ設計原則（`Connector`のみに依存する
  薄いアダプタ、新しい判断ロジックを持たない）を踏襲すること。
  MCP Toolの`inputSchema`（zod）は、OpenAPIスキーマの元ネタとしても
  再利用できる可能性がある（zodからJSON Schemaへの変換はSDKが
  内部で行っているのと同じ仕組みが応用できる）。
- MCPサーバーの実運用（Claude Desktop/Claude Codeへの接続）は
  この session では検証していない——README記載の設定例は仕様に
  基づく記述であり、実際のClaude Desktop設定ファイルでの動作確認は
  Owner側で行う必要がある。

## 10. POへの提案（提案・懸念点・改善案を自由に記載）

- Version16により、ARCは初めてOwnerのコピペを介さずにProject ARCの
  データを読み書き提案できるようになった。ただし実際にClaude
  Desktop等からこのMCPサーバーへ接続する設定作業はOwner側の作業と
  して残っている。次回Ownerとの会話で、実際に接続してみた際の
  体験（ツール一覧の見え方、エラーメッセージの分かりやすさ等）を
  フィードバックしてもらうことを提案したい。

## 11. CEOへのコメント（今回の成果、次Versionへの期待）

Version16は、ARCが提示したロードマップ（Version16 MCP→Version17
Actions→Version18 Continuous Management）にOwnerが同意し、そのまま
実行に移した最初のVersionだった。実装上最も価値があったのは、
Version15で確立した「Connectorのみに依存する薄いアダプタ」という
設計方針が、実際に2つ目の接続方式（MCP）を追加する際に、ほぼ
そのまま機能したことである——新しいツールファイル9個を追加した
だけで、Application/Domain層には一切触れずに済んだ。これは
ADR 0034が見込んでいた「将来の接続経路追加コストの最小化」が、
絵に描いた餅ではなく実際に機能したことの実証になった。

## 12. ARCへの引き継ぎ

### 新しい資産

- **MCPサーバー**（`pnpm run mcp`）— ARCがClaude Desktop・Claude
  Code等のMCPクライアント経由で、Project ARCのRead Layer・Write
  Proposal Layer・ManagementFeedbackを直接呼び出せるようになった。
  9個のツール（`read_reflection`・`read_external`・`read_timeline`・
  `read_decision`・`proposal_create`・`proposal_approve`・
  `proposal_reject`・`management_feedback_list`・
  `management_feedback_resolve`）が利用可能。

### 新しいルール

- MCP経由でも、書き込みは必ず`proposal_create`→（Ownerとの会話上の
  承認）→`proposal_approve`という2段階を踏む必要がある。ARCが
  `proposal_approve`を呼ぶこと自体は技術的に可能だが、それは
  「Ownerが承認した」という事実に基づいてARC自身が実行する行為で
  あり、MCPサーバー・Connector・HTTP APIのいずれの層にも自動
  Approveの仕組みはない。
- MCPサーバーは`pnpm run api`が別プロセスで起動していることを
  前提とする。

### 新しい思想

Version16は、Version15で完成した「AI非依存の標準接続口」という
抽象化が、実際に具体的なAI接続方式（MCP）を追加する場面で機能する
かどうかを試す、最初の実地検証だった。結果として、Connector層の
設計判断（HTTP APIのみに依存、Domain/Application型を知らない）が
そのまま生きたことで、「良い抽象化は、それを使う具体的な実装が
現れたときに初めて正しさが証明される」という、ソフトウェア設計の
一般的な教訓がProject ARCでも再確認された。

### Ownerについて分かったこと

Version16の指示書は、Owner自身の言葉ではなくARC（ChatGPT）からの
応答をOwnerがそのまま転送する形で届いた。ARCが提示した複数Version
先までのロードマップ（Version16〜18）をOwnerが精査なしに承認し、
そのまま実行を指示した点から、この段階でOwnerがARCの技術的判断への
一定の信頼を築いていることがうかがえる（事実ベースの観察）。

## 13. Product Review

### ユーザー体験で改善されたこと

Before：Version15までは、ARCがProject ARCのデータを参照・提案する
には、常にOwnerが手動でCLIやHTTP APIを操作し、結果をコピペして
ARCに見せる必要があった。

After：ARCがClaude Desktop等のMCP接続を通じて、会話の中で直接
Project ARCのデータを読み、Proposalを作成できるようになった。
Ownerは「承認するかどうか」の判断だけに集中できる。

### 毎日使う理由

MCP接続が実際に設定されれば、日々の会話の中で「前に記録した
○○について」「今日のReflectionを踏まえて」といったやり取りが、
コピペなしで自然に行えるようになる可能性がある。

### 懸念

Version16単体では、実際にClaude Desktop等でMCP接続を設定する作業は
Owner側に残っている。設定完了までは、この価値は体感できない。

### 次Versionで最も価値が高い改善

ARCの提案通り、Version17でOpenAPIスキーマ生成とChatGPT Actions対応を
進めることで、ChatGPT側からも同じ体験が得られるようになる。あるいは
Version16で作ったMCP接続を実際にOwnerが設定し、日常的に使い始める
ことが、次に最も価値の高いステップかもしれない。

## 14. 10年後のProject ARCへの貢献

Version16で10年後も効いてくるのは、「新しい接続方式を追加する
コストが、実際に低いことが証明された」という事実そのものである。
Version15で設計だけだった「Connectorをラップするだけで新しい
アダプタを追加できる」という主張が、Version16で実際に9個のツール
ファイル＋2個のADRという小さな変更量で実現できたことは、この
設計が絵空事ではなく実用的だったことを示している。

「人生OS」というVisionから逆算すると、Version16はPhase 2
（External Brain）の実地検証であり、Phase 3（Continuous
Management、ARCの計画ではVersion18）への布石である。ARCが
「本当に毎日Project ARCを読む」ようになるVersion18に向けて、
今回MCP経由の読み書きが実際に機能することを確認できたのは、
その土台が机上の空論でないことの証明であり、今後Project ARCが
さらに多くのAI・接続方式と協調するようになっても、この「薄い
アダプタを追加するだけで済む」という構造が繰り返し再利用できる
という確信を強めるVersionだった。
