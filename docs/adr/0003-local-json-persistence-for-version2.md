# ADR 0003: Version2ではJSONファイルによるローカル永続化を採用する

## ステータス

承認済み

## 関連Principle

- Principle 6（UXを最優先する）
- Principle 9（段階的拡張／YAGNI）
- Principle 3（継続性）

## コンテキスト

ADR 0001でVersion1の永続化はSupabase CLI（ローカルPostgres）と
決定したが、実際には`supabase init` / `supabase start`のセットアップは
まだ行われていない（Docker環境構築が別途必要）。

Version2のテーマは「ARCと一日を始め、ARCと一日を終える」であり、
`pnpm morning`と`pnpm reflect`の間でデータが引き継がれる必要がある
（例：朝に前日の勉強時間・支出を表示する）。この時点でSupabase CLIの
セットアップを前提にすると、機能を試す前に重い環境構築が必要になり、
「毎日使う理由を作る」というVersion2の目的と衝突する。

## 決定

Version2では、`ReflectionRepository`と`InventoryRepository`の
実装として、**ローカルのJSONファイル**に読み書きする
`JsonFileReflectionRepository` / `JsonFileInventoryRepository` を
既定（デフォルト）で使用する。データは`data/`ディレクトリ配下に
保存し、Gitの追跡対象からは除外する（個人の記録のため）。

既存の`SupabaseReflectionRepository`（ADR 0001）は削除せず、
`--db=supabase`オプションで引き続き選択可能な状態を維持する。
Supabase CLIのセットアップが完了した際は、このオプションに
切り替えるだけで移行できる。

## 根拠

- Repositoryパターンにより、永続化実装の切り替えはAdapters層の
  追加・選択のみで完結し、Domain/Application層に影響しない。
  ADR 0001の判断（Postgres方言への統一）を破棄するものではなく、
  「今すぐ使う手段」を追加するだけである。
- JSONファイルはセットアップ不要（Node.jsの`fs`のみで完結）で
  あり、Version2の「毎日使う」という体験を今すぐ検証できる。
- Version2の要件定義でも「ローカルだけで完結」「Supabaseクラウド
  同期はVersion3以降」と明記されており、本決定はこれと整合する。

## 影響

- `data/`ディレクトリを`.gitignore`に追加する。
- JSONファイルは同時書き込みや大量データに弱いため、将来的に
  データ量が増えた場合はSupabase/SQLite等への移行を検討する
  （その際もRepositoryの差し替えのみで対応可能）。
- Version3でSupabase CLIセットアップが完了した時点で、本ADRの
  ステータスを見直す。
