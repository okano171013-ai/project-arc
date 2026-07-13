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
- [`docs/roadmap.md`](./docs/roadmap.md) — Version1〜9のロードマップ・
  長期ロードマップ2.0
- [`docs/dod.md`](./docs/dod.md) — Definition of Done（完成の定義）
- [`docs/adr/`](./docs/adr) — 個別の設計判断とその根拠
- [`docs/HISTORY.md`](./docs/HISTORY.md) — Version1〜9の全履歴まとめ

## Version9のスコープ（現在地）

テーマ：「ARC Bridge」— ARCとProject ARCの最初の接続点を作る
（ADR 0010）。完全自動ではなく、Ownerが「ARCの提案をProject ARCへ
簡単に渡せる状態」を目指す。アーキテクチャ全体像は
[`docs/architecture-diagram.md`](./docs/architecture-diagram.md)を参照。

- **Bridge Layer**（`pnpm bridge -- import/export`、`POST
  /bridge/import`、`GET /bridge/export`）— `{type, data}`形式のJSONで
  Reflection/Memory/InventoryItem/AppearanceLog/SkinLog/PurchaseLog/
  ChallengeLog/ThirdPersonEvaluationを一括登録・一括出力。既存の
  UseCaseへ委譲するだけの薄いディスパッチャで、1件の失敗が他に
  影響しない（ADR 0010）
- **Third Person Evaluation**（`pnpm evaluation`、`POST
  /evaluation`）— 他者からの評価・コメント（「いとこにガタイ良く
  なったと言われた」等）を構造化して記録。Appearance Log（Owner
  自身の評価）とは別Entity（ADR 0011）
- **Timeline**（`pnpm timeline`、`GET /timeline`）— Reflection/
  AppearanceLog/SkinLog/PurchaseLog/ChallengeLog/Capture/
  ThirdPersonEvaluationの7Logを横断して日付降順で一覧表示。
  `--since=` `--source=` `--limit=`で絞り込み可能。Memory/Life
  Inventoryは対象外（ADR 0009）
- **ARC Connector**（`pnpm api`）— Application層をHTTP経由で呼び出せる
  API。`POST /reflection` `/skin` `/purchase` `/purchase/:id/start`
  `/purchase/:id/finish` `/appearance` `/evaluation` `/capture/suggest`
  `/capture` `/bridge/import`、`GET /health` `/timeline`
  `/bridge/export`。新規外部依存なし（Node標準の`http`のみ）。
  ローカル専用（`127.0.0.1`のみ）・認証は未実装（将来リモート接続が
  必要になった時点で追加、ADR 0008参照）
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
  Appearance Logは検索対象外、ADR 0005参照）
- 永続化はローカルJSONファイル（`data/`配下、Git管理外）— ADR 0003参照

Gemini/OpenAI連携、実際の画像解析・OCR、Decision Engine、通知機能は
将来のVersionに延期しています（`docs/roadmap.md`参照）。

## セットアップ

```bash
pnpm install
```

Version9はローカルJSONファイル + ローカルファイルコピーのみで動作する
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
`timeline`/`evaluation`/`bridge`/`find`のような独自コマンドは、pnpm組み込みの
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
