# Project ARC アーキテクチャ図

Version7完了時にOwnerから提案された、レイヤー構成・データの流れ・
ARCとの接続点を示す図（2026年7月、Version8時点の実装を反映）。
文章での説明は[`docs/architecture.md`](./architecture.md)を参照。

---

## 1. レイヤー構成（Clean Architecture）

```mermaid
graph TB
    subgraph Infrastructure["Infrastructure層"]
        CLI["CLI\nsrc/infrastructure/cli/*.ts\n(memory, appearance, skin,\npurchase, challenge, capture,\ntimeline, reflect, morning, ...)"]
        HTTP["ARC Connector (HTTP API)\nsrc/infrastructure/http/server.ts\n127.0.0.1のみ・認証なし"]
    end

    subgraph Application["Application層"]
        UC["UseCases\n(Add*, Record*, List*, Get*, Suggest*, ...)"]
        Ports["Ports (interfaces)\n*Repository, CaptureClassifier,\nCalendarProvider, TaskProvider, ..."]
    end

    subgraph Domain["Domain層（外部依存なし）"]
        Entities["Entities\nReflection, MemoryEntry, InventoryItem,\nAppearanceLog, SkinLog, PurchaseLog,\nChallengeLog, Capture"]
        VO["Value Objects\nTimelineEntry, CalendarEvent,\nDailyPlan, TaskItem"]
    end

    subgraph Adapters["Adapters層"]
        JsonRepo["JsonFile*Repository\n(data/*.json)"]
        SupaRepo["SupabaseReflectionRepository\n(任意、--db=supabase)"]
        Providers["GoogleCalendarProvider,\nRuleBasedCaptureClassifier, ..."]
    end

    CLI --> UC
    HTTP --> UC
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
Supabaseかを一切知らない（Principle 8: 長期保守性）。

---

## 2. データの流れ（Owner・ARC・Systemの責務境界）

```mermaid
sequenceDiagram
    participant Owner
    participant ARC as ARC (ChatGPT)
    participant Handoff as docs/handoff/<br/>(ファイルベースの橋渡し)
    participant CC as Claude Code
    participant API as ARC Connector<br/>(HTTP API)
    participant UC as UseCase
    participant Data as data/*.json

    Note over Owner,ARC: 現状: ARC↔Claude Codeの直接API連携はない

    Owner->>ARC: 会話（文脈理解・振り分け判断はARCの責務）
    ARC-->>Owner: 提案・記録すべき内容

    alt Ownerが手動でCLIを使う場合
        Owner->>CC: pnpm run <command> -- add（対話式CLI）
        CC->>UC: UseCase.execute()
        UC->>Data: Repository経由で保存
    end

    alt 将来ARCが直接呼び出せるようになった場合
        ARC->>API: POST /skin, /capture, ...（未接続、将来）
        API->>UC: UseCase.execute()
        UC->>Data: Repository経由で保存
    end

    Owner->>Handoff: ARC_INBOX.mdに指示書を貼る
    CC->>Handoff: セッション開始時に確認
    CC->>Handoff: Version完了時にARC_Feedback.mdを更新
    Owner->>ARC: LATEST_ARC_FEEDBACK.mdの内容を貼る
```

**Systemは判断しない**（`docs/ai-roles.md`、ADR 0007/0008）：
UseCase層はどのLogに書くべきかを判断せず、確定済みの入力を忠実に
保存するだけ。判断・解釈は常にARCまたはOwnerの側で行われる。

---

## 3. Logの境界（どの記録がどこへ行くか）

```mermaid
graph LR
    subgraph "瞬間の出来事（Timelineの対象、ADR 0009）"
        Reflection["Reflection\n(その日の振り返り、1日1件)"]
        AppearanceLog["AppearanceLog\n(月次の総合的な外見)"]
        SkinLog["SkinLog\n(肌の構造化記録、頻繁)"]
        PurchaseLog["PurchaseLog\n(消耗品の購入〜使い切り)"]
        ChallengeLog["ChallengeLog\n(人生初挑戦)"]
        Capture["Capture\n(Smart Captureの監査記録)"]
    end

    subgraph "継続的な状態（Timeline対象外）"
        Memory["MemoryEntry\n(時間に紐づかない知識、ADR 0005)"]
        Inventory["InventoryItem\n(耐久品の状態管理、ADR 0006)"]
    end

    Capture -.確定済みdestinations経由で書き込み.-> SkinLog
    Capture -.確定済みdestinations経由で書き込み.-> PurchaseLog
    Capture -.確定済みdestinations経由で書き込み.-> ChallengeLog
    Capture -.確定済みdestinations経由で書き込み.-> AppearanceLog
```

`pnpm find`（横断検索、ADR 0005）はMemoryとInventoryのみを対象と
し、`pnpm timeline`（ADR 0009）は上段の6つのみを対象とする。目的が
異なる別々の機能として併存させている。

---

## 4. ARCとの接続点（現状と将来）

| 接続点 | 現状（2026年7月） | 将来 |
|---|---|---|
| 指示の受け渡し | `docs/handoff/ARC_INBOX.md`にOwnerが手動で貼り付け | 変更なし（人間による意思決定の窓口として維持、Principle 1） |
| フィードバックの受け渡し | `docs/reports/VersionN_ARC_Feedback.md`をOwnerが手動でコピー | 変更なし |
| データの読み書き | ARCから直接は不可能。ARC ConnectorはOwnerがCLIまたは`curl`/`fetch`で手動操作する前提 | ChatGPT Actions・MCP等でARCが直接`POST /skin`等を呼べるようになる可能性（認証の実装が前提、ADR 0008） |
| 判断・分類 | 常にARCまたはOwner（Systemは判断しない、ADR 0007/0008） | 変わらない（Project ARCの根幹原則、`docs/ai-roles.md`） |
