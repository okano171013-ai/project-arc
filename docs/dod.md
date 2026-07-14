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
