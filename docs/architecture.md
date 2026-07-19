# Architecture

本ドキュメントは技術的な設計判断を記述する。「なぜこの構造か」の
根拠はPrinciples（`principles.md`）と各ADR（`adr/`）に紐づく。

---

## 全体構成：Clean Architecture（4層）

```
Domain（最内層）
  ↑ 依存
Application（ユースケース）
  ↑ 依存
Interface Adapters（Repository実装・Presenter）
  ↑ 依存
Infrastructure（DB, CLI, GitHub Actions, 将来のWeb）
```

- **Domain**: `Task`, `StudyLog`, `Reflection` などのEntity。
  外部ライブラリに依存しない。
- **Application**: ユースケースクラス。Repositoryは
  インターフェースのみ定義（依存性逆転の原則 / Principle 8）。
- **Interface Adapters**: Repositoryインターフェースの実装。
  将来Notion/Sheets等に差し替える際はここだけ変更する。
- **Infrastructure**: CLIエントリポイント、DB接続、将来のWeb API。

この構成の狙いは、Principle 9（段階的拡張）を実現すること——
Version2以降の外部サービス接続やUI追加を、Domain層を壊さずに
行えるようにする。

---

## 永続化層：Supabase（ローカルPostgres／クラウド）

**方針**：Version1ではSupabase CLIで起動するローカルPostgres環境を
使用した（ADR 0001）。Version2でowner_id列とRLSを追加し（ADR 0003）、
クラウドSupabaseプロジェクトへの切り替えに対応した。

**認証**：単一Ownerユーザーのemail/passwordでSupabase Authに
サインインしてから読み書きする（`pnpm reflect --db=supabase`が
CLI起動時に自動サインイン）。招待・サインアップ機能は無い。

**根拠**（詳細はADR 0001, 0003参照）：
- SQLiteではなくPostgres方言に最初から寄せることで、将来の
  クラウド移行時に方言差異による書き直しが発生しない。
- RLS（`owner_id = auth.uid()`）により、漏洩したanonキーからの
  読み書きを防ぐ最低限の境界を持つ。
- Repositoryパターンにより、ローカル→クラウドの切り替えは
  接続文字列とAuth設定の追加のみで済む設計とした
  （`SupabaseReflectionRepository`自体は無変更）。

---

## Notion連携

**方針**：ReflectionRepositoryの実装の1つとして
`NotionReflectionRepository`を提供する（`pnpm reflect --db=notion`）。
Domain/Application層はSupabase実装と同じインターフェース
（`ReflectionRepository`）越しにしかNotionを知らない。

Notionにはマイグレーション機構がないため、以下のプロパティを持つ
データベースを**手動で作成**しておく必要がある（プロパティ名は
大文字小文字・スペースまで一致させること）。

| プロパティ名 | 型 | 用途 |
|---|---|---|
| Name | Title | ページタイトル（日付文字列を格納） |
| ARC ID | Text | Domain層のReflection.id（UUID） |
| Date | Date | クエリ・ソートに使う実際の日付 |
| Sleep Hours | Number | 睡眠時間 |
| Study Minutes | Number | 勉強時間（分） |
| Did Martial Arts | Checkbox | 少林寺拳法に行ったか |
| Did English Lesson | Checkbox | 英会話レッスンを受けたか |
| Mood | Select | `great`/`good`/`neutral`/`low`/`bad` |
| Expense Yen | Number | 支出額 |
| Notes | Text | 今日の出来事（自由記述） |
| Today's Events | Text | 今日の出来事 |
| Tomorrow's Goal | Text | 明日の目標 |

作成したNotion integration（Internal Integration）を、この
データベースに対して「接続」として明示的に共有する必要がある
（Notion UI上の操作。忘れると`object_not_found`エラーになる）。

`createdAt`はNotionページの`created_time`をそのまま使い、
専用プロパティは持たない（重複を避けるため）。

**認証**：単一ユーザー・単一ワークスペース運用のため、Notion Auth
（OAuth）ではなくInternal Integration Secret（`NOTION_API_KEY`）を
使う。ADR 0003の「複数クライアント対応」はSupabase側の話であり、
Notion接続の認証方式には影響しない（Notion API自体はintegration
tokenのみでアクセス制御が完結するため）。

---

## AIプロバイダーとの関係

Version1では`AIService`のような共通インターフェースは実装しない。
ARC / Gemini / Claude Codeは交換可能なプロバイダーではなく、
役割分担された別個の主体として扱う（`ai-roles.md`, Principle 10）。
将来的に「同一処理を複数プロバイダーで実行したい」という具体的
要件が発生した時点で抽象化を検討する（ADR 0002参照、Principle 9）。

---

## ディレクトリ構成

```
project-arc/
├── src/
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── Task.ts
│   │   │   ├── StudyLog.ts
│   │   │   └── Reflection.ts
│   │   └── value-objects/
│   ├── application/
│   │   ├── use-cases/
│   │   │   └── reflection/
│   │   │       ├── RecordDailyReflection.ts
│   │   │       └── RecordDailyReflection.test.ts
│   │   └── ports/
│   │       └── ReflectionRepository.ts
│   ├── adapters/
│   │   ├── repositories/
│   │   │   ├── SupabaseReflectionRepository.ts
│   │   │   └── NotionReflectionRepository.ts
│   │   └── presenters/
│   ├── infrastructure/
│   │   ├── db/
│   │   │   ├── supabase/           # supabase CLI設定・migrations
│   │   │   └── schema.sql
│   │   ├── cli/
│   │   └── config/
│   │       └── env.ts              # zodバリデーション
│   └── shared/
│       └── errors/
├── tests/
├── docs/
│   ├── vision.md
│   ├── principles.md
│   ├── architecture.md
│   ├── roadmap.md
│   ├── ai-roles.md
│   └── adr/
│       ├── 0001-local-first-postgres-via-supabase-cli.md
│       ├── 0002-defer-ai-provider-abstraction.md
│       └── 0003-cloud-supabase-and-auth-rls.md
├── .github/
│   └── workflows/
│       └── ci.yml
├── supabase/                       # supabase CLIが生成する設定
├── .env.example
├── docker-compose.yml
├── Dockerfile
├── package.json
├── tsconfig.json
└── README.md
```

---

## 技術スタック

| 項目 | 選定 | 根拠 |
|---|---|---|
| 言語 | TypeScript | 型安全性がDomain境界を守る（Principle 8） |
| ランタイム | Node.js (LTS) | 要件指定 |
| パッケージ管理 | pnpm | monorepo親和性、将来のWeb化に備える |
| DB (V1) | Supabase CLI（ローカルPostgres） | ADR 0001 |
| テスト | Vitest | 高速・ESM親和性 |
| Lint/Format | ESLint + Prettier + husky | 保守性（Principle 8） |
| コンテナ | Docker | 要件指定、環境差異の吸収 |

---

## GitHub構成

- リポジトリ：private（個人の学習・健康・家計データを含むため）
- ブランチ：`main` + `feature/*`
- GitHub Actions（V1範囲）：push時のlint/test/build のみ。
  定期実行cronはVersion2以降（Principle 9: 段階的拡張）
- 環境変数：`.env.example`をコミット、実値は`.gitignore`。
  APIキー管理方針のみV1で文書化し、実装はVersion2以降
