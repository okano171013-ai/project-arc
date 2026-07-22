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

## Version8完了チェックリスト

- [x] `pnpm test` が全て緑（Timelineの結合テストを含む、90件）
- [x] `pnpm typecheck` がエラーゼロ
- [x] `pnpm lint` がエラーゼロ
- [x] `pnpm run timeline`（`--since=` `--source=`含む）が正常動作する（実機確認済み。API経由で実データを投入し、CLI・`GET /timeline`両方で日本語含め正しく表示されることを確認）
- [x] `GET /timeline` がHTTP経由で正常動作する（実機確認済み）
- [x] README / docsに実装との乖離がない
- [x] ADR 0009（Timelineの対象範囲とデータ取得方法）を記録済み
- [x] `docs/reports/Version8_Report.md` を生成済み（13章構成）
- [x] `docs/reports/Version8_ARC_Feedback.md`（ARCへのフィードバック）を生成済み
- [x] `docs/architecture-diagram.md`（Project ARCアーキテクチャ図）を生成済み

Version8のDoDは達成済み（Timeline CLIは対話式ではないため実データで直接確認、HTTP APIも実サーバーへの実リクエストで確認済み）。

## Version9完了チェックリスト

- [x] `pnpm test` が全て緑（Bridge Layer・ThirdPersonEvaluationの結合テストを含む、107件）
- [x] `pnpm typecheck` がエラーゼロ
- [x] `pnpm lint` がエラーゼロ
- [x] `pnpm evaluation -- add/list` が正常動作する（実機確認済み、擬似expectドライバで駆動）
- [x] `pnpm bridge -- import <file>` が正常動作する（実機確認済み。実データで検証中に実際のargv解析バグ（サブコマンド名をファイルパスと誤認識）を発見・修正）
- [x] `pnpm bridge -- export`（`--type=`含む）が正常動作する（実機確認済み）
- [x] `POST /evaluation` `/bridge/import`、`GET /bridge/export` がHTTP経由で正常動作する（実機確認済み、日本語データの往復含む）
- [x] Smart Captureの「言われた」「ガタイ」キーワードがThirdPersonEvaluationへ振り分けられることを確認済み
- [x] Timelineが7ソース目としてThirdPersonEvaluationを含むことを確認済み
- [x] README / docsに実装との乖離がない
- [x] ADR 0010（Bridge Layer）・ADR 0011（Third Person Evaluation）を記録済み
- [x] `docs/architecture-diagram.md` を更新済み
- [x] `docs/reports/TEMPLATE.md` に14章「10年後のProject ARCへの貢献」を追加済み
- [x] `docs/reports/Version9_Report.md` を生成済み（14章構成）
- [x] `docs/reports/Version9_ARC_Feedback.md`（ARCへのフィードバック）を生成済み

Version9のDoDは達成済み（対話式CLIは擬似expectドライバで、非対話CLI・HTTP APIは実リクエストで確認済み）。

## Version10完了チェックリスト

- [x] `pnpm test` が全て緑（ExternalSource/ExternalKnowledge/Bridge拡張/Timeline拡張のテストを含む、144件）
- [x] `pnpm typecheck` がエラーゼロ
- [x] `pnpm lint` がエラーゼロ
- [x] `pnpm external -- add/list/show/update/delete/search/review/archive` が正常動作する（実機確認済み、`add`/`update`/`delete`は擬似expectドライバで駆動。この検証中に実際のargv解析バグ（サブコマンド名をidと誤認識）と、`update()`が`changes`内の明示的な`undefined`で既存値を消してしまうバグの2件を発見・修正）
- [x] `POST/GET/PATCH/DELETE /external-sources`・`/external-knowledge`・`GET /external-knowledge/search` がHTTP経由で正常動作する（実機確認済み、日本語データの往復含む）
- [x] `pnpm bridge -- import/export` がExternalSource/ExternalKnowledgeを含めて正常動作する（実機確認済み。エクスポート件数上限・`truncated`フラグも確認）
- [x] `pnpm timeline` / `GET /timeline` がExternalKnowledgeを含み、contentを含まないことを確認済み
- [x] README / docsに実装との乖離がない
- [x] ADR 0012〜0018（External Brainの判断境界・Source/Knowledge分離・検索分離・Bridge命名規則・BridgeのsourceId解決・Timeline組み込み・MemoryEntryとの分離）を記録済み
- [x] `docs/architecture-diagram.md` を更新済み
- [x] `docs/reports/Version10_Report.md` を生成済み（14章構成）
- [x] `docs/reports/Version10_ARC_Feedback.md`（ARCへのフィードバック）を生成済み

Version10のDoDは達成済み（対話式CLIは擬似expectドライバで、非対話CLI・HTTP API・Bridgeは実リクエスト/実ファイルで確認済み）。

## Version11完了チェックリスト

- [x] `pnpm test` が全て緑（RetrieveKnowledge/buildRetrievalContextのテストを含む、153件）
- [x] `pnpm typecheck` がエラーゼロ
- [x] `pnpm lint` がエラーゼロ
- [x] `pnpm external -- retrieve <query>`・`--tags=`・`--topics=`・`--limit=` が正常動作する（実機確認済み。ブリーフの「行政法の処分性」検索例を実データで再現し、スコア順ランキングとContext Builder出力を確認）
- [x] `POST /knowledge/retrieve` がHTTP経由で正常動作する（実機確認済み、日本語データの往復含む）
- [x] タグ一致による絞り込みが無関係な知識（「料理レシピ」等）を正しく除外することを確認済み
- [x] Context Builderが「【External Brain】」ブロックのみを生成し、「【ARC】」の推論部分を生成しないことを確認済み（テスト・実機確認両方）
- [x] README / docsに実装との乖離がない
- [x] ADR 0019〜0021（Query Layerのスコープ・ランキング方式・Context Builderの責務境界）を記録済み
- [x] `docs/architecture-diagram.md` を更新済み
- [x] `docs/reports/Version11_Report.md` を生成済み（14章構成）
- [x] `docs/reports/Version11_ARC_Feedback.md`（ARCへのフィードバック）を生成済み

Version11のDoDは達成済み（非対話CLI・HTTP APIは実リクエスト/実データで確認済み）。

## Version12完了チェックリスト

- [x] `pnpm test` が全て緑（CandidateBuilder/ComparisonBuilder/DecisionEngineのテストを含む、168件）
- [x] `pnpm typecheck` がエラーゼロ
- [x] `pnpm lint` がエラーゼロ
- [x] `pnpm decision -- "<質問>"`（直接指定）・`pnpm decision`（対話式、擬似expectドライバで駆動）が正常動作する（実機確認済み）
- [x] ブリーフの5つの実機確認例（今日は何を勉強する？／今日は早く寝るべき？／この参考書を買うべき？／行政法と民訴法どちらを優先？／筋トレを休む？）全てでDecisionContextが生成されることを確認済み。「今日は何を勉強する？」で指示書の期待通り「行政法・民訴法・会社法」の3候補（優先順位なし）が出ることを確認
- [x] `POST /decision/support` がHTTP経由で正常動作する（実機確認済み、日本語データの往復含む）
- [x] DecisionContextにARCの解釈・結論文が一切含まれないことを確認済み（テスト・実機確認両方）
- [x] README / docsに実装との乖離がない
- [x] ADR 0022〜0025（CandidateBuilderのパターンマッチング設計・Decision Supportと「Systemは判断しない」の整合性・DecisionContextをVOにした理由・Bridge非統合の理由）を記録済み
- [x] `docs/architecture-diagram.md` を更新済み
- [x] `docs/reports/Version12_Report.md` を生成済み（14章構成）
- [x] `docs/reports/Version12_ARC_Feedback.md`（ARCへのフィードバック）を生成済み

Version12のDoDは達成済み（対話式・非対話式CLI、HTTP APIともに実機確認済み）。

## Version13完了チェックリスト

- [x] `pnpm test` が全て緑（IntentDetector/ConversationGatewayのテストを含む、181件）
- [x] `pnpm typecheck` がエラーゼロ
- [x] `pnpm lint` がエラーゼロ
- [x] `pnpm conversation -- "<質問>"`（直接指定）・`pnpm conversation`（対話式、擬似expectドライバで駆動）が正常動作する（実機確認済み）
- [x] ブリーフの4つの実機確認例（前に保存した行政法の記事は？／今日は何を勉強する？／こんにちは／この参考書買う？）全てでConversationContextが正しいIntent（Retrieval/Decision/None）で生成されることを確認済み
- [x] `POST /conversation/context` がHTTP経由で正常動作する（実機確認済み、日本語データの往復含む）
- [x] Context Injectionが【Retrieved Knowledge】【Decision Context】【Sources】の3セクションのみで構成され、「【ARC】」に相当する解釈・結論を一切含まないことを確認済み
- [x] limitが必ず指定され、全件検索が行われないことを確認済み（実機確認・テスト両方）
- [x] README / docsに実装との乖離がない
- [x] ADR 0026〜0029（ConversationGatewayのApplication層配置・ConversationContextをVOにした理由・「Systemは判断しない」との整合性・IntentDetectorのパターンマッチング設計）を記録済み
- [x] `docs/architecture-diagram.md` を更新済み
- [x] `docs/reports/Version13_Report.md` を生成済み（14章構成）
- [x] `docs/reports/Version13_ARC_Feedback.md`（ARCへのフィードバック）を生成済み

実機確認の過程で、RetrieveKnowledgeUseCaseへ質問文をそのまま
`query`として渡すと、フィールド側が質問文全体を部分文字列として
含むことが稀なため実質的にヒットしないバグを発見・修正した
（既存topicとの逆方向一致をtopicsフィルタとして併用する形に修正、
詳細は`docs/reports/Version13_Report.md`7章参照）。

Version13のDoDは達成済み（対話式・非対話式CLI、HTTP APIともに実機確認済み）。

Version4のDoDは達成済み（対話式CLIの実機確認はOwnerに委ねる、上記注記の通り）。

## Version14完了チェックリスト

- [x] `pnpm test` が全て緑（ManagementFeedback/ReadGateway/WriteProposalGatewayのテストを含む、217件）
- [x] `pnpm typecheck` がエラーゼロ
- [x] `pnpm lint` がエラーゼロ
- [x] `pnpm propose`（対話式、擬似expectドライバで駆動）でProposal作成→表示→Approveの一連が正常動作する（実機確認済み）
- [x] `pnpm propose list-feedback`・`pnpm propose resolve <id> <resolution>`が正常動作する（実機確認済み。Open→Acceptedの遷移を実データで確認）
- [x] `GET /read/reflection` `/read/timeline` `/read/external` `/read/decision`が`limit`未指定時に400を返し、指定時は正常動作する（実機確認済み、日本語データの往復含む）
- [x] `POST /proposal/create` → `/proposal/approve`（または`/proposal/reject`）の一連がHTTP経由で正常動作する（実機確認済み）。`createProposal`単体ではRepositoryに一切書き込みが発生しないことを確認済み
- [x] 5つのProposal種別（Reflection/Memory/ExternalKnowledge/Appearance/ManagementFeedback）すべてでapproveProposal時に対応するRepositoryへ保存されることを確認済み（テスト・実機確認両方）
- [x] ManagementFeedbackのresolution状態機械（Open→Accepted→Implemented→Closed、Open/Accepted→Rejected）が正しい遷移のみ許可することを確認済み
- [x] README / docsに実装との乖離がない
- [x] ADR 0030〜0033（Read/Write Gatewayの分離理由・Write Proposal Layerを追加した理由・ManagementFeedbackをReflectionと分離した理由・ManagementFeedbackをTimelineに載せない理由）を記録済み
- [x] `docs/architecture-diagram.md` を更新済み
- [x] `docs/reports/Version14_Report.md` を生成済み（14章構成）
- [x] `docs/reports/Version14_ARC_Feedback.md`（ARCへのフィードバック）を生成済み

実機確認の過程で、`POST /proposal/approve`のレスポンスが
`approveProposal()`の生の出力（Entityインスタンス）をそのまま
`JSON.stringify`していたため、`_id`・`_record`等のprivateフィールド名が
そのまま漏れるバグを発見・修正した（他のルート同様、`serializers.ts`の
`serialize*`関数を経由するよう`serializeApproveResult()`を追加、
詳細は`docs/reports/Version14_Report.md`7章参照）。

Version14のDoDは達成済み（対話式・非対話式CLI、HTTP APIともに実機確認済み）。

## Version15完了チェックリスト

- [x] `pnpm test` が全て緑（apiKeyAuth/Connector/connectorConfigのテストを含む、233件）
- [x] `pnpm typecheck` がエラーゼロ
- [x] `pnpm lint` がエラーゼロ
- [x] `Connector`クラス経由でRead（reflection/timeline/external/decision）が正常動作する（実機確認済み、`limit`必須）
- [x] `Connector`クラス経由でcreateProposal→approveProposal→ManagementFeedback保存→listFeedback→resolveFeedbackの一連が正常動作する（実機確認済み、指示書15章のフロー）
- [x] `Connector`クラス経由でrejectProposalが何も保存しないことを確認済み
- [x] `ARC_API_KEY`未設定時は従来通り認証なしで動作し、設定時は`Authorization: Bearer`ヘッダーなし/誤りで401を返すことを確認済み（テスト・実機確認両方）
- [x] `GET /health`は`ARC_API_KEY`設定時も認証不要であることを確認済み
- [x] `GET /management-feedback`・`POST /management-feedback/:id/resolve`がHTTP経由で正常動作する（実機確認済み）
- [x] Connector設定（baseUrl/apiKey）がハードコードされておらず`.env`経由で読み込まれることを確認済み
- [x] README / docsに実装との乖離がない
- [x] ADR 0034〜0036（ConnectorをInfrastructureへ置いた理由・HTTP APIを唯一の接続経路とした理由・認証をInfrastructureへ閉じ込めた理由）を記録済み
- [x] `docs/architecture-diagram.md` を更新済み
- [x] `docs/reports/Version15_Report.md` を生成済み（14章構成）
- [x] `docs/reports/Version15_ARC_Feedback.md`（ARCへのフィードバック）を生成済み

事前調査（指示書0章の推奨に従い実装前に実施）で、ChatGPT Actionsの
API Key認証がカスタムヘッダー非対応で`Authorization: Bearer`固定
であること、MCP Remote Serverも同じBearer token慣習を持つことを
確認し、認証方式の設計に反映した（詳細は`docs/reports/
Version15_Report.md`1章・ADR 0035参照）。

Version15のDoDは達成済み（自動テスト＋実サーバーへのConnector経由の実リクエストで確認済み）。

## Version16完了チェックリスト

- [x] `pnpm test` が全て緑（MCP Tool 9個のend-to-endテストを含む、238件）
- [x] `pnpm typecheck` がエラーゼロ
- [x] `pnpm lint` がエラーゼロ
- [x] MCPサーバー（`pnpm run mcp`）がstdioで正常に起動する（実機確認済み。実際に`npx tsx src/infrastructure/mcp/server.ts`を子プロセスとして起動しMCP Client経由で駆動）
- [x] MCP Client経由でRead（reflection/timeline/external/decision）が正常動作する（実機確認済み、`limit`必須がJSON Schemaで検証されることを確認）
- [x] MCP Client経由でproposal_create→proposal_approve→ManagementFeedback保存→management_feedback_list→management_feedback_resolveの一連が正常動作する（実機確認済み、指示書15章のフロー）
- [x] MCP Client経由でproposal_rejectが何も保存しないことを確認済み
- [x] Connector/HTTP側のエラー（存在しないID・認証なしアクセス等）がisError: trueとして正しく伝播することを確認済み（テスト・実機確認両方）
- [x] MCP Tool層がApplication/Domain層を一切importしていないことを確認済み（ADR 0038）
- [x] README / docsに実装との乖離がない
- [x] ADR 0037〜0038（MCP SDKを新規依存として追加した理由・MCP ToolをConnectorのみに依存させた理由）を記録済み
- [x] `docs/architecture-diagram.md` を更新済み
- [x] `docs/reports/Version16_Report.md` を生成済み（14章構成）
- [x] `docs/reports/Version16_ARC_Feedback.md`（ARCへのフィードバック）を生成済み

実装中、`mcp/server.ts`がテストからimportされた際に`main()`が
`isMainModule()`ガードなしで無条件実行され、テストプロセス内で
2つ目のstdio transportへ接続を試みてしまうバグを発見・修正した
（`http/server.ts`と同じ`isMainModule()`パターンを追加、詳細は
`docs/reports/Version16_Report.md`7章参照）。

Version16のDoDは達成済み（自動テスト＋実サーバー・実MCPサブプロセスへの実リクエストで確認済み）。

## Version17完了チェックリスト

- [x] `pnpm test` が全て緑（AgentMessage関連テストを含む、246件）
- [x] `pnpm typecheck` がエラーゼロ
- [x] `pnpm lint` がエラーゼロ
- [x] `proposal_create`（type: AgentMessage）→`proposal_approve`→`agent_message_list`の一連がMCP Tool経由で正常動作する（実機確認済み。実サブプロセスとして起動した`pnpm run mcp`を実MCP Client経由で駆動）
- [x] `GET /agent-messages`がHTTP経由で正常動作する（`direction`・`relatedVersion`絞り込み含む、テスト・実機確認両方）
- [x] `pnpm propose`でAgentMessage種別のProposal作成・`list-messages`が正常動作する（実機確認済み、擬似expectドライバで駆動）
- [x] AgentMessageがWrite Proposal Layerの既存制約（保存せず全体を再送、Owner承認後のみ書き込み）を満たしていることを確認済み
- [x] `.mcp.json`でClaude Codeが既存MCPサーバーへ接続できる設定になっていることを確認済み（次回Claude Code再起動時に有効化）
- [x] README / docsに実装との乖離がない
- [x] ADR 0039〜0040（AgentMessageをProposalパターンで実装した理由・AgentTask/Artifactを今回実装しない理由）を記録済み
- [x] `docs/architecture-diagram.md` を更新済み
- [x] `docs/reports/Version17_Report.md` を生成済み（14章構成）
- [x] `docs/reports/Version17_ARC_Feedback.md`（ARCへのフィードバック）を生成済み

Version17のDoDは達成済み（自動テスト＋実サーバー・実MCPサブプロセス・実CLIプロセスへの実リクエストで確認済み）。

## Version18完了チェックリスト

- [x] `pnpm test` が全て緑（Remote MCP・OpenAPI生成のテストを含む、250件）
- [x] `pnpm typecheck` がエラーゼロ
- [x] `pnpm lint` がエラーゼロ
- [x] Remote MCPサーバー（`pnpm run mcp:remote`）が`ARC_API_KEY`未設定時に起動エラーで終了することを確認済み（実機確認）
- [x] ローカルで実HTTP MCP Client（`StreamableHTTPClientTransport`）経由でRead→Proposal→Approveの一連が正常動作することを確認済み（実機確認。read_reflection/read_external/proposal_createの指示書8章必須3ツールを含む）
- [x] Bearerヘッダーなし/誤りで接続が拒否されることを確認済み（テスト・実機確認両方）
- [x] 既存のstdio MCPサーバー（`server.ts`、Claude Code用）が無変更のまま緑であることを確認済み（Claude Codeとの共存）
- [x] `pnpm run openapi:generate`が`docs/openapi.json`を正常に生成し、10エンドポイント全てにoperationIdが付与されていることを確認済み
- [x] `docs/setup/chatgpt-mcp-connection.md`を作成済み
- [x] 「ChatGPT → Remote MCP」の実接続確認はClaude Codeでは実施できない旨をReportに明記済み（公開HTTPS・ChatGPT UI操作が必要なため）
- [x] README / docsに実装との乖離がない
- [x] ADR 0041〜0043（Remote MCPを採用した理由・HTTPS公開方式の選定理由・OpenAPI生成をVersion18から開始した理由）を記録済み
- [x] `docs/architecture-diagram.md` を更新済み
- [x] `docs/reports/Version18_Report.md` を生成済み（14章構成）
- [x] `docs/reports/Version18_ARC_Feedback.md`（ARCへのフィードバック）を生成済み

Version18のDoDは達成済み（自動テスト＋実サーバー・実Remote MCPサブプロセスへの実リクエストで確認済み。「ChatGPT→Remote MCP」の実接続はOwner自身の操作が必要なため対象外）。

## Version19完了チェックリスト

- [x] `pnpm test` が全て緑（新規Entity・スキーマ変更なし、250件のまま）
- [x] `pnpm typecheck` がエラーゼロ
- [x] `pnpm lint` がエラーゼロ
- [x] `CLAUDE.md`のセッション開始チェックリストに`agent_message_list`確認ステップを追加済み
- [x] `docs/handoff/README.md`にファイルベース経路（経路A）・ライブ経路（経路B）の併存を明記済み
- [x] `docs/handoff/archive/Version19_ARC_Brief.md`を作成済み（AgentMessage経由の指示書を保管）
- [x] `docs/handoff/ARC_INBOX.md`に処理済みエントリを追記済み
- [x] `docs/ai-roles.md`に`tags`によるManagementFeedback↔AgentMessageトレーサビリティ規約（`mf:<id>`）を記録済み
- [x] ADR 0045（Version19のスコープをガバナンス境界に沿って絞り込んだ理由）を記録済み
- [x] ManagementFeedback（`e002f51a-...`、重複分）をRejectedに遷移済み
- [x] ManagementFeedback（`257338da-...`）をOwner確認後にAccepted→Implementedへ遷移済み（Closedは次回レビューに委ねる）
- [x] AgentMessage（`direction: "ToARC"`、id `795c971a-...`）で完了報告をProject ARCへ保存済み（Owner承認経由）
- [x] README / docsに実装との乖離がない
- [x] `docs/reports/Version19_Report.md` を生成済み（14章構成）
- [x] `docs/reports/Version19_ARC_Feedback.md`（ARCへのフィードバック）を生成済み

Version19のDoDは達成済み。新規Entity・UseCase・スキーマフィールドは
追加していない（ADR 0045参照、意図的なスコープ限定）——ドキュメント
整備と、既存のWrite Proposal Layer・MCP toolを実際に呼び出しての
クローズドループ実演（ManagementFeedbackの解決・AgentMessageでの
完了報告）が中心。

## Version20完了チェックリスト

- [x] `pnpm test` が全て緑（256件、Collaboration Runnerのテスト6件を含む）
- [x] `pnpm typecheck` がエラーゼロ
- [x] `pnpm lint` がエラーゼロ
- [x] `src/infrastructure/runner/collaborationRunner.ts`（機械的な新着検知・通知のみ、AI推論なし、ADR 0046）を実装済み
- [x] Collaboration Runnerのテスト（初回全件検知・2回目新着なし・3回目差分検知・ロック機構）を実装済み
- [x] `scripts/start-all.ps1`・`scripts/stop-all.ps1`を実装済み
- [x] `scripts/register-scheduled-tasks.ps1`を実装し、`ProjectARC-CollaborationRunner`タスクは実際に登録・実機確認済み（`Start-ScheduledTask`で手動発火、`LastTaskResult: 0`確認済み）
- [x] `ProjectARC-AutoStart`タスクをOwner自身が管理者権限のPowerShellから登録・`State: Ready`を実機確認済み（原因はWindows 11 Homeの管理者権限要件、ADR 0047で訂正済み）
- [x] ADR 0046（Runner v1スコープ）・ADR 0047（自動起動）を記録済み
- [x] `docs/setup/collaboration-runner.md`を作成済み
- [x] `docs/setup/chatgpt-mcp-connection.md`の「検証後は停止」記述を常時稼働運用向けに更新済み
- [x] `docs/handoff/archive/Version20_ARC_Brief.md`を作成済み（2件のAgentMessage原文を保管）
- [x] `docs/handoff/ARC_INBOX.md`に処理済みエントリを追記済み
- [x] README / docsに実装との乖離がない
- [x] AgentMessage（`direction: "ToARC"`、id `0662fae9-...`）で完了報告をProject ARCへ保存済み（Owner承認経由）
- [x] `docs/reports/Version20_Report.md` を生成済み（14章構成）
- [x] `docs/reports/Version20_ARC_Feedback.md`（ARCへのフィードバック）を生成済み

Version20のDoDは全項目達成済み。

## Version21完了チェックリスト

- [x] `pnpm test` が全て緑（276件、ApprovalDecision/ClassifyApprovalLevel/RecordApprovalDecision/ListApprovalDecisionsのテストとWriteProposalGatewayへの追加テストを含む）
- [x] `pnpm typecheck` がエラーゼロ
- [x] `pnpm lint` がエラーゼロ
- [x] 実装前にConstitution・ai-roles.md・関連ADR（0031/0039/0044/0045/0046）を確認し、Level分類表と例外一覧をPlan ModeでOwnerへ提示・承認済み
- [x] `signals`（6フラグ）から`ClassifyApprovalLevelUseCase`が機械的にLevel0/1/2を分類することを確認済み（signals未申告時のLevel1エスカレーション、複数signal時の最高Level採用を含む）
- [x] `WriteProposalGatewayUseCase`のcreate/approve/rejectが`ApprovalDecision`を正しいstageで記録することを確認済み（テスト・実機確認両方）
- [x] `approveProposal`がクライアントの`approvalLevel`詐称を無視し、`signals`からサーバー側で再計算することを確認済み（テストで検証）
- [x] `proposal_create`（signals付き）→`approval_decision_list`→`proposal_approve`→`approval_decision_list`の一連が実MCPクライアント経由（InMemoryTransport、実HTTPサーバー・実Connector経由）で正常動作することを確認済み
- [x] `GET /approval-decisions`・`POST /proposal/create`（signals付き）がHTTP経由の実リクエスト（`node -e fetch`、Bearer認証込み）で正常動作することを確認済み（検証用データは確認後に削除済み）
- [x] 既存の`agent_message_list`・`management_feedback_list`等が無変更で動作すること（回帰確認、MCP Tool一覧が10→11件になったこと含めテスト更新済み）
- [x] Owner確認の結果、指示書の2点（ARCによるProposal承認代行、Level2の暗号学的な迂回不能化）は実装せず、ADR 0048へ提案として記録
- [x] ADR 0048（Approval Policy Engineのスコープ）を記録済み
- [x] `docs/ai-roles.md`にApproval Policy Engineの位置づけを追記済み
- [x] `docs/setup/approval-policy.md`を作成済み
- [x] `docs/handoff/archive/Version21_ARC_Brief.md`を作成済み（AgentMessage原文を保管）
- [x] `docs/handoff/ARC_INBOX.md`に処理済みエントリを追記済み
- [x] README / docsに実装との乖離がない
- [x] `docs/reports/Version21_Report.md` を生成済み（14章構成）
- [x] `docs/reports/Version21_ARC_Feedback.md`（ARCへのフィードバック）を生成済み

Version21のDoDは全項目達成済み。

## Version22完了チェックリスト

- [x] `pnpm test` が全て緑（294件、`LocalOAuthProvider`単体テスト15件・
      `remoteServer.oauth.test.ts`のe2eテスト3件を含む）
- [x] `pnpm typecheck` がエラーゼロ
- [x] `pnpm lint` がエラーゼロ
- [x] 単一の権限表（`docs/authority-table.md`）を作成済み
- [x] 無認証Remote MCPの脅威モデル（`docs/security/
    remote-mcp-threat-model.md`）を作成済み——
      `management_feedback_resolve`がWrite Proposal Layerを経由しない
      直接書き込みであるという具体的な穴を発見・記録
- [x] 認証方式3案（Bearer静的トークン／自前OAuth 2.1／Cloudflare
      Access）を比較し、B（自前OAuth 2.1）を推奨（ADR 0049）
- [x] `LocalOAuthProvider`（DCR・PKCE・Passcodeゲート・token発行/検証/
      失効/revoke）を実装・単体テスト済み
- [x] `MCP_OAUTH_ENABLED`（既定false）で`remoteServer.ts`に配線——
      フラグOFF時は既存の`remoteServer.test.ts`が無変更でgreenのまま
      （回帰確認済み）
- [x] フラグON時、DCR→passcode認可→PKCE token交換→bearer保護された
      `/mcp`呼び出しの一連を実HTTPリクエスト（`remoteServer.oauth.
    test.ts`）で確認済み。無token・誤passcodeでの拒否も確認済み
- [x] Level1委譲案（`docs/proposals/level1-arc-approval-delegation.md`、
      `AgentDelegationGrant`設計・Constitution第4条改定文言案）を
      現行維持案と比較可能な形で提示——**実装はしていない**
- [x] 本番の`pnpm run mcp:remote`・ngrok/Cloudflareトンネル・`.env`には
      Version22時点で変更を加えていない（`MCP_OAUTH_ENABLED`は
      `.env.example`に追記のみ、実`.env`は無変更）
- [x] ADR 0049（Version22のスコープ・認証方式比較・推奨）を記録済み
- [x] `docs/setup/remote-mcp-oauth-migration.md`（未実施の移行手順・
      ロールバック手順）を作成済み
- [x] `docs/ai-roles.md`に権限表への参照リンクを追記済み
- [x] `docs/handoff/archive/Version22_ARC_Brief.md`を作成済み
- [x] `docs/handoff/ARC_INBOX.md`に処理済みエントリを追記済み
- [x] README / docsに実装との乖離がない
- [x] `docs/reports/Version22_Report.md`を生成済み（14章構成）
- [x] `docs/reports/Version22_ARC_Feedback.md`（次にOwnerが承認すべき
      事項を費用・リスク・具体的操作とともに列挙）を生成済み

Version22のDoDは全項目達成済み。

## Version23完了チェックリスト（設計・次Version計画のみ、コード実装なし）

- [x] Owner決定（AgentMessage `f81e9141-...`）を確認・解釈済み
- [x] 既存モデルとの重複調査を実施（`Reflection`/`ChallengeLog`で
      カバー可能な範囲、食事・栄養・体重・収入のギャップ、`StudyLog`
      未配線の発見を`docs/proposals/life-log-auto-save-delegation.md`
      3章に記録）
- [x] Constitution整合性の結論（改定不要）をADR 0050（ステータス
      「提案中」、Owner・ARC確認待ち）として記録
- [x] Level1委譲（Version22、未決定）との違いを`docs/proposals/
    level1-arc-approval-delegation.md`に相互参照として明記
- [x] Phase分割した次Version実装計画（`LifeLogAutoSaveGrant`設計、
      Phase 1: Reflection既存フィールド+ChallengeLog配線、Phase 2:
      食事/体重/収入の新フィールド）を提示
- [x] `pnpm test`/`typecheck`/`lint`：コード変更なしのため前Version
      （Version22、294件）から変化なしを確認
- [x] `docs/handoff/archive/Version23_ARC_Brief.md`を作成済み
- [x] `docs/handoff/ARC_INBOX.md`に処理済みエントリを追記済み
- [x] `docs/reports/Version23_Report.md`を生成済み（14章構成、
      コード実装なしの旨を明記）
- [x] `docs/reports/Version23_ARC_Feedback.md`（Owner・ARC確認事項
      3点を含む）を生成済み

Version23のDoDは「設計・次Version計画の提示」という本Versionの
スコープにおいて全項目達成済み。実装そのものはOwner・ARC確認後の
次Versionに持ち越し。

## Version24完了チェックリスト

- [x] `pnpm test` が全て緑（321件、`AgentDelegationGrant`単体テスト
      13件・`ManageAgentDelegationGrant`テスト6件・
      `WriteProposalGateway`への追加テスト7件を含む）
- [x] `pnpm typecheck` がエラーゼロ
- [x] `pnpm lint` がエラーゼロ
- [x] Constitution第4条を限定改定（`docs/constitution.md`、Plan Mode
      承認済みの文言をそのまま反映、ADR 0051）
- [x] `AgentDelegationGrant` Entity・状態機械（Active/Paused/Revoked、
      Revoked→resumeは例外で拒否）を実装・単体テスト済み
- [x] `ClassifyApprovalLevelUseCase`に型固定ルール（AgentDelegationGrant
      は常にLevel2）を追加
- [x] `WriteProposalGatewayUseCase`に自動承認ロジックを実装
      （Reflection・ChallengeLogのみ、Level2は対象外、
      AgentDelegationGrant自身は二重に対象外）
- [x] 重複防止：`approveProposal`が`autoApproved`済みProposalの再送を
      拒否することを実装・テスト済み
- [x] 監査ログ拡張：`ApprovalDecisionRecord.approver`
      （'Owner'|'auto-save'）を追加
- [x] 新規MCP Tool `agent_delegation_grant_list`（読み取り専用）・
      `GET /agent-delegation-grants`を追加
- [x] **実HTTPリクエストでの実機確認**：grant作成→Owner do承認→
      Reflection自動保存（`autoApproved: true`）→監査ログに
      `approver: 'auto-save'`記録→usageCount増加→重複approve拒否
      （400）→grant取消し（Revoked）→取消し後は自動保存が停止する
      ことを一連で確認済み。検証用データは確認後に削除済み
- [x] ADR 0051（Constitution改定の差分・効果・取消し方法、
      AgentDelegationGrant設計、OAuth本番有効化の記録）を作成済み
- [x] ADR 0050のステータスを「却下・ADR 0051に置き換え」へ更新
- [x] `docs/authority-table.md`・`docs/ai-roles.md`・`docs/security/
    remote-mcp-threat-model.md`・両`docs/proposals/*.md`を
      Version24の内容に合わせて更新済み
- [ ] **OAuth本番有効化**（`.env`への`MCP_OAUTH_ENABLED=true`・
      Passcode設定、本番サービス再起動）——Claude Codeの実行環境の
      安全機構によりブロックされ、**Owner自身の手作業として未実施**。
      設定内容・Passcodeはチャットで直接伝達済み、`docs/setup/
    remote-mcp-oauth-migration.md`に手順あり
- [ ] ChatGPT Connectorの再作成（OAuthモード）——上記完了後にOwner
      自身が実施
- [x] `docs/handoff/archive/Version24_ARC_Brief.md`を作成済み
- [x] `docs/handoff/ARC_INBOX.md`に処理済み（Owner操作待ち）エントリを
      追記済み
- [x] `docs/reports/Version24_Report.md`を生成済み（14章構成）
- [x] `docs/reports/Version24_ARC_Feedback.md`（Owner次の一手を明示）
      を生成済み

Version24のDoDは、Claude Codeが実行できる範囲（B・C・E、コード実装・
テスト・実機確認）で全項目達成済み。OAuth本番有効化（D）・ChatGPT
Connector再作成（F）はOwner自身の操作待ち。

## Version25完了チェックリスト

- [x] `pnpm test` が全て緑（372件、`MealLog`/`NutritionLog`/
      `WeightLog`/`FinanceLog`の単体テスト18件・
      `WriteProposalGateway`への追加テスト（承認時保存4件・
      自動承認4件・scope外拒否4件）を含む）
- [x] `pnpm typecheck` がエラーゼロ
- [x] `pnpm lint` がエラーゼロ
- [x] 4つの新規Entity（`MealLog`・`NutritionLog`・`WeightLog`・
      `FinanceLog`）を、Owner確認済みの記録粒度（食事単位・1計測
      1記録・取引単位）で実装・単体テスト済み
- [x] `NutritionLog`の`estimated`/`basis`/`confidence`または
      `uncertaintyNote`必須化を`create()`で構造的に検証・テスト済み
- [x] `AgentDelegationGrantScope`を6型に拡張、`AUTO_APPROVABLE_TYPES`
      に4型追加——Version24の型固定Level2ルール・重複防止・監査・
      default denyは無変更のまま適用されることをテストで確認
- [x] idempotencyKeyによる重複防止を4つの`AddXUseCase`全てに実装・
      テスト済み
- [x] Repository・UseCase・MCP Tool（`meal_log_list`・
      `nutrition_log_list`・`nutrition_summary_by_date`・
      `weight_log_list`・`finance_log_list`）・HTTP Route・
      永続化・型・バリデーションを配線済み
- [x] `limit`必須・最大100（既存ReadGateway方針）を4つのList UseCase
      全てに実装、date/category/mealType/type等の絞り込みを実装
- [x] **実HTTPリクエストでの実機確認**：grant作成（scope:
      MealLog）→承認→MealLog Proposal作成で`autoApproved: true`→
      重複approve拒否→`GET /meal-logs`で一覧確認→同一idempotencyKeyの
      再送でdeduped確認→`GET /agent-delegation-grants`でusageCount
      増加確認、の一連を確認済み。検証用データ・スクリプトは確認後に
      削除済み
- [x] 実機確認の過程で、`serializeApproveResult`（HTTP層）が新規4型の
      caseを欠いていた実装漏れを発見・修正済み（ADR 0052参照）
- [x] ADR 0052（4 Entity設計、scope拡張、二重管理境界、
      idempotencyKey設計思想、Timeline統合を見送った理由）を作成済み
- [x] `docs/authority-table.md`・`docs/proposals/
    life-log-auto-save-delegation.md`をVersion25の内容に合わせて
      更新済み
- [x] `README.md`をVersion22時点から現在（Version25）まで更新
      （Version23・24の未反映分を含む）
- [x] `docs/handoff/archive/Version25_ARC_Brief.md`を作成済み
- [x] `docs/handoff/ARC_INBOX.md`に処理済みエントリを追記済み
- [x] `docs/reports/Version25_Report.md`を生成済み（14章構成）
- [x] `docs/reports/Version25_ARC_Feedback.md`
      （tags: `mf:fb9ee72f-a144-4d65-88a5-f78a113c536c`・
      `version25`を含む）を生成済み
- [x] **訂正UseCase**——4 Entityすべてで元記録を上書きせず、
      `correctionOfId`と`correctionReason`を持つ新記録を追加する。
      訂正履歴・元記録保持・不完全な訂正情報の拒否をテスト済み
- [ ] **削除UseCase**——不可逆操作のため未実装。Ownerの明示承認後に扱う
- [ ] **OAuth本番有効化・Timeline横断統合・日次代表値（体重）**——
      指示書が明示的に対象外・条件付き要件としたため未実装

Version25のDoDは、4 Entity・Repository・UseCase・訂正履歴・MCP・HTTP・
自動保存境界拡張・重複防止・推定値区別・テスト・ADR・Reportで達成済み。
削除UseCaseとOAuth関連作業は、承認境界を越えないよう未実装。

## Version26完了チェックリスト

- [x] `pnpm test` が全て緑（478件、CheckIn/DistractionSignal/
      Intervention/InterventionPolicySettingsの単体テスト48件・
      GenerateInterventionsルールエンジンのテスト18件・
      RespondToIntervention/ListInterventions/
      MeasureInterventionEffectiveness/InterventionPolicySettingsの
      テスト14件・GetDailyBehaviorScoreのテスト5件・checkInPrompter
      のテスト4件・WriteProposalGatewayへの追加テストを含む）
- [x] `pnpm typecheck` がエラーゼロ
- [x] `pnpm lint` がエラーゼロ
- [x] 4つの新規Entity（`CheckIn`・`DistractionSignal`・
      `Intervention`・`InterventionPolicySettings`）を実装・
      単体テスト済み
- [x] `CheckIn`の「未達3点セット」（missedReason/correctiveAction/
      resumeAt）を`create()`で構造的に必須化・テスト済み
- [x] `DistractionSignal`の`confidence`/`basis`常時必須化・テスト済み
- [x] `Intervention`の状態機械（Pending/Acknowledged/Dismissed/
      Snoozed、`wakeIfDue`の機械的な日時比較）を実装・テスト済み
- [x] 決定的ルールエンジン（`GenerateInterventionsUseCase`、5ルール：
      overdue-checkin/distraction-cluster/missed-goal-no-restart/
      library-no-timer/scheduled-task-not-started）を実装、quiet
      hours・除外ウィンドウ・dedup・却下クールダウン・1日上限を
      含めてテスト済み
- [x] `AgentDelegationGrantScope`を8型に拡張（CheckIn・
      DistractionSignal追加）、`AUTO_APPROVABLE_TYPES`にも追加
- [x] `InterventionPolicySettings`を型固定Level2ルール・
      自動承認対象外の二重ロックで保護（`AgentDelegationGrant`と
      同格の安全境界）
- [x] `Intervention`自体はProposalTypeにしない設計とし、
      Remote MCP/HTTPに新しい書き込み可能エンドポイントを追加して
      いないことをテストで確認済み（ADR 0053、Version22脅威モデルの
      教訓を踏まえた判断）
- [x] `GetDailyBehaviorScoreUseCase`：既存`Reflection.score()`を
      変更せず、80点基準（`IDEAL_LIFE_SCORE_BASELINE`定数）・
      前日比・7日/30日比較（データ不足時は`available: false`で
      明示）を実装・テスト済み
- [x] `checkInPrompter.ts`（新規スクリプト、`pnpm run
      checkin-runner`）を実装・テスト済み。
      `scripts/register-scheduled-tasks.ps1`に3つ目のタスクブロック
      を追記済み（**実際のタスク登録はOwner確認後**）
- [x] **実HTTPリクエストでの実機確認**：grant作成（scope:
      DistractionSignal, CheckIn）→3件のDistractionSignal自動保存→
      checkInPrompter相当のロジック実行でdistraction-cluster
      Intervention（Warning）生成確認→`GET /interventions`で
      Pending確認→InterventionResponse Proposal（dismiss、Owner
      do必須）→再実行でdismissクールダウンによる抑制確認→
      `GET /daily-behavior-score`でinterventionPenalty=0確認→
      CheckIn/InterventionPolicySettingsのレスポンス本体確認→
      `/interventions/generate`等の書き込み可能ルートが存在しない
      （404）ことを確認、の一連を確認済み。検証用スクリプト・
      隔離データディレクトリは確認後に削除済み
- [x] ADR 0053（Article 2との緊張の解消、セキュリティ判断の根拠、
      4 Entity設計、Intervention非Proposal化の理由）を作成済み
- [x] Screen Time/Opal連携の実現可能性調査
      （`docs/operations/screen-time-integration-feasibility.md`）
      を作成済み——実装ではなく調査のみ（指示書6章の要求通り）
- [x] `docs/authority-table.md`をVersion26の内容に合わせて更新済み
- [ ] **Screen Time/Opal/YouTube/SNSの実連携**——調査のみに留め、
      実装は次Version以降（iOS制約上、直接取得不能）
- [ ] **`InterventionResponse`の自動承認・`intervention_generate`の
      MCP Tool化**——Owner確認前に自動化範囲を広げない判断のため
      未実装、次Version確認事項として明示
- [ ] **新規スケジュールタスクの実際の登録**——スクリプトは実装・
      テスト済みだが、`register-scheduled-tasks.ps1`の実行
      （Owner機への実登録）はOwner確認後に行う
- [ ] **実際の効果測定値**——`MeasureInterventionEffectivenessUseCase`
      は実装・合成データでテスト済みだが、実データによる測定は
      実運用の蓄積が前提

Version26のDoDは、指示書が明示的に要求した範囲（4 Entity・
Repository・UseCase・決定的ルールエンジン・MCP・HTTP・自動保存境界
拡張・重複防止・推定値区別・テスト・ADR・Report・フィージビリティ
調査）で全項目達成済み。実連携・自動承認範囲の拡大・タスク登録・実効果
測定は、指示書の明示的なスコープ外またはOwner確認が必要な事項として
次Version以降へ持ち越し。

## Version27完了チェックリスト

- [x] `pnpm test` が全て緑（504件、`StudySession`単体テスト9件・
      `RecordStudySessionUseCase`/`SummarizeStudySessionsUseCase`の
      テスト6件・`server.ts`のHTTPテスト4件・`remoteServer.ts`の
      Study Session Ingestion専用テスト8件を含む）
- [x] `pnpm typecheck` がエラーゼロ
- [x] `pnpm lint` がエラーゼロ
- [x] `StudySession` Entity（`sessionId`/`subject`/`task`/`startedAt`/
      `endedAt`/`durationMs`/`source`/`clientCreatedAt`、12時間の
      最大duration・5分のクロックスキュー許容付き未来時刻拒否・
      欠損値拒否）を実装・単体テスト済み
- [x] `RecordStudySessionUseCase`：`sessionId`による冪等化
      （Version25のidempotencyKey方式と同型）を実装・テスト済み
- [x] `SummarizeStudySessionsUseCase`：`[from, to)`範囲での
      科目別・合計duration集計を実装・テスト済み
- [x] `server.ts`（ARC Connector HTTP API、port 3939、127.0.0.1限定）に
      `POST /api/study-sessions`・`GET /api/study-sessions/summary`を
      追加——既存の`ARC_API_KEY`ゲートの対象内
- [x] `Connector`に`recordStudySession`・`summarizeStudySessions`を
      追加（既存のRead/Write系メソッドと同型）
- [x] `remoteServer.ts`（Remote MCP、port 3940、公開トンネル側）に
      `studySessionRoute.ts`を追加——専用の`STUDY_TIMER_API_TOKEN`
      （未設定なら常に401、fail-closed）・CORS許可オリジン
      （`STUDY_TIMER_ALLOWED_ORIGINS`）による独立した認証境界を
      経由し、Connector経由で`server.ts`へ内部転送する（ADR 0054）
- [x] `/mcp`のOAuth有無（`MCP_OAUTH_ENABLED`）と独立して
      `/api/study-sessions`系ルートが機能することをテスト済み
      （oauth未設定・oauth設定済みの両分岐に配線）
- [x] **実HTTPリクエストでの実機確認**：`server.test.ts`・
      `remoteServer.studySession.test.ts`の両方で、実際の
      `node:http`サーバー（`createApp`/`createRemoteMcpApp`）に対して
      実際の`fetch`リクエストを送り、以下を確認済み——
      無token/誤token拒否（401）、正しいtokenでの新規保存（201）・
      同一`sessionId`再送時のdedup（200、`duplicate:true`）、
      不正レコードの拒否（400）、期間集計、許可オリジンのみへの
      CORSヘッダー付与、OPTIONSプリフライトの無認証応答、
      `/mcp`が本機能追加の影響を受けず無認証のまま動作すること、
      token未設定時は全リクエストが401になること（Version7以降の
      HTTP API検証方針により、対話式CLIのような別途の実機確認手順は
      不要——実サーバー・実`fetch`によるテストがそのまま実機確認を
      兼ねる）
- [x] MCP Tool一覧が23件のまま変化しないことを確認済み——この機能に
      対応するMCP Toolは意図的に追加していない（ARC自身はこの経路を
      呼び出す手段を持たない、指示書「他種別への汎用書き込みには
      使えない」要件）
- [x] `.env.example`に`STUDY_TIMER_API_TOKEN`・
      `STUDY_TIMER_ALLOWED_ORIGINS`を追記済み
- [x] ADR 0054（プロセス配置の判断・fail-closed認証の設計理由・
      書き込み経路を増やさない既存方針との関係・検討した代替案）を
      作成済み
- [x] `docs/handoff/archive/Version27_ARC_Brief.md`を作成済み
- [x] `docs/handoff/ARC_INBOX.md`に処理済みエントリを追記済み
- [x] README / docsに実装との乖離がない
- [x] `docs/reports/Version27_Report.md`を生成済み（14章構成）
- [x] `docs/reports/Version27_ARC_Feedback.md`を生成済み
- [ ] **実際のngrokトンネル経由・実タイマーアプリからの疎通確認**——
      Claude Codeの実行環境では外部ネットワーク・実デバイスからの
      到達を検証できないため対象外。Owner自身が`STUDY_TIMER_API_TOKEN`
      を`.env`へ設定し、タイマーアプリ側にBearer tokenを渡した上での
      実地確認が必要（OAuth本番有効化と同様、秘密情報の設定を伴うため
      Claude Codeの実行環境の安全機構によりブロックされる）

Version27のDoDは、Claude Codeが実行できる範囲（Entity・UseCase・
HTTP・Connector・Remote MCP転送・テスト・ADR・Report）で全項目
達成済み。`STUDY_TIMER_API_TOKEN`の実運用設定と実タイマーアプリからの
疎通確認はOwner自身の操作待ち。

## Version28完了チェックリスト

- [x] 読み取り専用MCP Tool `capability_registry_get`を実装
- [x] `schemaVersion`・`projectVersion`・`buildCommit`・`toolCount`・
      `toolNames`・`proposalTypes`を返す
- [x] `MCP_TOOL_NAMES`を24 Toolの単一正本として定義
- [x] `PROPOSAL_TYPES`を再利用し、Proposal型の二重定義を回避
- [x] stdio・Remote MCPが同じRegistryを提供
- [x] MCP `tools/list`とRegistry一覧の完全一致をテスト化
- [x] Remote MCPテストの期待値を24 Toolへ更新
- [x] TypeScript typecheck合格
- [x] Version28変更ファイルのESLint合格
- [x] 実stdio MCP Clientで24 Tool・16 Proposal型・build commitを確認
- [x] ADR 0055、Version28 Report、ARC向けFeedbackを作成
- [x] README・roadmapをVersion28完了状態へ更新
- [x] 認証、外部公開範囲、秘密情報、書き込み経路、Constitution/
      Principlesを変更していない

Codex隔離環境ではesbuildがリポジトリ親ディレクトリを読めずVitest設定
ロード前に停止したため、実装時点では`pnpm test`自体を検証できなかった
（実MCP Client・typecheck・lintは合格）。Claude Code側の別セッション
で改めて`pnpm test`を実行した結果、505件全て緑（Version27完了時点504
件から+1件）であることを確認済み。

Version28のDoDは全項目達成済み。

## Version29完了チェックリスト

- [x] 両Runnerを共通`executeControlledRun()`へ接続
- [x] 成功・失敗・ロックスキップ・kill switch停止を状態記録
- [x] projectVersion・buildCommitをRunner状態へ保存
- [x] Runner別状態ファイルで同時実行の上書き競合を回避
- [x] 既存Runner別lock/logパスを維持
- [x] `pnpm runner-control status|disable|enable`を実装
- [x] Windowsで既存Runnerが無処理終了していた`isMainModule`を修正
- [x] Control Plane・CLI・kill switchのテストを追加
- [x] typecheck・ESLint合格、実CLI status確認済み
- [x] ADR 0056、運用手順、Report、ARC向けFeedbackを作成
- [x] `.claude/`、認証、外部公開、本番タスク、秘密情報を変更していない
- [ ] 全Vitest——当該Codex隔離環境では設定ロード前に停止。コミット可能な
      別セッションで全件合格を確認してから完了報告を保存する

Version29完了後、`pnpm test`は別セッションで573件（Version34時点）まで
全件緑を確認済み。Version30〜34の完了チェックリストは、本ファイルへの
逐次追記ではなく各`docs/developer-feedback/VersionN_Developer_
Feedback.md`の「完了宣言」セクションに記録する運用へ移行した
（ARC-PM-006「Roadmap/README/DoD/Reportsの重複・矛盾」を踏まえ、
正本を分散させないための判断）。本ファイルはVersion1〜29の履歴と
DoD基準そのものの定義を保持する。

## Version35完了チェックリスト

- [x] `pnpm test` が全て緑（602件、`IngressRecord`単体テスト11件・
      `MobileIngress`（Application層）テスト7件・`mobileIngress.ts`
      HTTPサーバーテスト5件・`mobileSync.ts` CLIテスト4件・Bridge
      Layer拡張テスト2件を含む）
- [x] `pnpm typecheck` がエラーゼロ
- [x] `pnpm lint` がエラーゼロ
- [x] `IngressRecord` Entity（`Accepted/Canonicalized/Pending/Failed/
      Discarded`状態機械、circuit breaker）を実装・単体テスト済み
- [x] `pnpm mobile-ingress`（受信サーバー、127.0.0.1限定）・
      `pnpm mobile-sync`（sync/list/resolve/retry CLI）を実装・
      実機確認済み
- [x] Bridge Layer（Import/Export）をMealLog/NutritionLog/
      WeightLog/FinanceLog/StudySessionへ拡張済み
- [x] **実機確認**：受信→idempotent再送→sync→競合検出→Owner解決
      （accept/discard）→backup自動対象化の一連をコマンドラインから
      確認済み
- [x] `serializeIngressRecord`未使用による private field漏洩バグを
      実機確認で発見・修正済み
- [x] ADR 0064（Program B Architecture Gate）・ADR 0065（Mobile
      Ingressデータ契約）を作成済み
- [x] `docs/security/remote-mcp-threat-model.md`8章を追加済み
- [x] README / docsに実装との乖離がない
- [x] `docs/reports/Version35_Report.md`を生成済み（14章構成）
- [x] `docs/developer-feedback/Version35_Developer_Feedback.md`を生成済み
- [x] `docs/project-management/Version35_Decision_Packet.md`
      （Owner向け判断事項の集約）を生成済み
- [x] クラウド契約・課金・本番公開・秘密情報設定は一切実施していない

Version35のDoDは全項目達成済み。

## Version36完了チェックリスト

- [x] `pnpm test` が全て緑（603件、`GET /`のHTMLレスポンステスト1件を含む）
- [x] `pnpm typecheck` がエラーゼロ
- [x] `pnpm lint` がエラーゼロ
- [x] Quick Capture HTML UI（`GET /`、既存`POST /ingress`を呼ぶ薄い
      クライアント）を実装・実機確認済み
- [x] `MOBILE_INGRESS_HOST`/`MOBILE_INGRESS_PORT`をzodスキーマ化し
      `loadEnv()`経由に統一（`.env`未読み込みの実装漏れを実装中に
      発見・修正）
- [x] `scripts/start-all.ps1`・`stop-all.ps1`・
      `register-scheduled-tasks.ps1`にMobile Ingress起動・
      `ProjectARC-MobileSync`定期タスク（15分間隔）を追加
      （Windows機での実行・登録確認はOwner自身が行う）
- [x] **実機確認**：グローバルインストール済みPlaywright（プロジェクト
      依存には追加せず）のヘッドレスブラウザで実際にQuick Capture
      フォームを送信し、`GET /ingress`での反映を確認。検証用
      スクリプト・データは確認後に削除済み
- [x] LAN公開（`MOBILE_INGRESS_HOST`変更）は既定値のまま維持し、
      有効化はOwner確認事項として`Version35_Decision_Packet.md`へ
      集約（実施していない）
- [x] `docs/security/remote-mcp-threat-model.md`9章を追加、8.1の
      不正確な記述を訂正済み
- [x] README / docsに実装との乖離がない
- [x] `docs/reports/Version36_Report.md`を生成済み（14章構成）
- [x] `docs/developer-feedback/Version36_Developer_Feedback.md`を生成済み
- [x] クラウド契約・課金・本番公開・秘密情報設定は一切実施していない

Version36のDoDは全項目達成済み。

## Version37完了チェックリスト

- [x] `pnpm test` が全て緑（626件、Mobile Ingress認証/rate limit/
      body size/監査ログ/read契約テスト・`validateExposureConfig`
      単体テスト・`ImportPendingLifeLogsUseCase`テスト・CLIテストを
      含む）
- [x] `pnpm typecheck` がエラーゼロ
- [x] `pnpm lint` がエラーゼロ
- [x] fail-closed起動ガード（`validateExposureConfig`）を実装・
      実機確認済み（`MOBILE_INGRESS_HOST`変更+token未設定で起動時
      エラー終了を確認）
- [x] Bearer token認証・rate limit（30req/分/IP）・入力上限
      （64KB）・監査ログ（token値は記録しない）を実装・実機確認済み
- [x] `ImportPendingLifeLogsUseCase`・`pnpm import-pending-logs`を
      実装。未対応typeは`unsupported_type`として明示報告（既存型へ
      推測マッピングしない）。全テストはプレースホルダーの合成
      データのみ使用、実データは一切含めていない
- [x] Cloud Adapter境界を既存`IngressRecordRepository`の再利用として
      整理（新規抽象なし）。`cloudflare/`参照専用ディレクトリ
      （ビルド・テスト対象外）を追加
- [x] `GET /ingress?idempotencyKey=`によるスマホ側read契約、Quick
      Capture UIのMealLog/WeightLog/FinanceLog対応を実装
- [x] ADR 0066（セキュリティ強化）・0067（JSONL Import形式）・
      0068（Cloud Adapter境界）を作成済み
- [x] `docs/security/remote-mcp-threat-model.md`10章を追加、9.2の
      記述を訂正済み
- [x] README / docsに実装との乖離がない
- [x] `docs/reports/Version37_Report.md`を生成済み（14章構成）
- [x] `docs/developer-feedback/Version37_Developer_Feedback.md`を生成済み
- [x] `docs/project-management/Version37_Decision_Packet.md`
      （Cloud Activation手作業・無料枠・rollback、1枚）を生成済み
- [x] クラウド契約・課金・本番公開・秘密情報設定は一切実施していない

Version37のDoDは全項目達成済み。

## Version38完了チェックリスト

- [x] `pnpm test` が全て緑（640件、最小権限GET・NutritionLog・
      PullCloudIngress・HttpCloudIngressClient・pull設定確認テストを
      含む）
- [x] `pnpm cloudflare:test` が全て緑（14件、Miniflare実機、別ゲート）
- [x] `pnpm typecheck` / `pnpm cloudflare:typecheck` がエラーゼロ
- [x] `pnpm lint` がエラーゼロ
- [x] Cloudflare Worker実装（`cloudflare/src/worker.ts`・
      `kvIngressRecordRepository.ts`）をMiniflareで実機検証済み
      （アカウント・ログイン・デプロイなし）
- [x] 二段階token（DEVICE_TOKEN／PULL_TOKEN）による最小権限read
      契約を実装・実機確認済み。ローカル版`mobileIngress.ts`にも
      同じ最小権限ルールを適用
- [x] `pnpm mobile-sync pull`（`PullCloudIngressUseCase`・
      `HttpCloudIngressClient`）を実装・テスト済み。idempotency・
      部分失敗の区別（`failed`/`pulled-ack-failed`）・retention
      （ack）を検証済み
- [x] **実機確認**：Miniflareで起動した実Workerと実
      `pnpm mobile-sync pull`/`sync`を繋いだ手動end-to-end確認
      （送信→pull→sync→Canonicalize、既存の競合検出がcloud経由でも
      機能することを確認）
- [x] NutritionLogのQuick Capture対応を実装・実機確認済み
      （`mealLogId`手入力、自動推測なし）
- [x] 無関係な既存バグ（Check-In Prompterの時刻依存フレーキテスト）
      を発見・修正済み
- [x] ADR 0069（Cloud Worker実装・Pull/Reconciliation・最小権限
      read契約）を作成済み
- [x] `docs/security/remote-mcp-threat-model.md`11章を追加済み
- [x] README / docsに実装との乖離がない
- [x] `docs/reports/Version38_Report.md`を生成済み（14章構成）
- [x] `docs/developer-feedback/Version38_Developer_Feedback.md`を生成済み
- [x] `docs/project-management/Version38_Activation_Packet.md`
      （実デプロイの1ページ実行チェックリスト）を生成済み
- [x] クラウド契約・課金・本番公開・秘密情報設定・認証済みLAN公開の
      有効化は一切実施していない

Version38のDoDは全項目達成済み。

## Version39完了チェックリスト

- [x] `pnpm test` が全て緑（642件、CSPヘッダー・token非埋め込み
      テストを含む）
- [x] `pnpm cloudflare:test` が全て緑（17件、Miniflare実機、
      CSP/nonce・token非埋め込み・5type網羅テストを含む、別ゲート）
- [x] `pnpm typecheck` / `pnpm cloudflare:typecheck` がエラーゼロ
- [x] `pnpm lint` がエラーゼロ
- [x] `pnpm cloudflare:preflight`（新設）を実行し、READY/NOT READY
      判定を確認（アカウント操作は一切実行していない）
- [x] Cloud Quick Capture UI（`cloudflare/src/worker.ts`の`GET /`、
      ローカル版と共通の`renderQuickCaptureHtml`モジュール）を実装・
      Miniflareで実機検証済み
- [x] Reflection/MealLog/NutritionLog/WeightLog/FinanceLogを明示
      選択でき、型からの自動推測・自動生成を行わないことを実機確認
- [x] DEVICE_TOKEN/PULL_TOKENをHTML/JS/URL query/ログへ一切埋め込ま
      ないことをテスト・実機確認。既定非永続・opt-in・危険性表示・
      消去操作を実装
- [x] CSP（per-request nonce、`'unsafe-inline'`不使用）・token
      非漏洩・5type網羅の否定テストを追加
- [x] idempotencyKeyの再送再利用・オフライン時の入力内容保持を
      Playwrightのネットワーク断シミュレーションで実機確認
- [x] **実機確認**：Playwrightヘッドレスブラウザでローカル版・
      cloud版（Miniflare）両方のQuick Capture UIを実際に操作し、
      CSP・token・オフライン再送を確認。この過程で2件の実装バグ
      （CSP inline-style属性ブロック、非表示fieldset内`required`
      によるフォーム全体ブロック）を発見・修正済み
- [x] 「PC-off保存」を(a)cloud ingress受付・(b)canonical ARC確定・
      (c)read availabilityへ分解したCapability/Gap表を作成し、
      Version39時点でも(b)(c)が未達であることを明示（ADR 0070）
- [x] Canonical Store所在（cloud全面移行・現行Transport-queue案・
      hybrid案）を6軸で比較するADR 0071を作成。**実際の移行は
      行っていない**
- [x] ARC-PM-005（`pnpm build`のTS2742失敗）が本Versionの変更と
      無関係であることを`git stash`比較で再確認
- [x] ADR 0070（Cloud Quick Capture UI・Capability/Gap表）・
      ADR 0071（Canonical Store所在比較）を作成済み
- [x] `docs/security/remote-mcp-threat-model.md`12章を追加済み
- [x] README / docsに実装との乖離がない
- [x] `docs/reports/Version39_Report.md`を生成済み（14章構成）
- [x] `docs/developer-feedback/Version39_Developer_Feedback.md`を生成済み
- [x] `Version38_Activation_Packet.md`をVersion39のQuick Capture UI
      分で更新済み
- [x] `docs/handoff/LATEST_ARC_FEEDBACK.md`のポインタを
      `Version39_Developer_Feedback.md`へ更新済み
- [x] クラウド契約・課金・本番公開・秘密情報設定・認証済みLAN公開の
      有効化・Canonical Storeの実移行は一切実施していない

Version39のDoDは全項目達成済み。

## Version40完了チェックリスト

- [x] `pnpm test` が全て緑（660件、92 test files、InProgressStudySession・
      StudySession lifecycle・capabilityRegistry・WriteProposalGateway
      保存信頼性契約の新規テストを含む）
- [x] `pnpm typecheck` / `pnpm lint` がエラーゼロ
- [x] AgentDelegationGrantScope・AUTO_APPROVABLE_TYPESへAppearance・
      ManagementFeedbackを追加し、FinanceLogを除外した（型システム
      レベル＋ClassifyApprovalLevelの型固定Level2ルールの二重の
      安全装置）
- [x] 新規`*_create`MCP Toolは追加せず、既存`proposal_create`の
      auto-approve機構を拡張しただけであることをADR 0072に明記
- [x] `createProposal`/`approveProposal`にread-after-write検証を
      実装し、`saved`/`verified`/`retryQueueId`/`saveError`を返す
      ことをテストで確認（保存失敗時にGrantのusageCountを消費しない
      ことも確認済み）
- [x] StudySession対話型ライフサイクル6ツール
      （create/update/finish/list、summary by date/period）を実装。
      実MCP clientで実機確認済み（検証用スクリプトは削除済み）
- [x] `capability_registry_get`に`environment`
      （cwd/dataDirectory/dataFileCount/processStartedAt/
      processUptimeSeconds）を追加。`PROJECT_ARC_VERSION`を
      34→40へ更新
- [x] `scripts/mirror-agent-messages.mjs`を実装・実機確認済み
      （合成テストデータで転記・重複防止まで確認、確認後に
      `ARC_INBOX.md`は`git checkout`で元へ戻した）
- [x] ARC-PM-005（`pnpm build`のTS2742失敗）が本Versionの変更と
      無関係であることを`git stash`比較で再確認
- [x] ADR 0072（AgentDelegationGrant scope拡張・保存信頼性契約・
      StudySession直接書き込みツール）を作成済み
- [x] `docs/security/remote-mcp-threat-model.md`13章を追加済み
- [x] README / docsに実装との乖離がない
- [x] `docs/reports/Version40_Report.md`を生成済み（14章構成）
- [x] `docs/developer-feedback/Version40_Developer_Feedback.md`を生成済み
- [x] `docs/handoff/archive/Version40_ARC_Brief.md`の対応結果を更新済み
- [x] 実際のAgentDelegationGrant発行・Constitution/Principles変更・
      クラウド契約・課金・本番公開・秘密情報設定は一切実施していない

Version40のDoDは全項目達成済み。

## Version41完了チェックリスト

- [x] `pnpm test` が全て緑（661件、92 test files、Memory型のGrant
      自動承認テストを含む）
- [x] `pnpm typecheck` / `pnpm lint` がエラーゼロ
- [x] AgentDelegationGrantScope・AUTO_APPROVABLE_TYPESへMemoryを
      追加（Owner本人のチャット内明示指示に基づく）
- [x] `verifyPersisted`にMemory用read-after-write検証を追加
- [x] ADR 0073（Memory scope自動承認を追加した理由）を作成済み
- [x] ARC-PM-005が本Versionの変更と無関係であることを`git stash`
      比較で再確認
- [x] `docs/reports/Version41_Report.md`を生成済み（14章構成）
- [x] `docs/developer-feedback/Version41_Developer_Feedback.md`を生成済み
- [x] 実際のAgentDelegationGrant発行・Constitution/Principles変更は
      一切実施していない

Version41のDoDは全項目達成済み。

## Version42完了チェックリスト

- [x] `pnpm test` が全て緑（675件、94 test files、Notion Transport
      統合の新規テストを含む）
- [x] `pnpm typecheck` / `pnpm lint` がエラーゼロ
- [x] `NotionClient`ポート（Application層）＋`HttpNotionClient`実装
      （Infrastructure層）を追加
- [x] `PullNotionEntriesUseCase`を追加（`PullCloudIngressUseCase`と
      同型、既存の`ReceiveIngressRecordUseCase`をそのまま再利用）
- [x] `pnpm mobile-sync notion-pull`サブコマンドを追加
- [x] `NOTION_API_KEY`/`NOTION_DATABASE_ID`環境変数を追加
      （未設定ならopt-inで無効のまま、既存の`CLOUD_INGRESS_*`と同型）
- [x] ADR 0075（ADR 0074「見送った案」の一部撤回、Notion Transport
      統合の設計）を作成済み
- [x] `HttpNotionClient`はfake serverでの契約テストのみ
      （`api.notion.com`への直接到達性が本サンドボックスにないことを
      実機確認済み）——実際のNotion APIとの疎通はOwner環境での実機
      確認が必要
- [x] ARC-PM-005が本Versionの変更と無関係であることを`git stash`
      比較で再確認
- [x] `docs/reports/Version42_Report.md`を生成済み
- [x] `docs/developer-feedback/Version42_Developer_Feedback.md`を生成済み

Version42のDoDは全項目達成済み。Notion側データベースの実作成・
Internal Integration Tokenの発行・`notion-pull`の実機確認はOwner
作業として残っている（`docs/project-management/STATUS.md`「停止中
タスク」参照）。
