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

## クラウドSupabaseへの移行（ADR 0003）

ローカルでの動作確認ができたら、クラウドのSupabaseプロジェクトに
切り替える。ここはOwner本人のSupabaseアカウントが必要な手動作業で、
Claude Codeの側からは実行できない（アカウントを持っていないため）。
5つのステップに分けて説明する。

### Step 1. Supabase CLIでログインする

ターミナルで以下を実行すると、ブラウザが開いてSupabaseへの
ログイン画面が出る。普段Supabaseにログインするのと同じ操作でOK。

```bash
pnpm exec supabase login
```

### Step 2. クラウド上にプロジェクトを新規作成する

1. ブラウザで https://supabase.com/dashboard を開く
2. 「New project」からプロジェクトを1つ作成する（名前は任意、例：`project-arc`）
3. 作成が終わったら、プロジェクトのURLを見る。
   `https://supabase.com/dashboard/project/xxxxxxxxxxxx` の
   `xxxxxxxxxxxx`の部分が **project-ref**（次のStepで使う）

### Step 3. ローカルのリポジトリとクラウドプロジェクトを紐付ける

`<project-ref>`の部分をStep 2で控えた文字列に置き換えて実行する。

```bash
pnpm exec supabase link --project-ref <project-ref>
```

### Step 4. テーブルをクラウドDBに反映する

このリポジトリの`supabase/migrations/`に用意してあるテーブル定義
（reflections / study_logs / tasks、RLS込み）を、クラウド側のDBに
そのまま適用するコマンド。

```bash
pnpm exec supabase db push
```

### Step 5. Owner用のログインユーザーを1人作る

1. Supabaseダッシュボードで、対象プロジェクトを開く
2. 左メニューの **Authentication** → **Users** → **Add user** をクリック
3. メールアドレスとパスワードを決めて作成する（これがあなた自身の
   ログイン情報になる。サインアップ画面などは無いので、この画面から
   手動で1人だけ作る）

### Step 6. `.env` を書き換える

`.env`を開いて、以下の4つをクラウド側の値に書き換える。

| 変数名 | どこで見つかる値か |
|---|---|
| `SUPABASE_URL` | ダッシュボードの Project Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | 同じ画面の Project API keys → `anon` `public` |
| `SUPABASE_OWNER_EMAIL` | Step 5で作成したメールアドレス |
| `SUPABASE_OWNER_PASSWORD` | Step 5で作成したパスワード |

### 動作確認

```bash
pnpm reflect --db=supabase
```

いくつか質問に答えて「記録しました。」と表示されれば成功。RLSに
よってこの4つの認証情報が揃っていないと読み書きできない仕組みに
なっているので、途中でエラーが出た場合はまず`.env`の値を見直すこと。

## よく使うコマンド

```bash
pnpm test          # ユニットテスト
pnpm lint           # Lint
pnpm typecheck       # 型チェック
pnpm build           # ビルド
pnpm reflect         # 今日の振り返りをCLIで記録（InMemory実行、既定）
pnpm reflect --db=supabase   # Supabase接続で記録
pnpm reflect --db=notion     # Notion接続で記録（要NOTION_API_KEY / NOTION_DATABASE_ID、docs/architecture.md参照）

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
