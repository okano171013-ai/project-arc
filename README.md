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

## Version1のスコープ

- Clean Architecture（Domain / Application / Adapters / Infrastructure）
- 最小ユースケース：日々の振り返り（Reflection）の記録
- Supabase CLIによるローカルPostgres環境（クラウド接続はVersion2以降）
- テスト・Lint・CI（GitHub Actions）・Docker化

Version2以降（外部サービス連携、企業研究、家計管理等）は
`docs/roadmap.md`を参照してください。

## セットアップ

```bash
# 依存関係のインストール（Supabase CLIはdevDependency経由でpnpmから実行）
pnpm install

# ローカルSupabaseスタックの起動（要Docker）
pnpm db:start

# .env を作成し、上記コマンドの出力から
# SUPABASE_URL(=API URL) / SUPABASE_ANON_KEY を設定する
cp .env.example .env

# スキーマ適用（supabase/migrations/ 配下のマイグレーションを実行）
pnpm db:reset
```

スキーマ定義の正は `src/infrastructure/db/schema.sql`。変更する際は
`supabase/migrations/`にも同内容のマイグレーションを追加すること。

## よく使うコマンド

```bash
pnpm test          # ユニットテスト
pnpm lint           # Lint
pnpm typecheck       # 型チェック
pnpm build           # ビルド
pnpm reflect         # 今日の振り返りをCLIで記録（InMemory実行、既定）
pnpm reflect --db=supabase   # Supabase接続で記録

pnpm db:start        # ローカルSupabaseスタック起動（要Docker）
pnpm db:reset        # マイグレーション適用（supabase/migrations/を再適用）
pnpm db:stop         # ローカルSupabaseスタック停止
```

## ディレクトリ構成

```
src/
├── domain/          # Entity（外部依存なし）
├── application/      # ユースケース・Repositoryインターフェース
├── adapters/          # Repository実装（InMemory / Supabase）
├── infrastructure/    # CLI・DB・環境変数
└── shared/            # 共通エラー等
docs/                  # 思想・設計ドキュメント
```

各層の依存方向は内側（Domain）に向かってのみ許可される
（`docs/architecture.md`参照）。
