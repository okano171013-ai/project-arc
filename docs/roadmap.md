# Roadmap

Principle 9（段階的拡張）に基づき、一度に全てを作らない。
各Versionは前段の土台の上にのみ積み上げる。

## Version28以降｜優先開発候補（2026-07-18 Owner指示、Version27完了により繰り下げ）

Version1〜26で完成した記録基盤、External Brain、Decision Support、
ARC Connector、Remote MCP、Approval Policy、限定自動保存、Life Log、
行動介入レイヤーを前提に、既存の長期バックログと各Version Reportの
持ち越し事項を統合した。以下は一括実装せず、上から最小縦切りで進める。

**Version27は完了済み**：下表の優先2「Study Session Gateway」
（Bearer token・CORS制限・sessionId冪等化を備えた学習セッション
受信専用API）は、Version27「Study Session Ingestion」として実装・
コミット済み（`docs/reports/Version27_Report.md`・ADR 0054参照）。
既存の`StudyLog`Entity自体の配線（Version1から未着手のまま）は
今回のスコープ外で、下表では優先2を「StudyLog配線」のみに絞って
引き続き候補として残す。

**Version28は完了済み**：下表の優先1「Remote MCP Capability Registry」を
実装し、24 Tool・16 Proposal型・schema/build情報を単一の読み取り専用
Registryから取得可能にした（`docs/reports/Version28_Report.md`・ADR 0055参照）。
次の推奨VersionはVersion29「Runner Control Plane」とする。

**Version29は実装済み**：Runner Control Plane、build-aware状態記録、
共通kill switch、状態CLI、Windowsエントリ判定修正を追加した。詳細は
`docs/reports/Version29_Report.md`・ADR 0056参照。

**Version30の内容は、下表の優先度リストではなくPM Review
（2026-07-19、`docs/reviews/Project_ARC_PM_Review_2026-07-19.md`）の
Stability Gate優先度に従い変更した**：当初案の「AgentEvent/AgentTask」
ではなく「Remote MCP OAuth本番移行準備」（ARC-PM-001対応）を実施した
（`docs/reports/Version30_Report.md`・ADR 0057参照）。PM Reviewが
提案したVersion30〜34（Security/Data Durability/Release/API
Contract/Domain Consolidation）を、下表より優先する現行の方針とする。
AgentEvent/AgentTask（下表優先4）はStability Gate完了後まで
引き続き候補として残る。

| 優先 | 導入すべき機能 | 目的・既存資産との接続 | 完了の目安 |
|---:|---|---|---|
| 1 | Remote MCP Capability Registry（**Version28で完了済み**） | チャットや長寿命プロセスごとのツール定義差異をなくす。Version16〜18のMCP基盤を、schemaVersion/buildCommit/toolCountを返す単一レジストリへ発展させる | 新規ChatGPTチャット・ローカルMCP・公開URLで同一ツール名とProposal型を取得し、差異を自動検出できる |
| 2 | StudyLog配線（Study Session Gatewayは**Version27で完了済み**） | Version1から存在するStudyLog未配線を解消する。Version27で追加した`StudySession`（外部タイマーからの1セッション単位のログ）との関係整理（統合するか別Entityとして併存させるか）をOwnerに確認した上で配線する | 既存StudyLog Repository/UseCase/Routeが配線される、または廃止判断がされる。`StudySession`との二重管理境界が文書化される |
| 3 | Runner Control Plane（**Version29で実装済み**） | Version20のCollaboration RunnerとVersion26のCheck-in Runnerのlock/state/logを共通化し、版確認・kill switchを一元管理する | 単一インスタンス制御、状態記録、古いbuild検出、手動kill switchが動作する。自動再起動は別Versionで検討 |
| 4 | AgentEvent・未読管理・AgentTask最小実装 | Version17〜20のAgentMessage運用と100項目バックログの最優先事項を実装へ進める。指示・Feedback・承認待ちを処理状態付きで追跡する | 未読見落としと二重処理を防ぎ、Version・受入条件・commit・test結果をTaskへ紐付けられる |
| 5 | Calendar・Study Timer連携 | Version3から延期され、Version26でも次段階とされた予定・学習実績連携を実装する。外部データは最小権限・ローカル優先で取得する | 予定タスク未開始と学習タイマー状態を、根拠付きCheckIn/DistractionSignal候補として扱える |
| 6 | Screen Time安全インポート | Version26の調査結果を踏まえ、iOS直接取得を前提にせずShortcuts/CSV/手動共有の順で最小縦切りを作る | source/confidence/basisを保持し、YouTube/SNS利用を推測ではなく由来が明確な外部指標として取り込める |
| 7 | Intervention実運用・効果改善ループ | Version26で実装済みの介入・日次スコア・効果測定を、実データで1〜2週間検証する。Systemは決定的集計に留め、文面・閾値変更はProposalとして提示する | 通知疲れ、再開時間、完了率を比較し、変更前後の効果と比較不能を明示できる |
| 8 | Life Log訂正・削除・監査UI | Version25で訂正履歴は整備したが、削除UseCaseは安全上未実装。原記録を保護しつつOwnerが誤記を発見・訂正・削除要求できる入口を作る | 変更履歴、理由、承認レベル、復元可否が一画面または一APIで確認でき、不可逆削除はOwner承認を迂回できない |
| 9 | Cross-Entity Life Query・Dashboard | Version8 Timeline、Version11 Retrieval、Version25 Life Log、Version26 Behavior Scoreを読み取り専用で統合する | 学習・食事・体重・家計・行動介入の期間比較を、原データと推定を区別して表示できる |
| 10 | Backup・Migration・Data Portability | Principle 4と8に基づき、増えたJSON Repositoryの整合性検査、schema migration、暗号化バックアップ、復元演習を標準化する | 自動バックアップ、dry-run移行、チェックサム検証、復元テスト、全Entityのエクスポートが再現可能になる |

推奨するVersion分割は、Version28をCapability Registry、Version29を
Runner Control Plane、Version30をAgentEvent/AgentTaskとする
（Version27は完了済みのため、当初案から1つ繰り下げた）。その後は
実運用データの蓄積状況に応じて2（StudyLog配線）・5〜10を選ぶ。
外部公開・認証変更・秘密情報・不可逆削除・有料サービスを伴う段階
では、既存のLevel2境界に従いOwner確認前に停止する。

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
一連を確認した（指示書15章のローカル版）。「ChatGPT → Remote MCP」の
実接続確認は、公開HTTPS・ChatGPT Developer Modeでの実UI操作を要する
ため、Claude Codeでは実施できない——`docs/setup/
chatgpt-mcp-connection.md`の手順に従ってOwner自身が確認する。詳細は
`docs/reports/Version18_Report.md`参照。

**追記（2026-07-14、Owner実機接続確認）**：Owner自身がngrok経由で
ChatGPT Developer Modeから接続を試みたところ、簡易Bearer認証が
原因で常に401になり接続不可能なことが判明した（ChatGPTの「認証なし」
モードは`Authorization`ヘッダーを一切送らないため）。Owner確認の上、
`/mcp`エンドポイントの認証チェックを撤廃し（ADR 0044、ADR 0041を
一部訂正）、その後**ChatGPTから実際に`agent_message_list`の実行・
`proposal_create`→`proposal_approve`の承認フローが成功することを
確認した**。「ChatGPTが初めてProject ARCを直接利用する」という
Version18のキャッチコピーが、Version18のうちに実現した。

---

## Version19｜Continuous Collaboration

Version18完了・Owner実機接続確認を受け、ARC自身がRemote MCP経由で
初めてコピペを介さずProject ARCへ直接書き込みを行い、
ManagementFeedback（`257338da-...`）とVersion19の指示書に相当する
AgentMessage（`b0adb087-...`、`docs/handoff/ARC_INBOX.md`を経由しない
初めての事例）を保存した。指示書は「ManagementFeedbackを読み取って
分析し、指示書をAgentMessage Proposalとして生成・承認・保存できる
一連の運用を完成させる」ことを求めた。

**スコープの絞り込み（ADR 0045）**：指示書の「分析・生成」を
Project ARC（System）自身が行う機能と実装すると、`docs/
constitution.md`第2条（Systemは判断しない）・`docs/ai-roles.md`
（Systemの意思決定範囲は一切なし）に抵触する。「分析・生成」は
ARC自身が自分のセッションで行う（今回すでに実例あり）ものと解釈し、
Version19はその運用が機能するために欠けていたインフラ・記録・
ドキュメントの整備に限定した——新規Entity・UseCase・スキーマ
フィールドは追加していない。

- **`CLAUDE.md`のセッション開始チェック補完**：`agent_message_list`
  （`direction: "ToClaudeCode"`）の確認を追加——今回の指示書自体が
  `ARC_INBOX.md`を経由せず届いた実例を踏まえた対応。
- **`docs/handoff/README.md`更新**：ファイルベース経路（経路A）と
  ライブ経路（経路B、Remote MCP）が併存している現状を明記。
- **トレーサビリティ規約**（`docs/ai-roles.md`）：既存の
  `tags?: string[]`を再利用し、`mf:<ManagementFeedbackのid>`で
  AgentMessageとManagementFeedbackを紐付ける（スキーマ変更なし）。
- **クローズドループの実演**：今回作成されたManagementFeedbackの
  重複（`e002f51a-...`）をRejectedに整理し、本来の`257338da-...`は
  Owner確認を経てAccepted→Implementedへ遷移、完了報告は
  AgentMessage（`direction: "ToARC"`）でもProject ARCへ保存した
  （詳細は`docs/reports/Version19_Report.md`参照）。

---

## Version20｜Collaboration Runner + 常駐運用基盤

Version19完了後、ARCから「Collaboration Runnerと常駐運用基盤を最優先で
実装してください」という指示（AgentMessage `33274dc6-...`）が届いた。
PCを起動したまま放置しても、Project ARC上の未読AgentMessage・
ManagementFeedbackを監視し、承認不要の範囲でClaude Codeが対応を
進める仕組みと、`pnpm run api`/`pnpm run mcp:remote`/`ngrok http 3940`
のログオン時自動起動を求めた。

**スコープの絞り込み（ADR 0046）**：無人稼働のまま内容を「解釈」し
実装方針を決めることはConstitution第2条・ADR 0045の境界に抵触しかね
ない。着手前にOwnerへ確認（AskUserQuestion）し、「Runnerは監視・
下書き作成まで（実際のコード変更・commitはOwnerの`do`承認まで
実行しない）」との回答を得て、Runner v1を**機械的な新着検知・通知
のみ**に限定した。

- **Collaboration Runner**（`src/infrastructure/runner/
  collaborationRunner.ts`、`pnpm run runner`）：`agent_message_list`・
  `management_feedback_list`の新着を検知し、`data/runner-
  notifications/`へ機械的な一覧を書き出す。内容の解釈・実装方針の
  提案は一切しない。1回実行して終了するスクリプトとして実装し、
  繰り返し実行はWindowsタスクスケジューラに委ねる（独自の常駐
  ループ・重複防止ロジックは作り込まない、YAGNI）。
- **ログオン時自動起動**（`scripts/start-all.ps1`・`stop-all.ps1`）：
  Owner確認の上、ngrokを含む3サービスを自動起動する方針とした
  （ADR 0047）——Remote MCPは無認証設計（ADR 0044）のため、これは
  ほぼ常時の公開を意味する常時公開リスクの受け入れ。
- **実機で発覚した制約**：タスクスケジューラへの登録スクリプト
  （`scripts/register-scheduled-tasks.ps1`）を実行したところ、
  15分間隔のCollaboration Runnerタスクは登録できたが、ログオン
  トリガーの自動起動タスクは「Access is denied」で登録できなかった。
  当初はClaude Codeの実行環境固有の制約と判断したが、Owner自身が
  通常のPowerShellから実行しても同じエラーが再現し、**管理者権限で
  PowerShellを実行したところ登録に成功**——原因はこのマシン
  （Windows 11 Home）でログオントリガー登録に管理者権限が必要という
  Windows側の制約であり、当初の診断は誤りだったと判明した
  （`docs/adr/0047-boot-time-autostart.md`で訂正済み）。Owner自身が
  管理者権限で一度実行し、両タスクとも`State: Ready`まで実機確認
  済み（`docs/setup/collaboration-runner.md`参照）。
- **長期バックログの記録**：同日届いた100項目の長期バックログ
  （AgentMessage `8df72fe4-...`、A〜Jの10カテゴリ）は、「一括実装
  せず最小縦切りで進める」という指示書自身の方針に従い、全項目の
  評価はせず参照として記録するに留めた（原文は`docs/handoff/
  archive/Version20_ARC_Brief.md`に保管）。

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
- **Phase 2.5（最優先）Cloud Residency** — PCを起動していなくても
  Project ARCを利用可能にし、スマホのみでChatGPT・Project ARCを
  連携させる。無料サービス優先（Railway→Render順で検討）、
  API・Remote MCP・DBをクラウドへ移行、ChatGPTから直接接続。
  自動レビュー・自動同期をクラウド上で実行。完了条件：(1)PC不要、
  (2)スマホのみで読み書き可能、(3)22時レビューなどの自動処理が
  常時動作、(4)Claude Codeとの自律ループがクラウドで動作。
  既存のデータ永続性・セキュリティ・Owner最終決定の原則は維持。
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
