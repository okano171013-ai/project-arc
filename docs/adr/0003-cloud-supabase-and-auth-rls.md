# ADR 0003: Version2クラウド移行時の認証・RLS方針

## ステータス

承認済み（2026年時点）

## 関連Principle

- Principle 9（段階的拡張）
- Principle 8（長期保守性）
- Principle 4（記録は資産である）

## コンテキスト

ADR 0001は「Version1はローカルPostgres、Version2でクラウド
Supabaseプロジェクトに向き先を変更し、認証・RLS設計を別ADRとして
記録する」と定めていた。Version2着手にあたり、その認証・RLS方針を
本ADRで確定する。

Project ARCは将来的にiPhone・Mac・Web・複数AI（ARC/Gemini/Claude
Code）から同一データにアクセスする「人生OS」を目指す
（`docs/vision.md`）。単一ユーザーのシステムではあるが、
複数クライアントからのアクセスを前提にする以上、匿名キー
（anon key）を無制限に信頼する設計は採らない。

## 検討した選択肢

1. **anonキーのみで運用し、RLSは無効のまま**：Version1の延長として
   最も実装コストが低いが、匿名キーが漏洩した場合に全データへの
   読み書きが可能になる。単一ユーザーとはいえ、複数クライアント
   （将来的にはWebフロント等）から常時通信する構成とは相性が悪い。
2. **Supabase Authでユーザーを1人作成し、全テーブルにowner_id列 +
   RLSポリシーを追加する**：単一ユーザー運用の実態は変えずに、
   「本人のセッション以外からは読み書きできない」という最低限の
   防御線を持てる。Version2以降、複数クライアント（iPhone/Mac/Web）
   が増えてもRLSポリシー自体は変更不要（クライアントごとに
   Supabase Authでログインするだけ）。
3. **カスタム認証基盤を自前実装する**：Supabase Authという既存の
   仕組みがある以上、Principle 9（段階的拡張・YAGNI）に反する
   過剰な実装。

## 決定

**選択肢2**を採用する。

- Supabase Auth（email/passwordまたはmagic link）でOwner本人の
  ユーザーを1人作成する。招待・サインアップ機能は作らない
  （複数ユーザー運用はスコープ外）。
- `reflections` / `study_logs` / `tasks` の各テーブルに
  `owner_id uuid not null references auth.users(id) default auth.uid()`
  を追加する。
- 各テーブルにRLSを有効化し、`owner_id = auth.uid()` のみを
  許可するポリシー（select/insert/update/delete）を追加する。
- クライアントは常にSupabase Authでサインインした上で
  `SUPABASE_ANON_KEY` + セッションJWTで接続する。
  `service_role`キーはCI/管理用途に限定し、アプリケーションの
  通常経路では使用しない。

## 根拠

- 単一ユーザー運用であっても、Owner本人以外（漏洩したanonキーを
  持つ第三者）からの読み書きを防げる最低限の境界線をVersion2の
  時点で確保しておく方が、後から複数クライアント対応を追加する
  際の手戻りが小さい（Principle 8）。
- `owner_id`列とRLSポリシーの追加はスキーマへの影響が限定的で、
  Version1のRepository実装（`SupabaseReflectionRepository`等）の
  クエリ自体は変更不要（RLSはDB側で透過的に適用されるため）。
- カスタム認証基盤を自作する具体的必要性は現時点でないため、
  Supabase Authをそのまま使う（Principle 9, YAGNI）。

## 影響

- `src/infrastructure/config/env.ts`にSupabase Authのセッション
  取得・リフレッシュを扱う処理が必要になる（Version2実装時に
  追加）。
- `supabase/migrations/`に、`owner_id`列追加・RLS有効化・
  ポリシー追加のマイグレーションをVersion2実装時に追加する。
- ローカル開発環境（Version1のSupabase CLIスタック）でも
  `supabase start`時に自動生成されるテストユーザーで
  Auth込みの動作確認を行う想定とする。
- 外部サービス（Google Calendar等）との接続設計自体は本ADRの
  対象外。`docs/roadmap.md` Version2の各接続は、認証基盤が
  固まった後に個別に設計する。

## 再検討の条件

- 複数ユーザー運用（家族利用等）の具体的要件が発生した場合、
  `owner_id`単一比較のRLSポリシーでは不十分になるため、
  本ADRを見直す。
