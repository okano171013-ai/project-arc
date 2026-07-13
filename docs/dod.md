# Definition of Done (DoD)

Project ARCにおける「完成」の定義。実装速度よりも品質を優先する
（2026年7月方針決定）。この基準を満たさないコードはmainにマージしない。

## 関連Principle

- Principle 8（長期保守性）
- Principle 3（継続性）

## 基準

作業（機能追加・修正・リファクタ）が「完成」と呼べるのは、
以下をすべて満たしたときとする。

1. **テスト（`pnpm test`）** — 追加・変更したロジックに対応する
   テストが存在し、全て緑であること。Domain / Application層は
   特にカバレッジを重視する（振る舞いの正しさがユースケースの
   信頼性に直結するため）。
2. **型チェック（`pnpm typecheck`）** — エラーゼロ。`any`の
   使用は原則禁止（ESLintのwarningで検知）。
3. **Lint（`pnpm lint`）** — エラーゼロ。warningは許容するが、
   放置する場合は理由をPRやコミットメッセージに記す。
4. **README更新** — 新しいコマンド・環境変数・セットアップ手順が
   増えた場合は`README.md`を同時に更新する。ドキュメントと
   実装の乖離を作らない。
5. **ADR更新（必要な場合のみ）** — アーキテクチャ上の判断
   （DB選定、抽象化の追加、責務の変更等）を伴う変更は、
   新しいADRを追加するか既存ADRのステータスを更新する。
   単純なバグ修正や小さなリファクタでは不要。

## 明示的にスコープ外とするもの（Version1時点）

DoDを厳格にする一方、Principle 9（段階的拡張）に基づき、
以下はVersion1のDoDには含めない。将来必要になった時点で
このドキュメントを更新する。

- E2Eテスト（UIが存在しないため）
- パフォーマンステスト
- CI上でのSupabase実接続テスト（ローカル`supabase start`が
  前提のため、CI環境の整備はVersion2以降で検討）

## 運用ルール

- 各Versionの節目（Version1完了時など）で、DoDの5項目を
  チェックリストとして手動確認する。
- DoD自体も見直し対象。基準が形骸化していると感じたら、
  このファイルを直接改定する（Principle自体を疑うのではなく、
  基準の運用方法を疑うこと）。

## Version1完了チェックリスト

- [x] `pnpm install` が成功する
- [x] `pnpm test` が全て緑
- [x] `pnpm typecheck` がエラーゼロ
- [x] `pnpm lint` がエラーゼロ
- [x] `pnpm reflect` がCLIとして正常動作する（InMemory実行）
- [x] README / docsに実装との乖離がない

Version1のDoDは達成済み。

## Version2完了チェックリスト

- [x] `pnpm test` が全て緑（Reflection score / Inventory / Morning Brief含む）
- [x] `pnpm typecheck` がエラーゼロ
- [x] `pnpm lint` がエラーゼロ
- [x] `pnpm morning` が正常動作する
- [x] `pnpm reflect` が正常動作する（新フィールド・スコア表示含む）
- [x] `pnpm inventory -- add / list / update` が正常動作する
- [x] README / docsに実装との乖離がない
- [x] ADR 0003（JSON永続化）を記録済み

Version2のDoDは達成済み。

## Version3完了チェックリスト

- [x] `pnpm test` が全て緑（29件：Google連携ロジック・Inventory拡張・Reflection前日比較含む）
- [x] `pnpm typecheck` がエラーゼロ
- [x] `pnpm lint` がエラーゼロ
- [x] `pnpm morning` が正常動作する（ダミーデータへのフォールバック確認済み、Google連携は未確認）
- [x] `pnpm reflect` が正常動作する（新規記録・上書き・前日比較なしケースを確認済み）
- [x] `pnpm inventory -- add/list/update/maintain/show` が正常動作する
- [x] README / docsに実装との乖離がない
- [x] ADR 0004（Google OAuth・トークン暗号化）を記録済み
- [x] `docs/reports/Version3_Report.md` を生成済み（`docs/reports/TEMPLATE.md`の12章構成に準拠、以降のVersionも同様）
- [x] Google Calendar/Tasks連携の実機確認（OAuth認証・Tasks取得まで確認済み）

## Version4完了チェックリスト

- [x] `pnpm test` が全て緑（Memory/AppearanceLog/Search/写真保存を含む、49件）
- [x] `pnpm typecheck` がエラーゼロ
- [x] `pnpm lint` がエラーゼロ
- [x] `pnpm memory -- add/list/update/delete` が正常動作する（実機確認済み — 2026年7月、擬似expectドライバによる対話式CLIの実行で確認。日本語タグの往復含めて正常）
- [x] `pnpm appearance -- add/list` が正常動作する（実機確認済み。写真ファイルの実コピーを確認）
- [x] `pnpm inventory -- photo` が正常動作する（実機確認済み。写真ファイルの実コピーを確認）
- [x] `pnpm run find <キーワード>` が正常動作する（`search`→`find`も衝突したため、以後すべて`pnpm run`形式に統一。後述）
- [x] README / docsに実装との乖離がない
- [x] ADR 0005（Memory/Inventory/Reflectionの境界）を記録済み
- [x] `docs/reports/Version4_Report.md` を生成済み（13章構成）

Version4のDoDは達成済み（対話式CLIの実機確認も完了、2026年7月）。

## Version5完了チェックリスト

- [x] `pnpm test` が全て緑（SkinLog/PurchaseLog/ChallengeLogを含む、64件）
- [x] `pnpm typecheck` がエラーゼロ
- [x] `pnpm lint` がエラーゼロ
- [x] `pnpm skin -- add/list/compare` が正常動作する（実機確認済み。数値5項目すべて正常に記録）
- [x] `pnpm purchase -- add/start/finish/list` が正常動作する（実機確認済み。未使用→使用中→使い切りの状態遷移を確認）
- [x] `pnpm challenge -- add/list` が正常動作する（実機確認済み）
- [x] README / docsに実装との乖離がない
- [x] ADR 0006（Skin Log/Purchase Log と Appearance Log/Life Inventoryの境界）を記録済み
- [x] `docs/reports/Version5_Report.md` を生成済み（13章構成）
- [x] `docs/reports/Version5_ARC_Feedback.md`（ARCへのフィードバック）を生成済み

Version5のDoDは達成済み（対話式CLIの実機確認も完了、2026年7月）。

## Version6完了チェックリスト

- [x] `pnpm test` が全て緑（Capture/RuleBasedCaptureClassifierを含む、73件）
- [x] `pnpm typecheck` がエラーゼロ
- [x] `pnpm lint` がエラーゼロ
- [x] `pnpm capture -- add/list` が正常動作する（実機確認済み。「メラノCC買った」→Purchase Log提案→確定→書き込み→監査ログまで一気通貫で確認）
- [x] README / docsに実装との乖離がない
- [x] ADR 0007（Smart CaptureにおけるSystem/ARCの責務分担）を記録済み
- [x] `docs/reports/Version6_Report.md` を生成済み（13章構成）
- [x] `docs/reports/Version6_ARC_Feedback.md`（ARCへのフィードバック）を生成済み

Version6のDoDは達成済み（対話式CLIの実機確認も完了、2026年7月）。

## 対話式CLI実機確認について（Version4〜6共通の注記）

Version3〜5の時点では、Claude Codeのサンドボックス環境の制約
（Node.js `readline/promises`が非TTY標準入力に対して複数質問を
正しく解決できないバグ、Version6 Reportで原因特定）により対話式CLI
の実機確認ができていなかった。2026年7月、擬似expectドライバ
（プロンプト文字列の出力を検知してから次の回答を送る簡易自動化
スクリプト、`child_process.spawn`ベース）を作成し、Version4〜6の
全対話式CLI（memory/appearance/inventory photo/skin/purchase/
challenge/capture、計17コマンド）を実際にサンドボックス上で駆動して
実機確認を完了した。生成されたJSONファイル・写真コピーの中身も
目視確認済み。検証用データ・スクリプトは確認後に削除済み。

## Version7完了チェックリスト

- [x] `pnpm test` が全て緑（HTTP APIの結合テスト10件を含む、83件）
- [x] `pnpm typecheck` がエラーゼロ
- [x] `pnpm lint` がエラーゼロ
- [x] `pnpm run api` が正常に起動し、`GET /health`が応答する（実機確認済み）
- [x] `POST /reflection` `/skin` `/appearance` `/purchase` `/purchase/:id/start` `/purchase/:id/finish` `/capture/suggest` `/capture` が実際のHTTPリクエストで正常動作する（実機確認済み。Node `fetch`経由で日本語を含む往復も確認。curl経由ではGit Bash側の文字コード問題で日本語が化けることを確認したため、検証は`fetch`で行う運用とする）
- [x] README / docsに実装との乖離がない
- [x] ADR 0008（ARC Connector）を記録済み
- [x] `docs/reports/Version7_Report.md` を生成済み（13章構成）
- [x] `docs/reports/Version7_ARC_Feedback.md`（ARCへのフィードバック）を生成済み

Version7のDoDは達成済み（HTTP APIは`fetch`ベースの自動テストと実サーバーへの実リクエストで確認済み、対話式CLIのような実機確認待ちの制約がそもそも発生しない）。

Version4のDoDは達成済み（対話式CLIの実機確認はOwnerに委ねる、上記注記の通り）。
