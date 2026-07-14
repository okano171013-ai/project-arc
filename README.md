# Project ARC

AIを用いた個人用ライフマネジメントシステム。「第二の脳」「人生OS」を
目指すプロジェクト。単なるログ収集ツールではなく、**日々の意思決定を
改善すること**を目的とする（`docs/vision.md`参照）。

## 思想ドキュメント

コードを読む前に、まず以下を読むことを推奨します。

- [`docs/constitution.md`](./docs/constitution.md) — ARC
  Constitution（最も基礎的な7条文、2026年7月Owner承認）
- [`docs/vision.md`](./docs/vision.md) — Core Mission / Vision
- [`docs/principles.md`](./docs/principles.md) — 意思決定の基本原則
- [`docs/ai-roles.md`](./docs/ai-roles.md) — 人間・ARC・Gemini・Claude Code・
  システム自体の責務分担
- [`docs/architecture.md`](./docs/architecture.md) — 技術設計
- [`docs/roadmap.md`](./docs/roadmap.md) — Version1〜14のロードマップ・
  長期ロードマップ2.0
- [`docs/dod.md`](./docs/dod.md) — Definition of Done（完成の定義）
- [`docs/adr/`](./docs/adr) — 個別の設計判断とその根拠
- [`docs/HISTORY.md`](./docs/HISTORY.md) — Version1〜9の全履歴まとめ

## Version14のスコープ（現在地）

テーマ：「ARC Integration」— 「ARCがProject ARCを安全に読み、Ownerの
承認のもとで書き込めるようにする。」ARCへ直接の書き込み権限を
与えず、`ARC → Write Proposal → Owner承認 → Project ARC`という
Write Proposal Layerを挟むことで、Constitution第2条（Systemは
判断しない）・第4条（Ownerが最終決定する）を保ったまま読み書きの
入口を整備する（長期ロードマップ2.0 Phase 2の続き）。アーキテクチャ
全体像は
[`docs/architecture-diagram.md`](./docs/architecture-diagram.md)を参照。

- **Read Layer**（`ReadGatewayUseCase`、`GET /read/reflection`
  `/read/timeline` `/read/external` `/read/decision`）— ARCが会話の
  中で必要最小限のデータだけを取得できる読み取り専用の入口。`limit`
  を必須とし、既存のGetTimeline/RetrieveKnowledge/
  DecisionEngineUseCaseへ委譲するのみ（新しい判断ロジックは持たない、
  ADR 0030）
- **Write Proposal Layer**（`WriteProposalGatewayUseCase`、`pnpm
  propose`、`POST /proposal/create` `/proposal/approve`
  `/proposal/reject`）— ARCは`createProposal`でProposalを組み立てる
  だけで、Systemはこれを一切保存しない。Ownerが内容を確認し、同じ
  Proposalを`approveProposal`へ再送して初めて対応する既存UseCase
  経由で書き込まれる。`rejectProposal`は何も永続化しない
  （ADR 0031）。対応するProposal種別：Reflection/Memory/
  ExternalKnowledge/Appearance/ManagementFeedback
- **ManagementFeedback**（`pnpm propose list-feedback`・
  `pnpm propose resolve`）— ARC視点のProject ARC運用改善提案を表す
  新Entity。Reflection（Owner視点）とは別Entityとし（ADR 0032）、
  `resolution`（Open→Accepted→Implemented→Closed、または
  Rejected）という状態機械を持つ。Timelineには含めない（ADR 0033）
- **Conversational Integration**（`pnpm conversation`、`POST
  /conversation/context`）— 質問文をIntent（Retrieval/Decision/
  None）へ機械的パターン一致で分類し（ADR 0029）、対応するツール
  （`RetrieveKnowledgeUseCase`または`DecisionEngineUseCase`）を
  呼び出して`ConversationContext`を生成する。回答内容の生成・優先
  順位の提案は行わない——【Retrieved Knowledge】【Decision
  Context】【Sources】の3セクションまでで、「【ARC】」に相当する
  解釈・結論はARC自身が書く（ADR 0028）。会話自体は保存しない
  （ADR 0027）
- **Decision Support**（`pnpm decision`、`POST /decision/support`）—
  質問文から選択肢（candidates、優先順位なし）を機械的パターン一致
  で導き（ADR 0022）、各候補についてExternal Brainの根拠・メリット・
  デメリット・不足情報を整理した`DecisionContext`を生成する
  （Value Object、ADR 0024）。Systemは決定せず、比較材料の整理までに
  留める——メリット/デメリットは根拠テキストからのキーワード抽出
  であり、新しい評価文の生成ではない（ADR 0023）
- **Knowledge Retrieval**（`pnpm external -- retrieve`、`POST
  /knowledge/retrieve`）— query/tags/topicsを渡すと、ExternalKnowledge
  /ExternalSourceをタイトル・タグ・トピック一致による機械的スコア順に
  取得（Embedding・AIによる関連度判定はなし、ADR 0020）。結果は
  「【External Brain】」引用ブロック（Context Builder出力）としても
  受け取れる。ARC自身の推論・結論部分はSystemが生成しない（ADR 0021）
- **External Brain**（`pnpm external`）— 出典（`ExternalSource`：
  Web/書籍/論文/動画等の書誌情報）と知識（`ExternalKnowledge`：
  そこから得た内容、原文とOwnerの解釈を分離）を分けて保存
  （ADR 0013）。confidence・重複検知はOwnerが判断する材料を示す
  だけで、Systemは自動判定・自動統合しない（ADR 0012）
- **Bridge Layer**（`pnpm bridge -- import/export`、`POST
  /bridge/import`、`GET /bridge/export`）— `{type, data}`形式のJSONで
  Reflection/Memory/InventoryItem/AppearanceLog/SkinLog/PurchaseLog/
  ChallengeLog/ThirdPersonEvaluation/ExternalSource/ExternalKnowledge
  を一括登録・一括出力。既存のUseCaseへ委譲するだけの薄い
  ディスパッチャで、1件の失敗が他に影響しない（ADR 0010・0016）
- **Third Person Evaluation**（`pnpm evaluation`、`POST
  /evaluation`）— 他者からの評価・コメント（「いとこにガタイ良く
  なったと言われた」等）を構造化して記録。Appearance Log（Owner
  自身の評価）とは別Entity（ADR 0011）
- **Timeline**（`pnpm timeline`、`GET /timeline`）— Reflection/
  AppearanceLog/SkinLog/PurchaseLog/ChallengeLog/Capture/
  ThirdPersonEvaluation/ExternalKnowledgeの8Logを横断して日付降順で
  一覧表示。`--since=` `--source=` `--limit=`で絞り込み可能。
  Memory/Life Inventory/ExternalSourceは対象外（ADR 0009・0017）
- **ARC Connector**（`pnpm api`）— Application層をHTTP経由で呼び出せる
  API。`POST /reflection` `/skin` `/purchase` `/purchase/:id/start`
  `/purchase/:id/finish` `/appearance` `/evaluation` `/capture/suggest`
  `/capture` `/bridge/import` `/external-sources` `/external-knowledge`
  `/knowledge/retrieve` `/decision/support` `/conversation/context`
  `/proposal/create` `/proposal/approve` `/proposal/reject`、
  `GET /health` `/timeline` `/bridge/export` `/external-sources`
  `/external-knowledge` `/external-knowledge/search` `/read/reflection`
  `/read/timeline` `/read/external` `/read/decision`、`PATCH`/`DELETE`
  も`/external-sources/:id` `/external-knowledge/:id`に対応。新規
  外部依存なし（Node標準の`http`のみ）。ローカル専用（`127.0.0.1`
  のみ）・認証は未実装（将来リモート接続が必要になった時点で追加、
  ADR 0008参照）
- **Smart Capture**（`pnpm capture`）— 文章・写真を入力すると、
  キーワード一致による下書き提案（例：「肌」→Skin Log、「買った」→
  Purchase Log、「言われた」→Third Person Evaluation）を表示。Owner
  が確認・確定した分だけ対応するLogへ書き込む。書き込み履歴はCapture
  Logとして`list`で確認できる
- **ARC Memory**（`pnpm memory`）— 持ち物・目標・好み・学歴・
  キャリア・健康・お金・人間関係等、長期間保持する知識を
  追加・一覧・更新・削除。Reflection（その日の記録）とは
  意図的に分離（ADR 0005）
- **Appearance Log**（`pnpm appearance`）— 月次の外見記録（総合評価・
  肌・髪・髭・服装・体型・コメント・改善提案）。写真はファイル管理
  のみ（画像解析はしない）
- **Skin Log**（`pnpm skin`）— 肌の状態（赤み・毛穴・ニキビ・ニキビ跡・
  皮脂を1〜5で評価）を頻繁に記録・比較。Appearance Logとは別の
  Entity（ADR 0006）
- **Purchase Log**（`pnpm purchase`）— 消耗品（化粧水・洗顔料・
  カミソリ替刃等）の「購入→使い始め→使い切り」を管理。Life
  Inventoryとは別のEntity（ADR 0006）
- **Challenge Log**（`pnpm challenge`）— 人生で初めて挑戦したこと
  （初めて食べたもの・体験）を記録
- **Life Inventory写真紐付け**（`pnpm inventory -- photo`）— 持ち物に
  写真を紐付け（`show`で確認可能）
- **横断検索**（`pnpm find <キーワード>`）— MemoryとLife Inventoryを
  横断検索。「あれ何使ってた？」にすぐ答えることが目的（Reflection・
  Appearance Log・External Brainは検索対象外。External Brainの検索は
  `pnpm external -- search`が別に持つ、ADR 0005・0014参照）
- 永続化はローカルJSONファイル（`data/`配下、Git管理外）— ADR 0003参照

Gemini/OpenAI連携、実際の画像解析・OCR、Decision Engine、通知機能は
将来のVersionに延期しています（`docs/roadmap.md`参照）。

## セットアップ

```bash
pnpm install
```

Version13はローカルJSONファイル + ローカルファイルコピーのみで動作する
ため、追加のセットアップは不要です。Google Calendar/Tasks連携
（Version3から継続）を使う場合は以下を参照してください。

→ [`docs/setup/google-api-setup.md`](./docs/setup/google-api-setup.md)

Supabase CLIを使う場合（`--db=supabase`、任意）は以下が必要です。

```bash
supabase start
cp .env.example .env   # SUPABASE_URL / SUPABASE_ANON_KEY を設定
supabase db reset
```

## よく使うコマンド

`test`・`typecheck`等は問題ありませんが、`morning`/`reflect`/`inventory`/
`memory`/`appearance`/`skin`/`purchase`/`challenge`/`capture`/
`timeline`/`evaluation`/`bridge`/`external`/`decision`/`conversation`/`find`のような独自コマンドは、pnpm組み込みの
コマンド名と偶然一致すると意図せず別の動作をしてしまうことが実機で
判明しました（`search`→`find`への変更後も再発）。**確実に動かすため、
すべて`pnpm run`を付けて実行してください。**

```bash
pnpm test                  # ユニットテスト
pnpm lint                   # Lint
pnpm typecheck               # 型チェック
pnpm build                    # ビルド

pnpm run morning                # 朝：Morning Brief（Google連携 or ダミー）
pnpm run reflect                 # 夜：Evening Reflection（記録 + スコア + 前日比較）
pnpm run reflect --db=supabase    # Supabase接続で記録（要セットアップ）

pnpm run inventory -- add          # 持ち物を追加
pnpm run inventory -- list         # 持ち物を一覧表示
pnpm run inventory -- update       # 持ち物の基本情報を更新
pnpm run inventory -- maintain     # メンテナンス履歴を1件追加
pnpm run inventory -- show         # 持ち物の詳細（履歴・写真含む）を表示
pnpm run inventory -- photo        # 持ち物に写真を紐付け

pnpm run memory -- add             # Memoryを追加
pnpm run memory -- list            # Memoryを一覧表示
pnpm run memory -- list --category=Assets  # カテゴリで絞り込み
pnpm run memory -- update          # Memoryを更新
pnpm run memory -- delete          # Memoryを削除

pnpm run appearance -- add         # Appearance Logを追加（月次、写真ファイル管理含む）
pnpm run appearance -- list        # Appearance Logを一覧表示

pnpm run skin -- add               # Skin Logを追加（赤み/毛穴/ニキビ/ニキビ跡/皮脂、写真含む）
pnpm run skin -- list              # Skin Logを一覧表示
pnpm run skin -- compare           # 直近2件の写真パスを提示（画像解析はしない）

pnpm run purchase -- add           # 消耗品の購入を記録
pnpm run purchase -- start         # 使い始めを記録
pnpm run purchase -- finish        # 使い切りを記録
pnpm run purchase -- list          # ステータス別（未使用/使用中/使い切り）に一覧表示

pnpm run challenge -- add          # Challenge Logを追加（初めて挑戦したこと）
pnpm run challenge -- list         # Challenge Logを一覧表示

pnpm run capture -- add            # Smart Capture：文章・写真から下書き提案 → 確認 → 記録
pnpm run capture -- list           # Capture Logの実行履歴を一覧表示

pnpm run evaluation -- add         # Third Person Evaluationを追加（他者からの評価）
pnpm run evaluation -- list        # Third Person Evaluationを一覧表示

pnpm run find <キーワード>          # MemoryとInventoryを横断検索

pnpm run timeline                  # 各Logを横断した時系列一覧
pnpm run timeline --since=2026-07-01  # 日付で絞り込み
pnpm run timeline --source=SkinLog    # ソースで絞り込み

pnpm run bridge -- import <ファイル>  # {logs:[{type,data}, ...]}形式のJSONを一括登録
pnpm run bridge -- export             # 全Logをまとめてエクスポート
pnpm run bridge -- export --type=SkinLog  # typeを指定してエクスポート

pnpm run external -- add           # External Brainに知識を追加（出典の入力込み）
pnpm run external -- list          # 知識を一覧表示
pnpm run external -- list --status=inbox  # ステータスで絞り込み
pnpm run external -- show <id>     # 知識の詳細（出典情報込み）を表示
pnpm run external -- update <id>   # 知識を更新
pnpm run external -- delete <id>   # 知識を削除
pnpm run external -- search <キーワード>  # 知識と出典を横断検索（人間向け一覧）
pnpm run external -- retrieve <キーワード>  # ARCへ渡す想定のスコア順取得（Knowledge Retrieval、Version11）
pnpm run external -- retrieve --tags=司法試験,行政法  # タグで絞り込み
pnpm run external -- review <id>   # ステータスをreviewedに変更
pnpm run external -- archive <id>  # ステータスをarchivedに変更

pnpm run decision -- "<質問>"       # 質問から選択肢・比較材料（DecisionContext）を生成（Version12）
pnpm run decision                  # 引数なしなら対話式に質問を聞く

pnpm run conversation -- "<質問>"   # 質問のIntentを判定し、Retrieve/DecisionへルーティングしてConversationContextを生成（Version13）
pnpm run conversation              # 引数なしなら対話式に質問を聞く

pnpm run propose                   # 対話式にProposalを作成→表示→Approve確認（Version14、Write Proposal Layer）
pnpm run propose list-feedback     # ManagementFeedbackの一覧を表示
pnpm run propose resolve <id> <Accepted|Implemented|Closed|Rejected>  # resolutionを遷移

pnpm run api                       # ARC Connector（HTTP API）を起動（既定ポート3939）
```

`pnpm run api`起動後の動作確認例（`curl`はGit Bash上で日本語を含む
リクエストを送ると文字化けすることがあるため、日本語を含む検証には
Node標準の`fetch`を使うことを推奨します）。

```bash
curl http://127.0.0.1:3939/health
curl -X POST http://127.0.0.1:3939/skin \
  -H "Content-Type: application/json" \
  -d '{"record":{"date":"2026-07-13","redness":2}}'
```

## ディレクトリ構成

```
src/
├── domain/          # Entity・value object（外部依存なし）
├── application/      # ユースケース・ポート（Repository/Providerインターフェース）
├── adapters/          # 実装（JSONファイル / Supabase / Google API / ダミーProvider）
├── infrastructure/    # CLI・HTTP API（ARC Connector）・DB・環境変数・Google認証・
│                       トークン暗号化・写真ファイル管理
└── shared/            # 共通エラー・日付ユーティリティ等
docs/                  # 思想・設計ドキュメント・セットアップ手順・報告書
docs/handoff/          # ARC⇄Claude Codeの引き継ぎ（受信箱・送信箱）
data/                  # ローカルの記録・写真（Git管理外、実行すると自動生成）
```

各層の依存方向は内側（Domain）に向かってのみ許可される
（`docs/architecture.md`参照）。
