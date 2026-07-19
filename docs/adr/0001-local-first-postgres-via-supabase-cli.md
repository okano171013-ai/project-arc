# ADR 0001: Version1はSupabase CLIによるローカルPostgresを採用する

## ステータス

承認済み（2026年時点）

## 関連Principle

- Principle 9（段階的拡張）
- Principle 6（UXを最優先する／不要な複雑さを持ち込まない）
- Principle 8（長期保守性）

## コンテキスト

Project ARCは将来的にiPhone・Mac・Web・複数AIから同一データに
アクセスする「人生OS」を目指している。当初案ではSQLite、
その後のレビューでSupabase（クラウド）が提案された。

## 検討した選択肢

1. **SQLite**：Version1のシンプルさは満たすが、将来のPostgres
   移行時に方言差異の書き直しコストが発生する。
2. **Supabaseクラウド（Version1から接続）**：将来像には合うが、
   認証・RLS・ネットワーク依存をVersion1のスコープに持ち込むことになり、
   Principle 9（段階的拡張）と衝突する。
3. **Supabase CLI（ローカルPostgres）**：Postgres方言に最初から
   寄せつつ、クラウド接続・認証はVersion2まで遅らせられる。

## 決定

Version1では **Supabase CLIで起動するローカルPostgres環境** を採用する。
Version2で、接続文字列とAuth設定を追加するだけでクラウド
Supabaseプロジェクトに向き先を変更する。

## 根拠

- Repositoryパターン（Clean Architecture）により、ローカル→クラウド
  移行のコストは本来低く保たれる設計になっている（Principle 8）。
  「移行コストが高いから最初からクラウド」という判断は、この設計
  前提と矛盾するため採らない。
- Postgres方言に最初から統一することで、SQLite案が持つ「後で
  書き直しが発生する」という欠点は回避できる。
- 認証・RLS・ネットワーク依存はVersion1の目的（土台づくり）に
  対して過剰であり、Principle 9（段階的拡張）に反する。

## 影響

- Version1ではDockerでSupabase CLIのローカルスタックを起動する
  構成が必要（`docker-compose.yml`に追加）。
- Version2着手時に、認証・RLS設計をADRとして別途記録する
  （→ ADR 0003）。
