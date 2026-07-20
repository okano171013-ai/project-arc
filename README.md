# Project ARC

AIを用いた個人用ライフマネジメントシステム。「第二の脳」「人生OS」を
目指すプロジェクト。単なるログ収集ツールではなく、**日々の意思決定を
改善すること**を目的とする（`docs/vision.md`参照）。

## 思想ドキュメント

コードを読む前に、まず以下を読むことを推奨します。

- [`docs/constitution.md`](./docs/constitution.md) — ARC
  Constitution（最も基礎的な7条文、2026年7月Owner承認）
- [`docs/vision.md`](./docs/vision.md) — Core Mission / Vision
- [`docs/principles.md`](./docs/principles.md) — 意思決定の基本原則
- [`docs/ai-roles.md`](./docs/ai-roles.md) — 人間・ARC・Gemini・Claude Code・
  システム自体の責務分担
- [`docs/architecture.md`](./docs/architecture.md) — 技術設計
- [`docs/roadmap.md`](./docs/roadmap.md) — Version1〜20のロードマップ・
  長期ロードマップ2.0
- [`docs/dod.md`](./docs/dod.md) — Definition of Done（完成の定義）
- [`docs/adr/`](./docs/adr) — 個別の設計判断とその根拠
- [`docs/HISTORY.md`](./docs/HISTORY.md) — Version1〜9の全履歴まとめ

## Version29のスコープ（現在地）

テーマ：「Runner Control Plane」— Collaboration RunnerとCheck-In Runnerの
実行状態、build、ロック、kill switchを共通管理する。詳細はADR 0056・
[`docs/reports/Version29_Report.md`](./docs/reports/Version29_Report.md)参照。

- `pnpm runner-control status|disable|enable`
- Runner別の成功・失敗・重複スキップ・停止状態
- Version28 Registry由来のbuild commit記録
- WindowsでRunnerが無処理終了していた既存エントリ判定不具合を修正
- 自動再起動・強制終了・本番設定変更は行わない

### 旧Version28のスコープ：「Remote MCP Capability Registry」

テーマ：「Remote MCP Capability Registry」— ChatGPTの既存チャットや
長寿命MCPプロセスが古いTool定義を保持した場合に、接続先の版と機能を
機械的に判別できる読み取り専用Registryを追加した。詳細はADR 0055・
[`docs/reports/Version28_Report.md`](./docs/reports/Version28_Report.md)参照。

- **`capability_registry_get`** — `schemaVersion`、Project ARC Version、
  起動中の`buildCommit`、`toolCount`・`toolNames`、`proposalTypes`を返す
- **24 Toolの単一正本** — Registryの一覧と実際の`tools/list`が完全一致
  することを統合テストで保証し、Tool追加時の一覧更新漏れを検出
- **stdio・Remote MCP共通** — 両接続が同じ`buildMcpServer()`を利用する
  既存設計を維持し、公開面や書き込み経路は増やさない
- **診断専用** — commit hashやTool一覧を認可判断には使用しない

### 旧Version27のスコープ：「Study Session Ingestion」

テーマ：「Study Session Ingestion」— ARC Study Timer（Owner本人が
使う外部の学習タイマーアプリ）から学習セッションログを受信・保存する
専用HTTPS APIの実装依頼（AgentMessage `9ea53178-...`、Version21完了後
に届いていたが見落とされ、今回のセッションで発見・実装）。詳細はADR
0054・[`docs/reports/Version27_Report.md`](./docs/reports/Version27_Report.md)参照。

- **`StudySession` Entity** — `sessionId`による冪等化、12時間の最大
  duration、5分のクロックスキュー許容付き未来時刻拒否
- **公開エンドポイントは`remoteServer.ts`側**（`server.ts`は
  127.0.0.1限定でトンネルされないため）——実際のUseCase/Repositoryは
  既存慣習どおり`server.ts`に実装し、`remoteServer.ts`は既存の
  `Connector`経由で内部転送する薄い層のみを追加（ADR 0038の
  「Connectorのみに依存する」原則を踏襲）
- **専用のfail-closed認証**（`STUDY_TIMER_API_TOKEN`）——`ARC_API_KEY`
  とは独立した秘密情報。未設定時は無認証で開く既存の`ARC_API_KEY`とは
  逆に、常に401を返す（公開トンネル上に常駐するエンドポイントのため）
- **CORS許可オリジン**（`STUDY_TIMER_ALLOWED_ORIGINS`）を環境変数で
  制限。未設定ならブラウザからのクロスオリジンは常に拒否
- **Version27ではMCP Toolを意図的に追加しなかった**（当時23件、
  Version28の診断Tool追加後は24件）——ARC自身はこの経路
  を呼び出す手段を持たず、「既存Proposal承認経路とは別の、汎用書き込み
  に使えない専用経路」という指示書要件を構造的に満たす

### 旧Version26のスコープ：「行動介入レイヤーと厳格コーチング」

テーマ：「行動介入レイヤー」— 先延ばし・重要課題からの逃避・過剰な
スマホ利用を早期検知し行動修正を促す仕組みを求めた、Owner本人発信の
正式指示（AgentMessage `31dcb191-...`）。詳細はADR 0053・
[`docs/reports/Version26_Report.md`](./docs/reports/Version26_Report.md)参照。

- **4つの新規Entity**（`CheckIn`・`DistractionSignal`・
  `Intervention`・`InterventionPolicySettings`）— 2時間ごとの行動
  確認、逃避候補シグナル（`confidence`/`basis`常時必須）、
  Pending/Acknowledged/Dismissed/Snoozedの状態機械、quiet hours等の
  ポリシー設定
- **決定的ルールエンジン**（`GenerateInterventionsUseCase`）— 5ルール
  を構造化フィールドへの閾値・日時比較のみで評価。quiet hours・
  dedup・却下クールダウン・1日上限を遵守
- **セキュリティ判断**：Interventionの生成をMCP Tool化・HTTP Route化
  しない設計とした——Version22の脅威モデルが指摘した「Proposal Layer
  非経由の直接書き込み」の穴を新規に増やさないため。Owner本人の
  マシン上のスクリプト（`checkInPrompter.ts`）が直接呼ぶ
- **`AgentDelegationGrant`のscope拡張**（8型：CheckIn・
  DistractionSignal追加）
- **`daily_behavior_score_get`** — 既存`Reflection.score()`は変更せず、
  チェックイン実施率・介入減点を組み合わせた合成スコアを別途計算。
  80点基準・前日比・7日/30日比較（データ不足時は`available: false`）
- Screen Time/Opal等の実連携はiOS制約上直接取得不能と判明し、調査
  （`docs/operations/screen-time-integration-feasibility.md`）のみに
  留めた。実タスク登録・実効果測定はOwner確認後

### 旧Version25のスコープ：「Life Log Phase 2」

テーマ：「Life Log Phase 2」— Version24で実装した`AgentDelegationGrant`
（Owner決定に基づく生活記録の自動保存）のscopeを、食事・栄養・体重・
収支の4カテゴリへ拡張する、Owner本人発信の正式指示（AgentMessage
`70926e76-...`）。Version23の調査で判明した「Reflectionの拡張では
表現できない」ギャップを埋めた。詳細はADR 0052・
[`docs/reports/Version25_Report.md`](./docs/reports/Version25_Report.md)参照。

- **4つの新規Entity**（`MealLog`・`NutritionLog`・`WeightLog`・
  `FinanceLog`）— 食事単位・1計測1記録・取引単位という、Owner確認済み
  の記録粒度でそれぞれ設計。推定値（栄養）はOwner本人の発言と区別する
  `estimated`/`basis`/`confidence`を`create()`で構造的に必須化
- **`AgentDelegationGrant`のscope拡張**（6型：Reflection・
  ChallengeLog・MealLog・NutritionLog・WeightLog・FinanceLog）—
  Version24で確立した型固定Level2ルール・重複防止・監査・default
  denyは無変更のまま、`AUTO_APPROVABLE_TYPES`への型追加のみで拡張
- **idempotencyKeyによる重複防止** — 4 Entity共通。同一キーの再送は
  新規保存せず既存レコードを返す（`deduped: true`）
- **新規MCP Tool 5つ**（`meal_log_list`・`nutrition_log_list`・
  `nutrition_summary_by_date`・`weight_log_list`・`finance_log_list`、
  いずれも読み取り専用）・対応するHTTP Route — 書き込みは既存の
  `proposal_create`/`approve`が新ProposalTypeを受け付けるだけ（ADR
  0039の「書き込み経路を増やさない」方針を継続）
- OAuth本番有効化・`.env`変更は今回のスコープに含まれていない

### 旧Version24のスコープ：「OAuth Production Activation and Scoped Life-Log Delegation」

テーマ：Version22 Feedbackの3つの承認事項（OAuth本番有効化、生活記録
限定のLevel1委譲、Constitution第4条の限定改定）を全て承認した、
Owner本人発信の正式指示（AgentMessage `1e02902f-...`）。詳細はADR
0051・`docs/reports/Version24_Report.md`参照。

- **Constitution第4条の限定改定**（`docs/constitution.md`）—
  Ownerが`AgentDelegationGrant`として発行した範囲内でのみ、ARCが
  個別`do`なしに記録を保存できる。Project ARC採択後、初めての
  Constitution改定
- **`AgentDelegationGrant`**（Reflection・ChallengeLog限定）—
  状態機械（Active/Paused/Revoked、Revokedからのresumeはコード
  レベルで拒否）、型固定Level2ルールとAUTO_APPROVABLE_TYPES除外
  による二重の安全装置、重複防止、監査ログ（`approver: 'Owner' |
  'auto-save'`）
- **OAuth本番有効化**（`.env`・本番サービス再起動）— Claude Codeの
  実行環境の安全機構によりブロックされ、Owner自身の手作業として実施

### 旧Version23のスコープ：「Life Log Auto-Save Delegation（設計）」

テーマ：Owner決定「通常生活記録の自動保存を許可する」（AgentMessage
`f81e9141-...`）を受けた設計フェーズ。コード実装なし。既存Entityと
生活記録カテゴリの対応関係を調査し、食事・栄養・体重・収支には対応する
Entityが存在しない「ギャップ」を特定、Constitution整合性の結論と
次Version計画を提示した。詳細は
[`docs/proposals/life-log-auto-save-delegation.md`](./docs/proposals/life-log-auto-save-delegation.md)参照。

### 旧Version22のスコープ：「Authority Boundary and Secure Approval」

テーマ：「Authority Boundary and Secure Approval」— Version21の
完了報告への応答としてARCから届いた指示。Level0/1/2の単一権限表、
無認証Remote MCPの脅威モデル、認証方式3案の比較・推奨、ローカル
無料試作、Level1委譲の将来設計（未実装）を求めた。詳細は
[`docs/authority-table.md`](./docs/authority-table.md)・
[`docs/security/remote-mcp-threat-model.md`](./docs/security/remote-mcp-threat-model.md)・
ADR 0049参照。

- **脅威モデルでの発見**：`management_feedback_resolve`はWrite
  Proposal Layerを経由しない直接書き込みであり、現状の無認証Remote
  MCPではトンネル公開URLを知る誰でもOwnerの`do`を経由せず実行できる
  ——ADR 0044の「Write系はProposal経由なのでリスクは限定的」という
  従来の主張に対する具体的な反例
- **認証方式の推奨**：Bearer静的トークン・自前OAuth 2.1・Cloudflare
  Accessの3案を比較し、`@modelcontextprotocol/sdk`同梱の
  `mcpAuthRouter`を使った自前OAuth 2.1（ChatGPT Connector互換・
  追加契約不要）を推奨
- **`LocalOAuthProvider`**（`src/infrastructure/security/oauth/`）—
  Dynamic Client Registration・PKCE・OwnerのみのPasscodeゲート・
  短命token/refresh tokenをインメモリで実装したローカル試作。
  `MCP_OAUTH_ENABLED`（既定false）で`remoteServer.ts`に配線——
  フラグOFF時は既存の無認証挙動を1バイトも変えない。本番環境への
  有効化はVersion22では行わず、Owner承認待ち
  （[`docs/setup/remote-mcp-oauth-migration.md`](./docs/setup/remote-mcp-oauth-migration.md)参照）
- **Level1委譲**（未実装）— `AgentDelegationGrant`設計案と
  Constitution第4条改定文言案を現行維持案と比較可能な形で提示
  （[`docs/proposals/level1-arc-approval-delegation.md`](./docs/proposals/level1-arc-approval-delegation.md)、
  採否はOwner判断）

### 旧Version21のスコープ：「Approval Policy Engine」

テーマ：「Approval Policy Engine」— ARCから「Claude Codeの承認要求を
可能な限りARCが代行し、Ownerには重要事項のみを上げる」仕組みの実装
指示を受けた。呼び出し側が申告する構造化`signals`（有料サービス・
外部公開拡大・認証変更・破壊的操作・個人情報の外部送信・
Constitution変更の6カテゴリ）からLevel0/1/2を機械的に分類し、
`ApprovalDecision`として監査記録する。実装前にConstitution・
ai-roles.md・関連ADRを確認し、指示書を字義通り実装すると既存の
設計保証と衝突する2点（ARCによるProposal承認代行、Level2の暗号学的な
迂回不能化）を発見、いずれも実装せずOwnerへの提案としてADR 0048へ
記録した。詳細は
[`docs/setup/approval-policy.md`](./docs/setup/approval-policy.md)・
ADR 0048参照。

- **Approval Policy Engine**（`ClassifyApprovalLevelUseCase`、
  `ApprovalDecision`）— `signals`未申告時はLevel1へエスカレーション、
  いずれかのsignalがtrueなら無条件でLevel2。`approveProposal`/
  `rejectProposal`はクライアントが返した表示用`approvalLevel`を
  信用せず`signals`からサーバー側で再計算する
- **監査ログ**（`GET /approval-decisions`、MCP Tool
  `approval_decision_list`）— create/approve/rejectのたびに機械的に
  記録される。書き込み専用の新規MCP Toolは追加しておらず、既存の
  `proposal_create`が`signals`を受け付けるだけで完結する（ADR 0039の
  「書き込み経路を増やさない」方針を継続）

### 旧Version20のスコープ：「Collaboration Runner + 常駐運用基盤」

テーマ：「Collaboration Runner + 常駐運用基盤」— ARCから「Collaboration
Runnerと常駐運用基盤を最優先で実装してください」という指示を受け、
PCを起動したまま放置してもProject ARC上の新着を検知できる仕組みと、
`pnpm run api`/`pnpm run mcp:remote`/`ngrok`のログオン時自動起動を
整備した。無人稼働のまま内容を「解釈」し実装方針を決めることは
Constitution第2条・ADR 0045の境界に抵触しかねないため、Owner確認の
上でRunner v1は**機械的な新着検知・通知のみ**に限定した（ADR 0046）。
アーキテクチャ全体像は
[`docs/architecture-diagram.md`](./docs/architecture-diagram.md)を参照。

- **Collaboration Runner**（`src/infrastructure/runner/
  collaborationRunner.ts`、`pnpm run runner`）— `agent_message_list`・
  `management_feedback_list`の新着を機械的に検知し、`data/runner-
  notifications/`へ一覧を書き出す。内容の解釈・実装方針の提案は
  一切しない（ADR 0046）。1回実行して終了するスクリプトとして実装し、
  繰り返し実行はWindowsタスクスケジューラに委ねる
- **ログオン時自動起動**（`scripts/start-all.ps1`・`stop-all.ps1`・
  `scripts/register-scheduled-tasks.ps1`）— Owner確認の上、ngrokを
  含む3サービスをログオン時に自動起動する方針とした。Remote MCPは
  無認証設計（ADR 0044）のため、これはほぼ常時の公開を意味する
  ——常時公開リスクの受け入れ。運用手順は
  [`docs/setup/collaboration-runner.md`](./docs/setup/collaboration-runner.md)参照

### 旧Version19のスコープ：「Continuous Collaboration」

Version18でChatGPT⇄Project ARCの接続が実際に動くことをOwnerが確認し、
ARC自身が初めてコピペを介さずProject ARCへ直接書き込みを行った。
Version19はこの運用が機能し続けるために欠けていたインフラ・記録・
ドキュメントを整備した——ManagementFeedbackを「分析」し指示書を
「生成」する役割はProject ARC（System）ではなくARC自身が担うと解釈し、
Systemが判断を下す機能は実装していない（`docs/constitution.md`
第2条、ADR 0045）。

- **Continuous Collaboration運用**（`docs/ai-roles.md`）— ARCが
  ManagementFeedbackを読み、指示書をAgentMessage Proposalとして起案、
  Ownerが「do」で承認、Claude Codeが実装、完了報告もAgentMessageで
  保存、という閉ループをドキュメント化。ManagementFeedback↔
  AgentMessageのトレーサビリティは既存の`tags?: string[]`を再利用
  した`mf:<id>`規約で実現し、スキーマ変更はしていない（ADR 0045）
- **セッション開始チェックの補完**（`CLAUDE.md`）— ARCからの指示書は
  `docs/handoff/ARC_INBOX.md`だけでなく`agent_message_list`
  （`direction: "ToClaudeCode"`）経由でも届くようになったため、
  両方を確認するチェックリストに更新
- **Remote MCPサーバー**（`src/infrastructure/mcp/remoteServer.ts`、
  `pnpm run mcp:remote`）— MCP公式仕様のStreamable HTTP transportで
  実装（Version18）。stdio版（`pnpm run mcp`、Claude Code用）とは
  独立したエントリポイントで、既存の`.mcp.json`・stdio接続は無変更の
  まま共存する。`/mcp`エンドポイントは認証を行わない——ChatGPTの
  「認証なし」モードは`Authorization`ヘッダーを送らないため、Bearer
  必須では接続できないことが実機検証で判明し撤回した（ADR 0044、
  ADR 0041を一部訂正）。実際にChatGPTから到達させるには公開HTTPS
  トンネルが必要——セットアップ手順は
  [`docs/setup/chatgpt-mcp-connection.md`](./docs/setup/chatgpt-mcp-connection.md)参照（トンネルサービスへの登録はOwner自身の操作が必要）
- **OpenAPI 3.x生成**（`pnpm run openapi:generate`、`docs/openapi.json`）—
  ARC向けの主要エンドポイント（Version21時点で11個）に絞って
  operationId・request・responseを生成する独立スクリプト。
  `http/server.ts`本体は変更しない（ADR 0043）
- **AgentMessage**（`GET /agent-messages`、MCP Tool `agent_message_list`、
  `pnpm propose list-messages`）— ARC↔Claude Code間の指示書・Feedback
  の往復記録。Version14で確立した「新しいProposal種別を1つ追加する」
  パターン（ManagementFeedbackと同型）で実装し、書き込みは既存の
  `proposal_create`/`approve`/`reject`が`type: 'AgentMessage'`を
  受け付けるだけで済んだ（ADR 0039）。AgentTask・Artifactは今回
  実装していない（ADR 0040、YAGNI）
- **MCPサーバー**（`src/infrastructure/mcp/server.ts`、`pnpm run mcp`）—
  ARCが会話の中で直接Project ARCを呼び出せるstdioベースのMCPサーバー。
  `Connector`（Version15）のみに依存し、Application/Domain層は一切
  importしない（ADR 0038）。11個のMCP Tool（`read_reflection`・
  `read_external`・`read_timeline`・`read_decision`・
  `proposal_create`・`proposal_approve`・`proposal_reject`・
  `management_feedback_list`・`management_feedback_resolve`・
  `agent_message_list`・`approval_decision_list`）を提供。起動前に
  `pnpm run api`（ARC Connector HTTP API）が別プロセスとして
  起動済みである必要がある
- **Connector**（`src/infrastructure/connector/Connector.ts`）— ARC
  Connector HTTP APIをHTTP経由でのみ呼び出すクライアントモジュール。
  Application/Domain層の型を一切importしない、独立したHTTPクライアント
  として実装（ADR 0034）。Read/CreateProposal/ApproveProposal/
  RejectProposal/ManagementFeedbackのlist・resolveを提供する
- **API Key認証**（`ARC_API_KEY`環境変数）— `Authorization: Bearer
  <key>`固定（ChatGPT Actions・MCP双方の認証慣習を事前調査した上で
  選定、ADR 0035）。設定時のみ`GET /health`以外の全ルートで強制する
  opt-in設計——未設定ならVersion7〜14と同じく認証なしで動作する
  （ADR 0036）。認証コードはInfrastructure層のみに閉じ込め、
  Application層は一切関与しない
- **Read Layer**（`ReadGatewayUseCase`、`GET /read/reflection`
  `/read/timeline` `/read/external` `/read/decision`）— ARCが会話の
  中で必要最小限のデータだけを取得できる読み取り専用の入口。`limit`
  を必須とし、既存のGetTimeline/RetrieveKnowledge/
  DecisionEngineUseCaseへ委譲するのみ（新しい判断ロジックは持たない、
  ADR 0030）
- **Write Proposal Layer**（`WriteProposalGatewayUseCase`、`pnpm
  propose`、`POST /proposal/create` `/proposal/approve`
  `/proposal/reject`）— ARCは`createProposal`でProposalを組み立てる
  だけで、Systemはこれを一切保存しない。Ownerが内容を確認し、同じ
  Proposalを`approveProposal`へ再送して初めて対応する既存UseCase
  経由で書き込まれる。`rejectProposal`は何も永続化しない
  （ADR 0031）。対応するProposal種別：Reflection/Memory/
  ExternalKnowledge/Appearance/ManagementFeedback
- **ManagementFeedback**（`pnpm propose list-feedback`・
  `pnpm propose resolve`）— ARC視点のProject ARC運用改善提案を表す
  新Entity。Reflection（Owner視点）とは別Entityとし（ADR 0032）、
  `resolution`（Open→Accepted→Implemented→Closed、または
  Rejected）という状態機械を持つ。Timelineには含めない（ADR 0033）
- **Conversational Integration**（`pnpm conversation`、`POST
  /conversation/context`）— 質問文をIntent（Retrieval/Decision/
  None）へ機械的パターン一致で分類し（ADR 0029）、対応するツール
  （`RetrieveKnowledgeUseCase`または`DecisionEngineUseCase`）を
  呼び出して`ConversationContext`を生成する。回答内容の生成・優先
  順位の提案は行わない——【Retrieved Knowledge】【Decision
  Context】【Sources】の3セクションまでで、「【ARC】」に相当する
  解釈・結論はARC自身が書く（ADR 0028）。会話自体は保存しない
  （ADR 0027）
- **Decision Support**（`pnpm decision`、`POST /decision/support`）—
  質問文から選択肢（candidates、優先順位なし）を機械的パターン一致
  で導き（ADR 0022）、各候補についてExternal Brainの根拠・メリット・
  デメリット・不足情報を整理した`DecisionContext`を生成する
  （Value Object、ADR 0024）。Systemは決定せず、比較材料の整理までに
  留める——メリット/デメリットは根拠テキストからのキーワード抽出
  であり、新しい評価文の生成ではない（ADR 0023）
- **Knowledge Retrieval**（`pnpm external -- retrieve`、`POST
  /knowledge/retrieve`）— query/tags/topicsを渡すと、ExternalKnowledge
  /ExternalSourceをタイトル・タグ・トピック一致による機械的スコア順に
  取得（Embedding・AIによる関連度判定はなし、ADR 0020）。結果は
  「【External Brain】」引用ブロック（Context Builder出力）としても
  受け取れる。ARC自身の推論・結論部分はSystemが生成しない（ADR 0021）
- **External Brain**（`pnpm external`）— 出典（`ExternalSource`：
  Web/書籍/論文/動画等の書誌情報）と知識（`ExternalKnowledge`：
  そこから得た内容、原文とOwnerの解釈を分離）を分けて保存
  （ADR 0013）。confidence・重複検知はOwnerが判断する材料を示す
  だけで、Systemは自動判定・自動統合しない（ADR 0012）
- **Bridge Layer**（`pnpm bridge -- import/export`、`POST
  /bridge/import`、`GET /bridge/export`）— `{type, data}`形式のJSONで
  Reflection/Memory/InventoryItem/AppearanceLog/SkinLog/PurchaseLog/
  ChallengeLog/ThirdPersonEvaluation/ExternalSource/ExternalKnowledge
  を一括登録・一括出力。既存のUseCaseへ委譲するだけの薄い
  ディスパッチャで、1件の失敗が他に影響しない（ADR 0010・0016）
- **Third Person Evaluation**（`pnpm evaluation`、`POST
  /evaluation`）— 他者からの評価・コメント（「いとこにガタイ良く
  なったと言われた」等）を構造化して記録。Appearance Log（Owner
  自身の評価）とは別Entity（ADR 0011）
- **Timeline**（`pnpm timeline`、`GET /timeline`）— Reflection/
  AppearanceLog/SkinLog/PurchaseLog/ChallengeLog/Capture/
  ThirdPersonEvaluation/ExternalKnowledgeの8Logを横断して日付降順で
  一覧表示。`--since=` `--source=` `--limit=`で絞り込み可能。
  Memory/Life Inventory/ExternalSourceは対象外（ADR 0009・0017）
- **ARC Connector**（`pnpm api`）— Application層をHTTP経由で呼び出せる
  API。`POST /reflection` `/skin` `/purchase` `/purchase/:id/start`
  `/purchase/:id/finish` `/appearance` `/evaluation` `/capture/suggest`
  `/capture` `/bridge/import` `/external-sources` `/external-knowledge`
  `/knowledge/retrieve` `/decision/support` `/conversation/context`
  `/proposal/create` `/proposal/approve` `/proposal/reject`
  `/management-feedback/:id/resolve`、
  `GET /health` `/timeline` `/bridge/export` `/external-sources`
  `/external-knowledge` `/external-knowledge/search` `/read/reflection`
  `/read/timeline` `/read/external` `/read/decision`
  `/management-feedback` `/agent-messages`、`PATCH`/`DELETE`
  も`/external-sources/:id` `/external-knowledge/:id`に対応。新規
  外部依存なし（Node標準の`http`のみ）。ローカル専用（`127.0.0.1`
  のみ）・`ARC_API_KEY`設定時のみAPI Key認証を強制（Version15、
  ADR 0036）
- **Smart Capture**（`pnpm capture`）— 文章・写真を入力すると、
  キーワード一致による下書き提案（例：「肌」→Skin Log、「買った」→
  Purchase Log、「言われた」→Third Person Evaluation）を表示。Owner
  が確認・確定した分だけ対応するLogへ書き込む。書き込み履歴はCapture
  Logとして`list`で確認できる
- **ARC Memory**（`pnpm memory`）— 持ち物・目標・好み・学歴・
  キャリア・健康・お金・人間関係等、長期間保持する知識を
  追加・一覧・更新・削除。Reflection（その日の記録）とは
  意図的に分離（ADR 0005）
- **Appearance Log**（`pnpm appearance`）— 月次の外見記録（総合評価・
  肌・髪・髭・服装・体型・コメント・改善提案）。写真はファイル管理
  のみ（画像解析はしない）
- **Skin Log**（`pnpm skin`）— 肌の状態（赤み・毛穴・ニキビ・ニキビ跡・
  皮脂を1〜5で評価）を頻繁に記録・比較。Appearance Logとは別の
  Entity（ADR 0006）
- **Purchase Log**（`pnpm purchase`）— 消耗品（化粧水・洗顔料・
  カミソリ替刃等）の「購入→使い始め→使い切り」を管理。Life
  Inventoryとは別のEntity（ADR 0006）
- **Challenge Log**（`pnpm challenge`）— 人生で初めて挑戦したこと
  （初めて食べたもの・体験）を記録
- **Life Inventory写真紐付け**（`pnpm inventory -- photo`）— 持ち物に
  写真を紐付け（`show`で確認可能）
- **横断検索**（`pnpm find <キーワード>`）— MemoryとLife Inventoryを
  横断検索。「あれ何使ってた？」にすぐ答えることが目的（Reflection・
  Appearance Log・External Brainは検索対象外。External Brainの検索は
  `pnpm external -- search`が別に持つ、ADR 0005・0014参照）
- 永続化はローカルJSONファイル（`data/`配下、Git管理外）— ADR 0003参照

Gemini/OpenAI連携、実際の画像解析・OCR、Decision Engine、通知機能は
将来のVersionに延期しています（`docs/roadmap.md`参照）。

## セットアップ

```bash
pnpm install
```

Version13はローカルJSONファイル + ローカルファイルコピーのみで動作する
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
`memory`/`appearance`/`skin`/`purchase`/`challenge`/`capture`/
`timeline`/`evaluation`/`bridge`/`external`/`decision`/`conversation`/`find`のような独自コマンドは、pnpm組み込みの
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

pnpm run skin -- add               # Skin Logを追加（赤み/毛穴/ニキビ/ニキビ跡/皮脂、写真含む）
pnpm run skin -- list              # Skin Logを一覧表示
pnpm run skin -- compare           # 直近2件の写真パスを提示（画像解析はしない）

pnpm run purchase -- add           # 消耗品の購入を記録
pnpm run purchase -- start         # 使い始めを記録
pnpm run purchase -- finish        # 使い切りを記録
pnpm run purchase -- list          # ステータス別（未使用/使用中/使い切り）に一覧表示

pnpm run challenge -- add          # Challenge Logを追加（初めて挑戦したこと）
pnpm run challenge -- list         # Challenge Logを一覧表示

pnpm run capture -- add            # Smart Capture：文章・写真から下書き提案 → 確認 → 記録
pnpm run capture -- list           # Capture Logの実行履歴を一覧表示

pnpm run evaluation -- add         # Third Person Evaluationを追加（他者からの評価）
pnpm run evaluation -- list        # Third Person Evaluationを一覧表示

pnpm run find <キーワード>          # MemoryとInventoryを横断検索

pnpm run timeline                  # 各Logを横断した時系列一覧
pnpm run timeline --since=2026-07-01  # 日付で絞り込み
pnpm run timeline --source=SkinLog    # ソースで絞り込み

pnpm run bridge -- import <ファイル>  # {logs:[{type,data}, ...]}形式のJSONを一括登録
pnpm run bridge -- export             # 全Logをまとめてエクスポート
pnpm run bridge -- export --type=SkinLog  # typeを指定してエクスポート

pnpm run external -- add           # External Brainに知識を追加（出典の入力込み）
pnpm run external -- list          # 知識を一覧表示
pnpm run external -- list --status=inbox  # ステータスで絞り込み
pnpm run external -- show <id>     # 知識の詳細（出典情報込み）を表示
pnpm run external -- update <id>   # 知識を更新
pnpm run external -- delete <id>   # 知識を削除
pnpm run external -- search <キーワード>  # 知識と出典を横断検索（人間向け一覧）
pnpm run external -- retrieve <キーワード>  # ARCへ渡す想定のスコア順取得（Knowledge Retrieval、Version11）
pnpm run external -- retrieve --tags=司法試験,行政法  # タグで絞り込み
pnpm run external -- review <id>   # ステータスをreviewedに変更
pnpm run external -- archive <id>  # ステータスをarchivedに変更

pnpm run decision -- "<質問>"       # 質問から選択肢・比較材料（DecisionContext）を生成（Version12）
pnpm run decision                  # 引数なしなら対話式に質問を聞く

pnpm run conversation -- "<質問>"   # 質問のIntentを判定し、Retrieve/DecisionへルーティングしてConversationContextを生成（Version13）
pnpm run conversation              # 引数なしなら対話式に質問を聞く

pnpm run propose                   # 対話式にProposalを作成→表示→Approve確認（Version14、Write Proposal Layer。Version17でAgentMessage種別も追加）
pnpm run propose list-feedback     # ManagementFeedbackの一覧を表示
pnpm run propose resolve <id> <Accepted|Implemented|Closed|Rejected>  # resolutionを遷移
pnpm run propose list-messages     # AgentMessageの一覧を表示（Version17）

pnpm run api                       # ARC Connector（HTTP API）を起動（既定ポート3939）

pnpm run mcp                       # MCPサーバーを起動（stdio、Version16）。事前に`pnpm run api`が起動している必要がある
pnpm run mcp:remote                # Remote MCPサーバーを起動（Streamable HTTP、Version18、既定ポート3940）。認証なし（ADR 0044）
pnpm run openapi:generate          # docs/openapi.json を生成（Version18、主要10エンドポイントのみ）
pnpm run runner                    # Collaboration Runnerを1回実行（Version20、機械的な新着検知のみ、ADR 0046）

pnpm mobile-ingress                 # Mobile Ingress受信サーバーを起動（Version35、127.0.0.1限定、既定ポート3941）。POST /ingressで生活ログを受信、GET /ingressで一覧取得、GET /でQuick Capture UI（Version36〜37、CSP nonce・token非埋め込みはVersion39）
pnpm mobile-sync                    # Sync Worker：受信済みAccepted状態のログをlocalへCanonicalize（Version35）
pnpm mobile-sync list <status>      # IngressRecordを状態別に一覧表示（Accepted/Canonicalized/Pending/Failed/Discarded）
pnpm mobile-sync resolve <id> accept|discard  # Pending/FailedなIngressRecordをOwnerが解決
pnpm mobile-sync retry <id>         # Failed状態のIngressRecordを再試行（MAX_RETRY超過後は不可）
pnpm mobile-sync pull               # cloud側queue（Cloudflare Workers等）をローカルへ引き下ろす（Version38、ADR 0069）。CLOUD_INGRESS_URL/CLOUD_INGRESS_PULL_TOKEN未設定なら明確なエラーで終了

pnpm import-pending-logs -- <path> --dry-run  # 退避中ログJSONLファイルをschema検証のみ行う（書き込みなし、Version37、ADR 0067）
pnpm import-pending-logs -- <path>            # 対応済みtypeの行のみIngressRecordとしてAccept（未対応typeはunsupported_typeとして報告、実データはこのリポジトリに含まれない）

# cloudflare/配下（Version38〜39、ローカルエミュレータのみ、実デプロイなし）
pnpm cloudflare:typecheck           # cloudflare/tsconfig.json（Workers型定義）でtsc --noEmit
pnpm cloudflare:test                # Miniflare（実workerdランタイム）でCloudflare Worker実装を実機検証（GET /のQuick Capture UIを含む）
pnpm cloudflare:preflight           # デプロイ前チェック（Version39）。wrangler.tomlの設定・binding名・secret非ハードコード・test結果のみ確認。login/deploy/secret作成は実行しない
```

`pnpm run api`起動後の動作確認例（`curl`はGit Bash上で日本語を含む
リクエストを送ると文字化けすることがあるため、日本語を含む検証には
Node標準の`fetch`を使うことを推奨します）。

```bash
curl http://127.0.0.1:3939/health
curl -X POST http://127.0.0.1:3939/skin \
  -H "Content-Type: application/json" \
  -d '{"record":{"date":"2026-07-13","redness":2}}'
```

### MCPサーバーへの接続（Version16）

MCPサーバー（`pnpm run mcp`）はstdio transportのため、ポートは使わず
Claude Desktop・Claude Code等のMCPクライアント側の設定ファイルから
コマンドとして起動される。事前に`pnpm run api`でARC Connector HTTP
APIを起動しておくこと（MCPサーバー自身はHTTPサーバーを内包しない）。

**Claude Desktop**（`claude_desktop_config.json`）：

```json
{
  "mcpServers": {
    "project-arc": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/project-arc/src/infrastructure/mcp/server.ts"]
    }
  }
}
```

**Claude Code**：

```bash
claude mcp add project-arc -- npx tsx /absolute/path/to/project-arc/src/infrastructure/mcp/server.ts
```

`ARC_API_KEY`を設定している場合、MCPサーバー（`Connector`経由）も
同じ環境変数（`.env`）を読むため、追加設定は不要。

## ディレクトリ構成

```
src/
├── domain/          # Entity・value object（外部依存なし）
├── application/      # ユースケース・ポート（Repository/Providerインターフェース）
├── adapters/          # 実装（JSONファイル / Supabase / Google API / ダミーProvider）
├── infrastructure/    # CLI・HTTP API（ARC Connector）・DB・環境変数・Google認証・
│                       トークン暗号化・写真ファイル管理
└── shared/            # 共通エラー・日付ユーティリティ等
docs/                  # 思想・設計ドキュメント・セットアップ手順・報告書
docs/handoff/          # ARC⇄Claude Codeの引き継ぎ（受信箱・送信箱）
data/                  # ローカルの記録・写真（Git管理外、実行すると自動生成）
```

各層の依存方向は内側（Domain）に向かってのみ許可される
（`docs/architecture.md`参照）。
