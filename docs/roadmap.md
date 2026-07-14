# Roadmap

Principle 9（段階的拡張）に基づき、一度に全てを作らない。
各Versionは前段の土台の上にのみ積み上げる。

---

## Version1｜土台（完了）

**ゴール**：機能を作ることではなく、後続バージョンでDomain層を
壊さずに機能追加できる骨格と、判断基準となる思想文書を作ること。

| ステップ | 内容 |
|---|---|
| 1 | 思想ドキュメント確定（vision / principles / ai-roles / architecture / roadmap / ADR） |
| 2 | リポジトリ初期化・tsconfig・ESLint/Prettier・Vitest設定 |
| 3 | ~~Supabase CLIによるローカルPostgres環境構築~~ → Version2でJSON永続化に変更（ADR 0003） |
| 4 | Domain層：`Reflection`, `StudyLog`, `Task` エンティティ定義 |
| 5 | Application層：`RecordDailyReflection`など1〜2ユースケース（テスト駆動） |
| 6 | Adapters層：Repository実装（InMemory / Supabase） |
| 7 | Infrastructure：簡易CLI（`pnpm reflect`で日次振り返りを記録） |
| 8 | Docker化・CI設定・README整備 |

## Version2｜「ARCと一日を始め、ARCと一日を終える」（進行中）

**ゴール**：機能数よりUXを重視し、毎日使うプロダクトにする。

| 機能 | 内容 |
|---|---|
| Morning Brief（`pnpm morning`） | 今日の予定・やること・フォーカス（ダミー）、前日の勉強時間・支出（実データ） |
| Evening Reflection（`pnpm reflect`） | 今日の振り返り記録 + 100点満点の参考スコア |
| Life Inventory（`pnpm inventory`） | 持ち物の追加・一覧・更新（MVP） |
| 永続化 | ローカルJSONファイル（ADR 0003） |

Version2では以下を意図的に実装しない：Google Calendar/Tasks、
Supabaseクラウド同期、Gemini/OpenAI連携、画像解析、Decision Engine、
通知機能（すべてVersion3以降）。

## Version3｜「Connected Life」（進行中）

**ゴール**：自分の情報を管理するツールから、生活と繋がるシステムへ。

| 機能 | 内容 |
|---|---|
| Morning Brief（データソース差替） | Google Calendar/Tasksの実データを表示（UIは無変更） |
| Life Inventory拡張 | 購入日・価格・状態・用途・交換目安・メンテナンス履歴（複数）を追加 |
| Reflection改善 | 前日比較（自分自身との比較のみ、他人比較なし）を追加 |
| 認証 | Google OAuth（初回のみ）+ リフレッシュトークン暗号化保存（ADR 0004） |

Version3では以下を意図的に実装しない：Gemini/OpenAI連携、
Decision Engine、画像解析、通知機能（すべてVersion4以降）。
詳細は `docs/reports/Version3_Report.md` を参照。

## Version4｜「Memory」（進行中）

**ゴール**：生活と繋がるシステムから、人生を記憶するシステムへ。

| 機能 | 内容 |
|---|---|
| ARC Memory | 長期間保持する知識（Assets/Appearance/Goals等10カテゴリ）の追加・一覧・更新・削除 |
| Appearance Log | 月次の外見記録（写真ファイル管理のみ、画像解析なし） |
| Life Inventory写真紐付け | 持ち物に写真を紐付け |
| 横断検索 | MemoryとInventoryを横断検索（Reflection/Appearanceは対象外、ADR 0005） |

Version4では以下を意図的に実装しない：Gemini/OpenAI連携、
Decision Engine、通知機能、画像解析AI（すべてVersion5以降）。
詳細は `docs/reports/Version4_Report.md` を参照。

## Version5｜Skin Log / Purchase Log / Challenge Log（完了）

**ゴール**：Memoryで「知識」を、Appearance Logで「月次の総合的な
外見」を記録できるようになった土台の上に、より粒度の細かい記録先
（肌の状態・消耗品の購入サイクル・人生初挑戦）を追加する。

| 機能 | 内容 |
|---|---|
| Skin Log（`pnpm skin`） | 肌の状態（赤み・毛穴・ニキビ・ニキビ跡・皮脂）を数値で記録・比較。Appearance Logとは別Entity（ADR 0006） |
| Purchase Log（`pnpm purchase`） | 消耗品の「購入→使い始め→使い切り」を管理。Life Inventoryとは別Entity（ADR 0006） |
| Challenge Log（`pnpm challenge`） | 人生で初めて挑戦したこと（初めて食べたもの・体験）を記録 |

Version5では以下を意図的に実装しない：Gemini/OpenAI連携、
Decision Engine、通知機能、画像解析AI（Version6以降）。
詳細は `docs/reports/Version5_Report.md` を参照。

## Version6｜Smart Capture（完了）

**ゴール**：「記録して」と言わなくても、写真・文章からどのLogを
更新すべきかの下書き提案が得られる仕組みを作る（Owner・ARC合意の
テーマ）。OCRや画像認識の高度な実装より、判断ロジックの
Architecture（Entity/UseCase/Repository設計）を優先する。

設計着手時に`docs/ai-roles.md`（Principle 1/2/5/10）を確認した結果、
「Systemは判断しない、忠実に記録するだけ」という原則との整合性を
取る必要があった（ADR 0007）。最終的な分類・解釈はOwner/ARCに残し、
Project ARC（System）は(1)キーワードによる機械的な下書き提案の提示、
(2)Owner/ARCが確定した振り分け先への忠実な書き込み、の2つに役割を
限定する設計とした。

| 機能 | 内容 |
|---|---|
| Smart Capture（`pnpm capture`） | 文章・写真から、下書き提案（キーワード一致）を表示 → Owner確認 → SkinLog/PurchaseLog/ChallengeLog/AppearanceLogへ書き込み。書き込み履歴はCapture Logとして監査可能（ADR 0007） |

Version6では以下を意図的に実装しない：Gemini/OpenAI連携、実際の
画像解析・OCR、Decision Engine、通知機能（すべて将来のVersion、
ADR 0002の再検討ポイント）。詳細は`docs/reports/Version6_Report.md`
を参照。

## Version7｜ARC Connector（完了）

**ゴール**：Project ARCを「CLIアプリ」から「ARCが利用できるデータ
基盤」へ進化させる。「ARCが判断し、Project ARCが保存する」という
責務分離をHTTP API化によって正式に設計する（ARCブリーフ）。

| 機能 | 内容 |
|---|---|
| ARC Connector（`pnpm api`） | Application層をHTTP経由で呼び出せるAPI。`POST /reflection` `/skin` `/purchase` `/purchase/:id/start` `/purchase/:id/finish` `/appearance` `/capture/suggest` `/capture`、`GET /health`。新規外部依存なし（Node標準`http`）。ローカル専用・認証未実装（ADR 0008） |
| TimelineEntry型 | Version8のTimeline機能に向けたEntity設計のみ（永続化・UseCaseは未実装） |

ADR 0007の「Systemは判断しない」という制約はAPI化後も維持した
（`/capture`は確定済みdestinations必須、`/capture/suggest`は下書き
提案のみ）。詳細は`docs/reports/Version7_Report.md`を参照。

## Version8｜Timeline（完了）

**ゴール**：Version7で型のみ設計した`TimelineEntry`を実装し、
各Logを横断した時系列一覧を提供する。

| 機能 | 内容 |
|---|---|
| Timeline（`pnpm timeline`、`GET /timeline`） | Reflection/AppearanceLog/SkinLog/PurchaseLog/ChallengeLog/Captureの6Logを横断して日付降順で一覧表示。`--since=` `--source=` `--limit=`で絞り込み可能。Memory/Life Inventoryは対象外（ADR 0009） |

Timeline自体は各Logの記録を集めて並べ替えるだけで、「何が重要か」の
判断・要約は行わない（ADR 0007/0008から継続する方針）。詳細は
`docs/reports/Version8_Report.md`、
[`docs/architecture-diagram.md`](./architecture-diagram.md)（Owner
提案によるアーキテクチャ図）を参照。

## Version9｜ARC Bridge（完了）

**ゴール**：ARCとProject ARCの最初の接続点を作る。完全自動は目指さず、
Ownerが「ARCの提案をProject ARCへ簡単に渡せる状態」を作る（ARC
ブリーフ）。

| 機能 | 内容 |
|---|---|
| Bridge Layer（`pnpm bridge -- import/export`、`POST /bridge/import`、`GET /bridge/export`） | `{type, data}`形式のJSONで複数Logを一括登録・一括出力。既存UseCaseへ委譲するだけの薄いディスパッチャ（ADR 0010） |
| Third Person Evaluation（`pnpm evaluation`、`POST /evaluation`） | 他者からの評価・コメントを構造化して記録。Appearance Logとは別Entity（ADR 0011、Version5〜8から持ち越しの課題を正式決着） |

ADR 0007/0008の「Systemは判断しない」という制約はBridge Layerでも
維持した（`type`は呼び出し側が確定済みの値として渡す）。Owner提案に
より、Version9からVersion Reportに14章「10年後のProject ARCへの
貢献」が追加された（`docs/reports/TEMPLATE.md`参照）。詳細は
`docs/reports/Version9_Report.md`を参照。

## Version10｜External Brain（完了）

**ゴール**：外部情報（記事・書籍・会話・動画等から得た知識）を
Project ARCに保存し、後から再利用できるようにする。「Phase 2
External Brain」の最初のVersion（長期ロードマップ2.0）。ARCから
PDFで届いた24節構成の実装指示書に基づく。

| 機能 | 内容 |
|---|---|
| ExternalSource（出典） | Web/書籍/論文/動画等の出典情報（書誌情報のみ）。ExternalKnowledgeとは別Entity（ADR 0013） |
| ExternalKnowledge（知識）（`pnpm external`） | 出典から得た知識・情報。原文（content）とOwnerの解釈（ownerSummary/ownerComment）を分離。confidence/statusはOwnerが設定。MemoryEntryとは別Entity（ADR 0012・0018） |
| 検索（`pnpm external -- search`） | ExternalKnowledge専用の検索。`pnpm find`（Memory/Inventory対象）とは分離（ADR 0014） |
| Bridge拡張 | `ExternalSource`/`ExternalKnowledge`をImport/Export対象に追加（ADR 0015・0016） |
| Timeline拡張 | ExternalKnowledgeをTimelineに追加（要約のみ、contentは含めない）。ExternalSource自体は対象外（ADR 0017） |
| HTTP API拡張 | `/external-sources`・`/external-knowledge`・`/external-knowledge/search`のCRUD+検索エンドポイント |

Version10では以下を意図的に実装しない：外部情報の自動信頼度評価、
重複の自動統合、Bridge Import時の同一バッチ内forward reference
解決、Apple Health等の実データ連携（すべて将来のVersion、
ADR 0012・0016参照）。詳細は`docs/reports/Version10_Report.md`を
参照。

## Version11｜Knowledge Retrieval（完了）

**ゴール**：Version10で「蓄積」した外部知識を、ARCが会話の中で
実際に「取り出せる」ようにする。Version10完了報告に対するARCの
応答として届いたテーマ提案に基づく（原文は`docs/handoff/archive/
Version11_ARC_Brief.md`に保管）。

| 機能 | 内容 |
|---|---|
| RetrieveKnowledgeUseCase（Query Layer） | query/tags/topics/limitを受け取り、ExternalKnowledge/ExternalSourceをスコア順に取得。Memory/Timeline/findとの統合は行わない（ADR 0019） |
| Ranking | タイトル一致・タグ一致・Topic一致による機械的スコアリングのみ。Embedding・AIによる関連度判定はなし（ADR 0020） |
| Context Builder（`buildRetrievalContext`） | 取得結果を「【External Brain】」引用ブロックへ整形する純粋関数。ARCの推論部分は生成しない（ADR 0021） |
| CLI（`pnpm external -- retrieve`） | クエリ・タグ・トピックで検索し、ランキング結果とContext Builder出力を表示 |
| HTTP API（`POST /knowledge/retrieve`） | `{results, sources, context}`を返す。AI APIの呼び出しはなし |

Version11では以下を意図的に実装しない：ベクトル検索・RAG・
Embedding、OpenAI/Claude/Gemini API呼び出し、自動要約・自動タグ・
自動分類、Memory/Timeline/findとのQuery Layer統合（すべて将来の
Version、ADR 0019・0021参照）。詳細は`docs/reports/
Version11_Report.md`を参照。

## Version12｜Decision Support（完了）

**ゴール**：Version11で「取得」できるようになった外部知識を、
選択肢の整理・比較材料の提示という形でOwnerの意思決定を支援する。
Version11完了報告に対するARCの応答として届いたテーマ提案に基づく
（原文は`docs/handoff/archive/Version12_ARC_Brief.md`に保管）。
「知識を持つ」から「より良い判断を支援する」へ。

| 機能 | 内容 |
|---|---|
| DecisionEngineUseCase | Question→Retrieve→CandidateBuilder→EvidenceCollector→ComparisonBuilder→DecisionContextという流れで比較材料を組み立てる。決定・優先順位付けは行わない（ADR 0023） |
| CandidateBuilder | 質問文から選択肢を機械的パターン一致で導く（明示指定＞topic一致＞開放質問へのtopic提示＞Yes/Noフォールバック）。優先順位は付けない（ADR 0022） |
| ComparisonBuilder | 根拠テキストからメリット/デメリットに該当する記述をキーワード一致で抜き出すのみ。新しい評価文は生成しない（ADR 0023） |
| DecisionContext（Value Object） | question/candidates/comparisons/evidenceList/missingInformation/pointsForOwnerToDecideを持つ、永続化しない一時生成物（ADR 0024） |
| CLI（`pnpm decision`） | 質問を渡すか対話式に聞き、DecisionContextを表示 |
| HTTP API（`POST /decision/support`） | `{decisionContext, retrievedKnowledge, sources}`を返す |

Version12では以下を意図的に実装しない：AI API呼び出し・自動決定・
スケジュール変更・タスク自動生成・Memory/Reflection/External Brain
の更新・自動通知・MCP・ChatGPT Actions、Bridge Import/Exportへの
DecisionContext統合（一時生成物のため、ADR 0025参照）。詳細は
`docs/reports/Version12_Report.md`を参照。

## Version13｜Conversational Integration（完了）

**ゴール**：「Owner→CLI→コピペ→ARC」という手作業の橋を、1回の
質問応答で完結する形に近づける。Version12完了報告に対するARCの
応答として届いたテーマ提案に基づく（原文は`docs/handoff/archive/
Version13_ARC_Brief.md`に保管）。「Project ARCを、初めて日常会話の
中で自然に使えるようにする。」

| 機能 | 内容 |
|---|---|
| ConversationGatewayUseCase | Conversation→Intent Detection→Tool Selection→Retrieve/Decision→ConversationContextという流れの唯一の入口。CLI/HTTP APIから共通で呼ばれる（ADR 0026） |
| IntentDetector | 質問をRetrieval/Decision/Noneへ機械的パターン一致で分類。AIは使わない（ADR 0029） |
| Tool Selection | Intentに応じてRetrieveKnowledgeUseCase/DecisionEngineUseCaseのどちらを呼ぶかだけを選択。回答内容は生成しない（ADR 0028） |
| ConversationContext（Value Object） | question/intent/retrievedKnowledge/decisionContext/sources/warningsを持つ、永続化しない一時生成物。会話自体も保存しない（ADR 0027） |
| Context Injection（`buildConversationContextText`） | 【Retrieved Knowledge】【Decision Context】【Sources】の3セクションのみを生成。「【ARC】」部分はARC自身が書く（ADR 0028） |
| CLI（`pnpm conversation`） | 質問を渡すか対話式に聞き、ConversationContextを3セクション形式で表示 |
| HTTP API（`POST /conversation/context`） | `{conversationContext}`を返す。認証方式はVersion8から変更なし（127.0.0.1限定） |

Version13では以下を意図的に実装しない：ChatGPT Actions・MCP・
Claude/OpenAI/Gemini API呼び出し、自動保存・自動更新・自動
Reflection・自動Memory更新、会話履歴保存、自動要約・自動推論
（すべて将来のVersion、ADR 0027・0028・0029参照）。詳細は
`docs/reports/Version13_Report.md`を参照。

## Version14｜ARC Integration

Version13完了時点で、Project ARCは「記録→検索→比較→Conversation」
まで完成したが、ARC（ChatGPT）とProject ARCのやり取りは依然として
Ownerによる手動コピペのみで、直接の読み書きはできなかった。Owner
指示書（2026年7月14日、`docs/handoff/archive/Version14_ARC_Brief.md`）
は当初「ARCが直接POSTする」案を提示したが、Owner自身がこれを撤回し、
Constitution第2条（Systemは判断しない）・第4条（Ownerが最終決定
する）をより厳密に守るため、`ARC → Write Proposal → Owner承認 →
Project ARC`という中間層を新設する方針へ修正した。この方針は
Version13時点の予測（「継続的マネジメント」）とは異なる新方針であり、
本セクションとしてVersion14の内容をroadmapへ新規追加する。

- **ReadGateway**（`ReadGatewayUseCase`、ADR 0030）：ARCが会話の中で
  必要最小限のデータだけを取得できる読み取り専用の入口。
  `GET /read/reflection`・`/read/timeline`・`/read/external`・
  `/read/decision`はいずれも`limit`を必須とし、既存の
  GetTimeline/RetrieveKnowledge/DecisionEngineUseCaseへ委譲するのみ。
- **Write Proposal Layer**（`WriteProposalGatewayUseCase`、ADR 0031）：
  `createProposal`→Owner承認→`approveProposal`という2段階の書き込み
  経路。Proposal自体はRepositoryを持たず、Systemは一切保存しない
  ——承認時にOwnerがProposal全体を再送することで初めて既存UseCase
  経由の書き込みが実行される。`rejectProposal`は何も永続化しない。
  対応するProposal種別：Reflection/Memory/ExternalKnowledge/
  Appearance/ManagementFeedback。
- **ManagementFeedback**（新Entity、ADR 0032・0033）：ARC視点の
  Project ARC運用改善提案を表すEntity。Reflection（Owner視点の
  振り返り）とは別Entityとし、`resolution`（Open→Accepted→
  Implemented→Closed、またはRejected）という状態機械を持つ。
  Timelineには含めない（継続的な管理対象であり「ある瞬間の
  出来事」ではないため）。
- **CLI**：`pnpm propose`で対話式にProposalを作成→表示→Approve確認
  の流れを実行できる。`pnpm propose list-feedback`・
  `pnpm propose resolve <id> <resolution>`でManagementFeedbackの
  一覧表示・状態遷移も可能。

MCP・ChatGPT Actions・Claude API・Gemini API接続、自動Approve、
自動保存、AI推論はVersion14の対象外（指示書18章）。詳細は
`docs/reports/Version14_Report.md`参照。

## Version15｜Connector Deployment

Version14で完成したRead Layer/Write Proposal Layerを、実際に外部
プログラムから呼び出せる標準的な接続口として仕上げるVersion。Owner
指示書（`docs/handoff/archive/Version15_ARC_Brief.md`）は「ARCが実際に
利用できる状態へ進める」ことを目的としつつ、「Project ARCはARCに
依存することではない。ARCはその利用者の一人である」という独立性を
強調していた。

- **Connector**（`src/infrastructure/connector/Connector.ts`、ADR 0034）：
  ARC Connector HTTP APIをHTTP経由でのみ呼び出すクライアントモジュール。
  Application/Domain層の型を一切importしない。Read（reflection/
  timeline/external/decision）・CreateProposal・ApproveProposal・
  RejectProposal・ManagementFeedbackのlist/resolveを提供する。
- **API Key認証**（`src/infrastructure/security/apiKeyAuth.ts`、
  ADR 0036）：`Authorization: Bearer <ARC_API_KEY>`固定（ChatGPT
  Actions・MCP双方の認証慣習に合わせた形式、事前調査済み）。
  `ARC_API_KEY`が設定されている場合のみ強制するopt-in設計——
  Version7〜14の既存運用・テストを一切壊さない。認証コードは
  Infrastructure層のみに閉じ込め、Application層は関与しない。
- **Connector Configuration**（`connectorConfig.ts`）：接続先・API Key
  を`.env`経由で読み込み、ハードコードしない。
- **ManagementFeedbackのHTTPエンドポイント追加**（ADR 0035）：
  `GET /management-feedback`・`POST /management-feedback/:id/resolve`
  ——Version14ではCLIのみで完結させていたが（ADR 0033）、Connectorが
  「HTTP APIのみ利用する」制約を持つため見直した。

MCP・ChatGPT Actionsそのものの実装、公開HTTPS化、OpenAPIスキーマ
生成はVersion15の対象外（指示書16章）。事前調査の結果は
`docs/reports/Version15_Report.md`に記録し、Version16（各AIとの
接続実装）への申し送り事項とした。詳細は`docs/reports/
Version15_Report.md`参照。

---

## Version16｜MCP Integration

「ARCが初めてProject ARCを直接利用する。」Version15完了報告への
ARCからの応答（`docs/handoff/archive/Version16_ARC_Brief.md`）に
基づく。ARCはChatGPT Actions（HTTPS公開・OpenAPI必須）より先に、
ローカル完結するMCP（Model Context Protocol）を優先することを提案し、
Owner承認のもとVersion16のテーマとなった。理由：①HTTPS公開が不要、
②Owner承認を挟みやすいチャット文脈との相性、③全てローカルで完結
するデバッグの容易さ、④ConnectorがHTTP APIしか知らない設計のため、
MCPもChatGPT Actionsも同じConnectorをラップするだけで後から追加
できる。

- **MCPサーバー**（`src/infrastructure/mcp/server.ts`、`pnpm run mcp`）：
  stdio transportの薄いアダプタ。`Connector`（Version15）のみに依存し、
  Application/Domain層は一切importしない（ADR 0038）。
- **9個のMCP Tool**（`read_reflection`・`read_external`・
  `read_timeline`・`read_decision`・`proposal_create`・
  `proposal_approve`・`proposal_reject`・`management_feedback_list`・
  `management_feedback_resolve`）：いずれも対応する`Connector`
  メソッドを1回呼ぶだけ。JSON SchemaはzodスキーマからSDKが自動変換。
- **新規依存**：`@modelcontextprotocol/sdk`を追加、zodを`^3.25.76`へ
  引き上げ（ADR 0037）。

OpenAPIスキーマ生成・ChatGPT Actions対応・HTTPS公開は当初Version17へ
先送りする想定だったが、Version16完了後のARCからの応答により
Version18へさらに繰り下がった（下記Version17参照）。Project ARC
本体（Connector/HTTP API/ReadGateway/WriteProposalGateway/UseCase/
Domain）への変更は一切なし。詳細は`docs/reports/Version16_Report.md`
参照。

---

## Version17｜Agent Collaboration Layer

「まず無料・ローカルでAgent Collaboration Layerを実装し、Claude Code
との往復を成立させる。」Version16完了報告へのARCからの応答
（`docs/handoff/archive/Version17_ARC_Brief.md`）に基づく。ARCは
役割分担を明確化した上で（ARCは設計・調査・レビュー・運用判断、
Claude Codeは実装・PC上の設定）、ChatGPT接続のためのRemote MCP化
（≒当初Version17として想定されていたOpenAPI/Actions対応）を
Version18へ先送りし、先にARC↔Claude Code間の指示書・Feedbackを
Project ARC自身のデータとして保存できるようにすることを提案した
——この着手順の変更により、ARCが当初構想していたロードマップ
（旧Version17=Actions対応、旧Version18=Continuous Management）は
それぞれVersion18・Version19へ繰り下がる。

- **AgentMessage**（新Entity）：ARC↔Claude Code間の指示書・Feedback
  の往復記録。Version14で確立した「新しいProposal種別を1つ追加する」
  パターン（ManagementFeedbackと同型）をそのまま踏襲した
  （ADR 0039）。`resolution`状態機械は持たない（単純な往復記録）。
- **`agent_message_list`**（新規MCP Tool、`GET /agent-messages`）：
  一覧取得のみ専用に追加。書き込みは既存の`proposal_create`/
  `approve`/`reject`が`type: 'AgentMessage'`を受け付けるだけで済み、
  新規の書き込みツールは不要だった。
- **Claude CodeのMCP接続**：`.mcp.json`をプロジェクトへ追加し、
  既存のstdio MCPサーバー（Version16）へClaude Code自身を接続した
  （Owner承認済み、次回Claude Code再起動時に有効化）。
- **AgentTask・Artifactは今回実装しない**（ADR 0040）：ARCのメッセージ
  が挙げた3概念のうちAgentMessageのみが「まずやる順番」①〜③の
  文面上要求されており、AgentTask（作業単位管理）・Artifact
  （生成物カタログ化）は具体的仕様がなく、YAGNIにより先送りした。

Project ARC本体の既存部分（Connector/HTTP API/ReadGateway/
WriteProposalGateway）への変更は最小限（`AgentMessage`をProposal
種別に追加しただけ）に留めた。詳細は`docs/reports/
Version17_Report.md`参照。

---

## Version18｜Remote MCP Integration

「ARCが初めてProject ARCを直接利用する。」Version17完了報告への
ARCからの正式な指示書（`docs/handoff/archive/
Version18_ARC_Brief.md`）に基づく。「おとのコピペを減らすこと」を
唯一の成功指標とし、Project ARC本体の設計変更ではなく接続環境の
完成のみを目的とした。指示書自身が求めた事前調査の結果、ChatGPT
Developer Modeのネイティブな認証方式はOAuth 2.0/2.1または
「認証なし」であり、指示書が想定していた「Bearer認証」との
ズレが判明——Owner確認の結果、簡易Bearer認証のみを実装し、フルの
OAuth 2.1 Authorization Serverは見送る方針で進めた（ADR 0041）。

- **Remote MCPサーバー**（`src/infrastructure/mcp/remoteServer.ts`、
  `pnpm run mcp:remote`）：MCP公式仕様の現行Remote transport
  （Streamable HTTP）を実装。Version16のstdio版（`server.ts`、
  Claude Code用）とは独立した新規エントリポイントであり、既存の
  `.mcp.json`・stdio接続は一切変更しない（Claude Codeとの共存を
  確認済み）。`ARC_API_KEY`はopt-inではなく必須とし、未設定時は
  起動時エラーとする安全側の設計（ADR 0041）。
- **OpenAPI 3.x生成**（`pnpm run openapi:generate`、`docs/openapi.json`）：
  ARCが実際に利用する主要10エンドポイント（Read Layer・Write
  Proposal Layer・ManagementFeedback・AgentMessage）に絞って
  operationId・request・responseを生成する独立スクリプト。
  `http/server.ts`本体は変更しない（ADR 0043）。
- **HTTPS公開方式の比較**（ADR 0042）：Cloudflare Tunnel/Tailscale
  Funnel/ngrokを比較し、初回検証はngrok・恒久運用はCloudflare
  Tunnelを推奨。**いずれも実際の導入・アカウント作成はOwner自身の
  操作が必要**（Claude Codeは外部サービスへの契約を代行できない）。
- **運用ドキュメント**（`docs/setup/chatgpt-mcp-connection.md`）：
  起動順・`.env`設定・トンネル起動方法・ChatGPT接続手順・
  トラブルシューティングを記載。

**実機確認の範囲について**：ローカルで`pnpm run api`＋
`pnpm run mcp:remote`を起動し、実HTTP MCP Client
（`StreamableHTTPClientTransport`）経由でRead→Proposal→Approveの
一連を確認した（指示書15章のローカル版）。**「ChatGPT → Remote MCP」
の実接続確認は、公開HTTPS・ChatGPT Developer Modeでの実UI操作を
要するため、Claude Codeでは実施できない**——`docs/setup/
chatgpt-mcp-connection.md`の手順に従ってOwner自身が確認する。詳細は
`docs/reports/Version18_Report.md`参照。

---

## 長期ロードマップ 2.0（Version9完了時、ARC提案）

Version9完了を受け、ARCから中長期ロードマップの組み替え提案があった
（`docs/handoff/archive/`参照）。Version10「External Brain」は
その後PDFで指示書が届き、着手・完了した。Version11以降は方向性の
記録であり、確定した実装計画ではない
（Principle 9: 段階的拡張、Principle 1: 最終決定はOwner）。

- **Phase 1（Version1〜9）Data Foundation** — 完了。人生の事実を
  保存できる基盤（Reflection/Timeline/Bridge Layer/Third Person
  Evaluation/Smart Capture/ARC Connector）。
- **Phase 2（Version10〜15）External Brain** — 「ARCがProject ARCを
  読む」ことを最優先にする。Context Export/Import、ARC Bridge、MCP
  対応、API、Apple Health・Google Calendar等の外部データ取り込みを
  想定。Version10で最初の土台（ExternalSource/ExternalKnowledgeの
  保存・検索・Bridge/Timeline連携）、Version11でARCが実際に知識を
  取り出せるQuery Layer（Knowledge Retrieval）、Version12で取得した
  知識を比較・整理して判断材料を作るDecision Support、Version13で
  1回の質問応答でRetrieve/Decisionを呼び分けるConversational
  Integration（ConversationGateway）、Version14でARCが安全に読み
  書きできるRead Layer/Write Proposal Layer（ARC Integration）、
  Version15で外部プログラムから呼び出せる標準Connector（Connector
  Deployment）、Version16でARCが初めて直接利用できるMCPサーバー
  （MCP Integration）が完了。Healthデータ等の実データ連携・
  ChatGPT Actions対応・HTTPS公開は引き続きVersion17以降の課題と
  する——Version16時点でARCは`Connector`をラップするMCP Tool経由で
  Read/Proposal/ManagementFeedbackを扱えるようになったが、書き込みは
  常にOwnerの明示的な承認（`proposal_approve`の呼び出し）を経由する
  設計のため、MCPサーバー自体は自動Approveの手段を持たない。
- **Phase 3（Version16〜25）Life Management** — 毎日Reflection・
  睡眠・勉強・食事・筋トレ等をチェックし、ARCが未達を指摘する
  （「今週筋トレありません」等）、より踏み込んだ管理機能。
- **Phase 4 Life Analytics** — 記録間の相関分析（例：睡眠低下と
  肌荒れの関係）。
- **Phase 5 Prediction** — 記録の傾向からの予測（例：睡眠不足の
  継続から体調悪化を予測）。
- **Phase 6 Life OS** — 統合。

Phase 3以降は判断・評価・介入の度合いが強まるため、着手時に
Principle 1/2/5・`docs/ai-roles.md`との整合性を都度確認すること
（Systemは判断しない、という原則がどこまで・どう適用されるかは
Phaseが進むほど慎重な設計判断を要する）。

---

> 以降のVersion番号は、Version1着手時点で構想していた旧ロードマップ
> （下記）であり、実際の開発順序（上記）とは一致しなくなっている。
> 「Version5｜司法試験管理」等の記述は現時点では未着手であり、
> 実施順は今後Owner/ARCと都度合意する（Principle 9: 段階的拡張）。
> 上記「長期ロードマップ2.0」の方が新しいが、これも未確定の提案
> である点に注意。

## Version2｜外部接続

- Google Calendar / Google Tasks / Google Sheets / Notion / Gmail 接続設計
- Supabaseをローカル→クラウドプロジェクトへ切り替え（ADR 0001の想定通り）
- 認証・RLS設計（複数クライアント対応の前提づくり）

## Version3｜企業研究システム

- 毎週土曜：企業選定 → Gemini調査 → Markdown化 → ARC要約 → 企業図鑑へ保存
- ai-roles.mdの責務分担（Gemini=一次情報、ARC=解釈）をそのまま実装に反映

## Version4｜家計管理

- Google Sheets連携 → 支出分析 → 月次レポート → 改善提案
- 「記録は資産である」（Principle 4）に基づき、過去データの再分析が
  可能なスキーマ設計を優先

## Version5｜司法試験管理

- 科目・進捗・学習時間・復習・苦手分野の管理
- 既存の学習ログ（刑訴法・民訴法・不法行為法など）との統合を想定

## Version6｜毎日の振り返り

- 睡眠・勉強時間・少林寺拳法・英会話・気分・支出・食事・肌・筋トレ・
  今日の出来事・明日の目標を記録
- Version1で作るReflectionエンティティの拡張として実装

## Version7｜ニュース

- 日経・NHK・BBC・CNN等から重要ニュースを取得
- 取得（System/Gemini）と解説（ARC）の責務分離を厳守

## Version8｜企業図鑑

- 50社分、事業内容・利益の出し方・競合・強み・課題・IR・
  株価材料・法律との関係を蓄積

## Version9｜将来拡張

- Apple Health（睡眠・歩数・体重）、GitHub、株価、天気、位置情報等
- 外部データソースが増えるため、この段階で改めてAIService抽象化の
  要否を判断する（Principle 9, ADR 0002）

---

## 進め方の原則

各Versionの着手前に、そのVersionが対応するdocsを先に更新・
確認する。コードが思想より先行しないようにする
（Principle 8: 長期保守性、Principle 3: 継続性）。
