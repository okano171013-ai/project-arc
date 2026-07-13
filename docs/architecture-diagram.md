# Project ARC アーキテクチャ図

Version7完了時にOwnerから提案された、レイヤー構成・データの流れ・
ARCとの接続点を示す図（2026年7月、Version13時点の実装を反映。
Version9でBridge Layer・ThirdPersonEvaluation、Version10で
External Brain（ExternalSource/ExternalKnowledge）、Version11で
Knowledge Retrieval（RetrieveKnowledgeUseCase・Context Builder）、
Version12でDecision Support（DecisionEngineUseCase・
DecisionContext）、Version13でConversational Integration
（ConversationGatewayUseCase・ConversationContext）を追加）。
文章での説明は[`docs/architecture.md`](./architecture.md)を参照。

---

## 1. レイヤー構成（Clean Architecture）

```mermaid
graph TB
    subgraph Infrastructure["Infrastructure層"]
        CLI["CLI\nsrc/infrastructure/cli/*.ts\n(memory, appearance, skin,\npurchase, challenge, capture,\ntimeline, evaluation, bridge,\nexternal, reflect, morning, ...)"]
        HTTP["ARC Connector (HTTP API)\nsrc/infrastructure/http/server.ts\n127.0.0.1のみ・認証なし"]
    end

    subgraph Application["Application層"]
        UC["UseCases\n(Add*, Record*, List*, Get*, Suggest*, ...)"]
        Bridge["Bridge Layer\nImportLogsUseCase / ExportLogsUseCase\n(Version9, ADR 0010)"]
        Retrieval["Knowledge Retrieval\nRetrieveKnowledgeUseCase (QueryEngine) /\nbuildRetrievalContext (Context Builder)\n(Version11, ADR 0019-0021)"]
        Decision["Decision Support\nDecisionEngineUseCase (CandidateBuilder /\nEvidenceCollector / ComparisonBuilder)\n(Version12, ADR 0022-0025)"]
        Conversation["Conversational Integration\nConversationGatewayUseCase (IntentDetector /\nTool Selection) / buildConversationContextText\n(Version13, ADR 0026-0029)"]
        Serializers["serializers.ts\n(Entity→プレーンオブジェクト、CLI/HTTP共有)"]
        Ports["Ports (interfaces)\n*Repository, CaptureClassifier,\nCalendarProvider, TaskProvider, ..."]
    end

    subgraph Domain["Domain層（外部依存なし）"]
        Entities["Entities\nReflection, MemoryEntry, InventoryItem,\nAppearanceLog, SkinLog, PurchaseLog,\nChallengeLog, Capture, ThirdPersonEvaluation,\nExternalSource, ExternalKnowledge (Version10)"]
        VO["Value Objects\nTimelineEntry, CalendarEvent,\nDailyPlan, TaskItem,\nDecisionContext (Version12, ADR 0024),\nConversationContext (Version13, ADR 0027)"]
    end

    subgraph Adapters["Adapters層"]
        JsonRepo["JsonFile*Repository\n(data/*.json)"]
        SupaRepo["SupabaseReflectionRepository\n(任意、--db=supabase)"]
        Providers["GoogleCalendarProvider,\nRuleBasedCaptureClassifier, ..."]
    end

    CLI --> UC
    CLI --> Bridge
    CLI --> Retrieval
    CLI --> Decision
    CLI --> Conversation
    HTTP --> UC
    HTTP --> Bridge
    HTTP --> Retrieval
    HTTP --> Decision
    HTTP --> Conversation
    Bridge --> UC
    Bridge --> Serializers
    Retrieval --> Ports
    Retrieval --> Serializers
    Decision --> Retrieval
    Decision --> Ports
    Decision --> VO
    Decision --> Serializers
    Conversation --> Retrieval
    Conversation --> Decision
    Conversation --> VO
    Conversation --> Serializers
    UC --> Ports
    UC --> Entities
    Ports -.実装.-> JsonRepo
    Ports -.実装.-> SupaRepo
    Ports -.実装.-> Providers
    JsonRepo --> Entities
    UC --> VO
```

依存の方向は常に外側→内側（Infrastructure/Adapters → Application →
Domain）。DomainとApplicationは、CLIかHTTP APIか、JSONファイルか
Supabaseかを一切知らない（Principle 8: 長期保守性）。Bridge Layer
（Version9）はApplication層に置かれた薄いディスパッチャであり、
新しい書き込みロジックは持たず既存UseCaseへ委譲する（ADR 0010）。
Knowledge Retrieval（Version11）は既存のExternalKnowledge/
ExternalSourceRepositoryをそのまま使い、新しい永続化層は追加しない
（指示書①「Repositoryはそのまま」、ADR 0019）。Decision Support
（Version12）はRetrieveKnowledgeUseCaseをそのまま再利用し、新しい
検索ロジックは持たない——DecisionContextはRepositoryを持たない
Value Object（永続化しない一時生成物、ADR 0024）であり、Bridgeの
対象にも含めない（ADR 0025）。Conversational Integration
（Version13）のConversationGatewayUseCaseは、RetrieveKnowledgeUseCase
とDecisionEngineUseCaseの「どちらを呼ぶか」を選ぶだけで、両者の
内部ロジックには一切手を入れない（ADR 0026・0028）。CLI/HTTP APIの
どちらからもConversationGatewayUseCase 1つを経由する、という点で
ARC Connectorの唯一の入口として機能する。

---

## 2. データの流れ（Owner・ARC・Systemの責務境界）

```mermaid
sequenceDiagram
    participant Owner
    participant ARC as ARC (ChatGPT)
    participant Handoff as docs/handoff/<br/>(ファイルベースの橋渡し)
    participant CC as Claude Code
    participant Bridge as Bridge Layer<br/>(pnpm bridge / POST /bridge/import)
    participant UC as UseCase
    participant Data as data/*.json

    Note over Owner,ARC: 現状: ARC↔Claude Codeの直接API連携はない（Version9時点）

    Owner->>ARC: 会話（文脈理解・振り分け判断はARCの責務）
    ARC-->>Owner: 提案・記録すべき内容（{type, data}形式で複数件のことも）

    alt Ownerが手動でCLIを使う場合
        Owner->>CC: pnpm run <command> -- add（対話式CLI、1件ずつ）
        CC->>UC: UseCase.execute()
        UC->>Data: Repository経由で保存
    end

    alt OwnerがARCの提案をまとめて渡す場合（Version9、Bridge Layer）
        Owner->>Bridge: pnpm bridge -- import <ARCの回答をJSON化したファイル>
        Bridge->>UC: type毎に対応するUseCase.execute()へ委譲
        UC->>Data: Repository経由で保存（1件の失敗は他に影響しない）
    end

    alt 将来ARCが直接呼び出せるようになった場合
        ARC->>Bridge: POST /bridge/import（未接続、将来）
        Bridge->>UC: UseCase.execute()
        UC->>Data: Repository経由で保存
    end

    Owner->>Handoff: ARC_INBOX.mdに指示書を貼る
    CC->>Handoff: セッション開始時に確認
    CC->>Handoff: Version完了時にARC_Feedback.mdを更新
    Owner->>ARC: LATEST_ARC_FEEDBACK.mdの内容を貼る
```

**Systemは判断しない**（`docs/ai-roles.md`、ADR 0007/0008/0010/0012/
0021/0023/0028）：UseCase層・Bridge Layerはどのログに書くべきかを
判断せず、確定済みの入力を忠実に保存するだけ。External Brainの
confidence・重複検知も同様に、Systemは材料を示すだけでOwner/ARCが
最終判断する（ADR 0012）。Knowledge Retrieval（Version11）の
Context Builderも「【External Brain】」の引用ブロックまでしか生成
せず、そこから先の解釈・結論（「【ARC】」部分）はARCが会話の中で
行う（ADR 0021）。Decision Support（Version12）のDecisionEngineも、
選択肢の整理・根拠からのメリット/デメリット抽出までに留め、優先
順位付けや結論は生成しない（ADR 0023）。Conversational Integration
（Version13）のConversationGatewayも、Intent判定（どのツールを
呼ぶか）だけを行い、回答内容の生成は一切しない——Context Injection
も同じ3セクション構造（【Retrieved Knowledge】【Decision Context】
【Sources】）までに留める（ADR 0028）。判断・解釈は常にARCまたは
Ownerの側で行われる。

---

## 3. Logの境界（どの記録がどこへ行くか）

```mermaid
graph LR
    subgraph "瞬間の出来事（Timelineの対象、ADR 0009・0017）"
        Reflection["Reflection\n(その日の振り返り、1日1件)"]
        AppearanceLog["AppearanceLog\n(Owner自身による月次の総合的な外見)"]
        SkinLog["SkinLog\n(肌の構造化記録、頻繁)"]
        PurchaseLog["PurchaseLog\n(消耗品の購入〜使い切り)"]
        ChallengeLog["ChallengeLog\n(人生初挑戦)"]
        ThirdPersonEval["ThirdPersonEvaluation\n(他者からの評価、Version9/ADR 0011)"]
        Capture["Capture\n(Smart Captureの監査記録)"]
        ExternalKnowledge["ExternalKnowledge\n(外部情報から得た知識、Version10/ADR 0013・0017\ncapturedAtのみTimelineに乗る、contentは含めない)"]
    end

    subgraph "継続的な状態（Timeline対象外）"
        Memory["MemoryEntry\n(時間に紐づかない知識、ADR 0005)"]
        Inventory["InventoryItem\n(耐久品の状態管理、ADR 0006)"]
        ExternalSource["ExternalSource\n(出典の書誌情報、Version10/ADR 0013・0017)"]
    end

    Capture -.確定済みdestinations経由で書き込み.-> SkinLog
    Capture -.確定済みdestinations経由で書き込み.-> PurchaseLog
    Capture -.確定済みdestinations経由で書き込み.-> ChallengeLog
    Capture -.確定済みdestinations経由で書き込み.-> AppearanceLog
    Capture -.確定済みdestinations経由で書き込み.-> ThirdPersonEval
    ExternalKnowledge -.sourceId（任意）で参照.-> ExternalSource
```

`pnpm find`（横断検索、ADR 0005）はMemoryとInventoryのみを対象とする。
`pnpm external -- search`（ADR 0014）はExternalKnowledge/
ExternalSourceのみを対象とする独立した検索。`pnpm timeline`
（ADR 0009・0017）は上段の8つを対象とする（ExternalSource自体は
含めない）。`pnpm bridge`（Import/Export、ADR 0010・0015・0016）は
Captureを除く10種別（上段7つ + Memory + Inventory + ExternalSource）
を対象とする——目的ごとに対象範囲が異なる複数の横断機能が併存している。

---

## 4. ARCとの接続点（現状と将来）

| 接続点 | 現状（2026年7月、Version13時点） | 将来 |
|---|---|---|
| 指示の受け渡し | `docs/handoff/ARC_INBOX.md`にOwnerが手動で貼り付け（テキスト・PDF両対応） | 変更なし（人間による意思決定の窓口として維持、Principle 1） |
| フィードバックの受け渡し | `docs/reports/VersionN_ARC_Feedback.md`をOwnerが手動でコピー | 変更なし |
| データの一括受け渡し | `pnpm bridge -- import`でOwnerがARCの提案をJSONファイル経由で一括登録（ExternalSource/ExternalKnowledge含む）。`GET /bridge/export`で全データをJSON取得可能 | ARCが直接`POST /bridge/import`を呼べるようになる可能性（認証の実装が前提、ADR 0008/0010） |
| 知識の取得 | `POST /knowledge/retrieve`でquery/tags/topicsを渡すと、スコア順のKnowledge/Sourcesと引用ブロック（context）が返る（Version11、Owner経由で手動呼び出し） | ARCが直接`POST /knowledge/retrieve`を呼び、会話に必要な知識だけをその場で取得できるようになる可能性（認証実装が前提） |
| 意思決定支援 | `POST /decision/support`でquestionを渡すと、選択肢・比較・根拠を整理したDecisionContextが返る（Version12、Owner経由で手動呼び出し）。ARCの解釈・優先順位提案はDecisionContextを受け取ったARC自身が会話の中で書く | ARCが直接`POST /decision/support`を呼び、DecisionContextを踏まえた比較・提案をその場で会話に組み込めるようになる可能性（認証実装が前提） |
| 会話への統合 | `POST /conversation/context`でquestionを渡すと、Intent判定に応じてRetrieve/Decisionへ自動的に振り分けられたConversationContextが返る（Version13、Owner経由で手動呼び出し）。Ownerが結果をコピペしてARCへ渡す運用は変わらない | ARCが直接`POST /conversation/context`を呼べば、Intent判定からツール呼び出しまでを1リクエストで済ませられる（認証実装が前提、Version13時点でARC Connector自体の認証方式は変更なし） |
| 個別の読み書き | ARCから直接は不可能。ARC ConnectorはOwnerがCLIまたは`curl`/`fetch`で手動操作する前提（`/external-sources`・`/external-knowledge`含む） | ChatGPT Actions・MCP等でARCが直接`POST /skin`等を呼べるようになる可能性 |
| 判断・分類 | 常にARCまたはOwner（Systemは判断しない、ADR 0007/0008/0010/0012/0021/0023/0028） | 変わらない（Project ARCの根幹原則、`docs/ai-roles.md`） |
