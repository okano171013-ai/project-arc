# Project ARC

AIを用いた個人用ライフマネジメントシステム。「第二の脳」「人生OS」を
目指すプロジェクト。単なるログ収集ツールではなく、**日々の意思決定を
改善すること**を目的とする（`docs/vision.md`参照）。

## 思想ドキュメント

コードを読む前に、まず以下を読むことを推奨します。

- [`docs/vision.md`](./docs/vision.md) — Core Mission / Vision
- [`docs/principles.md`](./docs/principles.md) — 意思決定の基本原則
- [`docs/ai-roles.md`](./docs/ai-roles.md) — 人間・ARC・Gemini・Claude Code・
  システム自体の責務分担
- [`docs/architecture.md`](./docs/architecture.md) — 技術設計
- [`docs/roadmap.md`](./docs/roadmap.md) — Version1〜9のロードマップ
- [`docs/dod.md`](./docs/dod.md) — Definition of Done（完成の定義）
- [`docs/adr/`](./docs/adr) — 個別の設計判断とその根拠

## Version4のスコープ（現在地）

テーマ：「Memory」— 生活と繋がるシステムから、人生を記憶する
システムへ。

- **ARC Memory**（`pnpm memory`）— 持ち物・目標・好み・学歴・
  キャリア・健康・お金・人間関係等、長期間保持する知識を
  追加・一覧・更新・削除。Reflection（その日の記録）とは
  意図的に分離（ADR 0005）
- **Appearance Log**（`pnpm appearance`）— 月次の外見記録（総合評価・
  肌・髪・髭・服装・体型・コメント・改善提案）。写真はファイル管理
  のみ（画像解析はしない）
- **Life Inventory写真紐付け**（`pnpm inventory -- photo`）— 持ち物に
  写真を紐付け（`show`で確認可能）
- **横断検索**（`pnpm find <キーワード>`）— MemoryとLife Inventoryを
  横断検索。「あれ何使ってた？」にすぐ答えることが目的（Reflection・
  Appearance Logは検索対象外、ADR 0005参照）
- 永続化はローカルJSONファイル（`data/`配下、Git管理外）— ADR 0003参照

Gemini/OpenAI連携、Decision Engine、通知機能、画像解析AIはVersion5
以降に延期しています（`docs/roadmap.md`参照）。

## セットアップ

```bash
pnpm install
```

Version4はローカルJSONファイル + ローカルファイルコピーのみで動作する
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
`memory`/`appearance`/`find`のような独自コマンドは、pnpm組み込みの
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

pnpm run find <キーワード>          # MemoryとInventoryを横断検索
```

## ディレクトリ構成

```
src/
├── domain/          # Entity・value object（外部依存なし）
├── application/      # ユースケース・ポート（Repository/Providerインターフェース）
├── adapters/          # 実装（JSONファイル / Supabase / Google API / ダミーProvider）
├── infrastructure/    # CLI・DB・環境変数・Google認証・トークン暗号化・写真ファイル管理
└── shared/            # 共通エラー・日付ユーティリティ等
docs/                  # 思想・設計ドキュメント・セットアップ手順・報告書
data/                  # ローカルの記録・写真（Git管理外、実行すると自動生成）
```

各層の依存方向は内側（Domain）に向かってのみ許可される
（`docs/architecture.md`参照）。
