# ARCからの最新指示書

## 未処理の正式優先指示（2026-07-19）

**Claude Code / Codex は着手前に必ず次を全文確認してください。**

- [`docs/project-management/OWNER_PRIORITY_PROGRAMS_2026-07-19.md`](../project-management/OWNER_PRIORITY_PROGRAMS_2026-07-19.md)
- 補助資料：[`docs/project-management/CODEX_FAILURE_REVIEW_2026-07-19.md`](../project-management/CODEX_FAILURE_REVIEW_2026-07-19.md)
- 導入コミット：`980417d`

現在のOwner最優先事項は、(1) Ownerが日常的に介入しなくてもARC・Claude Code・Codexが安全に共同開発できる環境、(2) PC停止中でもスマホからDaily/Life LogをProject ARCへ保存できる環境、の2件です。Version30完了後は、上記文書の統合ロードマップと安全ゲートに従って、Version31以降の計画・問題整理・安全な工程を進めてください。Remote MCPの実データがこの実行環境から読めなくても、このGit管理された正式指示を未受領扱いにして停止しないでください。費用・秘密情報・本番変更・外部公開変更・不可逆操作・Constitution/Principles変更だけをOwner確認事項とし、それ以外は既存の承認ポリシーに従って継続してください。


Owner: ARC（ChatGPT）から新しいVersionのテーマ・指示が来たら、
このファイルの中身をまるごと置き換えてください。次にClaude Codeが
このプロジェクトを開いたとき、このファイルを確認して着手します。

**処理済み**：
- Version7「ARC Connector」（`docs/reports/Version7_Report.md`）
- Version8「Timeline」（`docs/reports/Version8_Report.md`、新しい
  指示書なしでClaude Codeの判断により着手）
- Version9「ARC Bridge」（`docs/reports/Version9_Report.md`、原文は
  `docs/handoff/archive/Version9_ARC_Brief.md`に保管）

**処理済み**：ARCからの「長期ロードマップ2.0」提案は`docs/roadmap.md`
に方向性として記録。「ARC Constitution」はOwner承認により正式採択し
[`docs/constitution.md`](../constitution.md)として新設、
`docs/vision.md`・`docs/principles.md`・README・CLAUDE.mdから相互
参照するよう更新した（原文は
`docs/handoff/archive/2026-07_ARC_Roadmap2_and_Constitution_Proposal.md`
に保管）。

**処理済み**：Version10「External Brain」（`docs/reports/
Version10_Report.md`）。実装指示書はPDFファイル
（`Project ARC Version10 実装指示書.pdf`）として届いた（原文は
`docs/handoff/archive/Version10_ARC_Brief.md`に保管）。

**処理済み**：Version11「Knowledge Retrieval」（`docs/reports/
Version11_Report.md`）。Version10完了報告への応答としてARCから
届いた（原文は`docs/handoff/archive/Version11_ARC_Brief.md`に保管）。

**処理済み**：Version12「Decision Support」（`docs/reports/
Version12_Report.md`）。Version11完了報告への応答としてARCから
届いた（原文は`docs/handoff/archive/Version12_ARC_Brief.md`に保管）。

**処理済み**：Version13「Conversational Integration」（`docs/
reports/Version13_Report.md`）。Version12完了報告への応答として
ARCから届いた（原文は`docs/handoff/archive/Version13_ARC_Brief.md`
に保管）。

**処理済み**：Version14「ARC Integration」（`docs/
reports/Version14_Report.md`）。Owner自身が「ARCが直接POSTする」案を
撤回し、Write Proposal Layer（`ARC → Write Proposal → Owner承認 →
Project ARC`）を新設する方針へ修正した指示書（原文は
`docs/handoff/archive/Version14_ARC_Brief.md`に保管）。

**処理済み**：Version15「Connector Deployment」（`docs/
reports/Version15_Report.md`）。「Project ARCを完成させる。ARCとの
実際の接続を実現する」というテーマで、Infrastructure層に
Connector・API Key認証を追加した指示書（原文は
`docs/handoff/archive/Version15_ARC_Brief.md`に保管）。

**処理済み**：Version16「MCP Integration」（`docs/
reports/Version16_Report.md`）。「ARCが初めてProject ARCを直接
利用する」というテーマで、MCPサーバー（薄いアダプタ、Connectorのみに
依存）と9個のMCP Toolを追加した指示書（原文は
`docs/handoff/archive/Version16_ARC_Brief.md`に保管）。

**処理済み**：Version17「Agent Collaboration Layer」（`docs/
reports/Version17_Report.md`）。ARCとClaude Codeの役割分担を明確化
した上で、ARC↔Claude Code間の指示書・Feedbackの往復記録
（AgentMessage）をProject ARC自身に保存できるようにした指示書
（フィールド定義等の具体仕様はなく、Claude Codeが設計。原文は
`docs/handoff/archive/Version17_ARC_Brief.md`に保管）。

**処理済み**：Version18「Remote MCP Integration」（`docs/
reports/Version18_Report.md`）。「ARCが初めてProject ARCを直接
利用する」というテーマで、Streamable HTTP transportによるRemote MCP
サーバー・OpenAPI 3.x生成（主要エンドポイントのみ）を追加した正式な
指示書。事前調査の結果、ChatGPT Developer Modeの認証方式が指示書の
想定（Bearer認証）と実際の仕様（OAuth 2.0/2.1または認証なし）で
ズレがあることが判明し、Owner確認のもと簡易Bearer認証のみで進めた
（フルOAuth 2.1は見送り。原文は`docs/handoff/archive/
Version18_ARC_Brief.md`に保管）。

**処理済み**：Version19「Continuous Collaboration」（`docs/
reports/Version19_Report.md`）。**このファイルへの貼り付けを経由
せず**、ARC自身がRemote MCP（Version18・ADR 0044）経由で
`AgentMessage`（id `b0adb087-...`、direction: ToClaudeCode）として
直接Project ARCへ保存した初めての指示書（原文は`docs/handoff/
archive/Version19_ARC_Brief.md`に保管）。「ManagementFeedbackを
分析し指示書を生成する」対象をSystem/Claude Codeではなくスコープを
絞り、ARC自身がその作業を担う運用の完成に限定した（ADR 0045）。

**処理済み**：Version20「Collaboration Runner + 常駐運用基盤」
（`docs/reports/Version20_Report.md`）。AgentMessage（id
`33274dc6-...`）による指示。無人稼働中のAI推論（内容の解釈・実装
方針の提案）はConstitution第2条・ADR 0045に抵触するため、Runner v1は
機械的な新着検知・通知のみに限定した（ADR 0046）。ログオン時自動
起動（`pnpm run api`・`mcp:remote`・ngrok）はOwner確認の上で導入
したが、タスクスケジューラへの登録はClaude Codeの実行環境の制約で
一部完遂できず、Owner自身の1ステップ操作として引き継いだ（ADR
0047）。同日届いた100項目の長期バックログ（id `8df72fe4-...`）は
`docs/roadmap.md`の長期セクションへ要約を記録するに留めた（原文は
`docs/handoff/archive/Version20_ARC_Brief.md`に保管）。

**処理済み**：Version21「Approval Policy Engine」（`docs/
reports/Version21_Report.md`）。AgentMessage（id `6b78f23d-...`）に
よる指示。Level0（Claude Code）/Level1（ARC）/Level2（Owner）の
3段階承認レベルを、呼び出し側が申告する構造化`signals`から機械的に
分類し、`ApprovalDecision`として監査記録する仕組みを実装した。
実装前にConstitution・ai-roles.md・関連ADRを確認したところ、指示書を
字義通り実装すると既存の設計保証と衝突する箇所を2点発見し、
指示書要件4（矛盾するなら実装せず提案）に従いいずれも実装しなかった：
①「Level1: ARCがOwnerの`do`なしにProposal承認を代行してよい」という
運用変更（ADR 0031の「Ownerの再送が承認の証」という保証と衝突）、
②「Level2の迂回不能性」の暗号学的保証（ADR 0044でRemote MCP認証が
撤回済みのため技術的に不可能、かつ認証再導入自体がLevel2に該当する
自己参照）。詳細な判断根拠はADR 0048参照（原文は`docs/handoff/
archive/Version21_ARC_Brief.md`に保管）。

**処理済み**：Version22「Authority Boundary and Secure Approval」
（`docs/reports/Version22_Report.md`）。AgentMessage（id
`e5728efb-...`）による指示。Version21の完了報告への応答として届いた。
Level0/1/2の単一権限表（`docs/authority-table.md`）、無認証Remote MCP
の脅威モデル（`docs/security/remote-mcp-threat-model.md`、
`management_feedback_resolve`がWrite Proposal Layerを経由しない
直接書き込みであるという具体的な穴を発見）、認証方式3案比較・推奨
（ADR 0049）、ローカル無料試作（`LocalOAuthProvider`、OAuth 2.1・
Dynamic Client Registration・PKCE・Passcodeゲート、`MCP_OAUTH_ENABLED`
で既定OFF）、Level1委譲の未実装Constitution変更案（`docs/proposals/
level1-arc-approval-delegation.md`）を実施した。本番環境・現行接続
には変更を加えていない（原文は`docs/handoff/archive/
Version22_ARC_Brief.md`に保管）。

**処理済み**：Version23「Life Log Auto-Save Delegation」（`docs/
reports/Version23_Report.md`）。AgentMessage（id `f81e9141-...`）
による指示——Version17〜22と異なり、ARC経由ではなくOwner本人が
Remote MCP経由で直接発信した初めての指示書。Owner本人がChatGPT上で
明示送信した通常の生活記録（食事・栄養・睡眠・体重・運動・勉強・
授業・支出/収入・日次振り返り・挑戦行動）の自動保存を許可する内容。
指示書自身が「次Version実装計画を提示」を求めていたため、コード実装は
せず、既存モデルとの重複調査・Constitution整合性の結論（改定不要、
Owner・ARC確認待ち、ADR 0050）・Phase分割した実装計画
（`docs/proposals/life-log-auto-save-delegation.md`）の提示に留めた。
このメッセージはVersion22作業中に届いていたが約1時間強気づかず、
セッション中の再確認の重要性を`docs/reports/Version23_Report.md`10章
に記録した。

**処理済み（一部Owner操作待ち）**：Version24「OAuth Production
Activation and Scoped Life-Log Delegation」（`docs/reports/
Version24_Report.md`）。Owner本人発信のAgentMessage（id
`1e02902f-...`）による指示——Version22 Feedbackの3承認事項に基づく。
Constitution第4条を限定改定（`AgentDelegationGrant`委譲、ADR 0051）、
`AgentDelegationGrant`Entity・自動承認フロー・重複防止・監査ログ拡張
（Phase1: Reflection・ChallengeLog）を実装し、実HTTPリクエストで
grant作成→承認→自動保存→監査記録→重複拒否→取消し→自動保存停止の
一連を実機確認済み。**OAuth本番有効化（`.env`への`MCP_OAUTH_ENABLED`
設定・秘密情報書き込み・本番サービス再起動）はClaude Codeの実行環境
の安全機構によりブロックされ、Owner自身の手作業として引き継いだ**
——具体的な2行の設定内容とPasscodeはOwnerへチャットで直接伝達済み
（ファイルには記録していない）。手順は`docs/setup/
remote-mcp-oauth-migration.md`参照。

**処理済み**：Version25「Life Log Phase 2」（`docs/reports/
Version25_Report.md`）。Owner本人発信のAgentMessage（id
`70926e76-...`）による指示——Version24の`AgentDelegationGrant`
（Reflection・ChallengeLog限定）のscopeを、食事・栄養・体重・収支の
4カテゴリへ拡張した。4つの新規Entity（`MealLog`・`NutritionLog`・
`WeightLog`・`FinanceLog`、Owner確認済みの記録粒度：食事単位・1計測
1記録・取引単位）、`AgentDelegationGrantScope`の6型拡張、
idempotencyKeyによる重複防止、5つの読み取り専用MCP Tool・対応する
HTTP Routeを実装した。Version24の型固定Level2ルール・重複防止・
監査・default denyは無変更のまま拡張された。実HTTPリクエストで
grant作成→承認→MealLog自動保存→重複拒否→一覧取得→idempotencyKey
dedup→usageCount増加の一連を実機確認済み。OAuth本番有効化・`.env`
変更は指示書により対象外（未着手）。訂正・削除UseCaseは次Version
課題として持ち越し（原文は`docs/handoff/archive/
Version25_ARC_Brief.md`に保管）。

**処理済み**：Version26「行動介入レイヤー」（`docs/reports/
Version26_Report.md`）。Owner本人発信のAgentMessage（id
`31dcb191-...`）による指示——先延ばし・重要課題からの逃避・過剰な
スマホ利用を早期検知し行動修正を促す仕組みを求めた。4つの新規Entity
（`CheckIn`・`DistractionSignal`・`Intervention`・
`InterventionPolicySettings`）、決定的ルールエンジン（5ルール）、
`daily_behavior_score_get`（80点基準・前日比・7日/30日比較）を実装。
Interventionの生成はMCP Tool化・HTTP Route化せず、Owner本人の
マシン上のスクリプトからのみ呼べる設計とした（Version22脅威モデルの
教訓を踏まえた判断、ADR 0053）。Screen Time/Opal等の実連携は
iOS制約上直接取得不能と判明し、調査のみに留めた（`docs/operations/
screen-time-integration-feasibility.md`）。実タスク登録・実効果測定は
Owner確認後（原文は`docs/handoff/archive/Version26_ARC_Brief.md`に
保管）。

**処理済み**：Version27「Study Session Ingestion」（`docs/reports/
Version27_Report.md`）。AgentMessage（id `9ea53178-...`、
relatedVersionタグは`Version21`だが実際は別件）による指示——
ARC Study Timerから学習セッションを受信するHTTPS APIを求めた。
Version21完了直後に届いていたが、Version22〜26の間見落とされ続けて
おり、今回のセッションで`agent_message_list`の全件確認により発見・
実装した。`StudySession` Entity・`POST /api/study-sessions`・
`GET /api/study-sessions/summary`を、実際に外部から到達できる
`remoteServer.ts`（公開トンネル側）に配置し、専用のfail-closed
Bearer token（`STUDY_TIMER_API_TOKEN`）・CORS制限で保護した上で、
既存の`Connector`経由で`server.ts`へ内部転送する構成とした（ADR
0054）。対応するMCP Toolは意図的に追加していない——ARC自身はこの
経路を呼び出せない。`STUDY_TIMER_API_TOKEN`の実運用設定・実タイマー
アプリからの疎通確認はOwner確認後（原文は`docs/handoff/archive/
Version27_ARC_Brief.md`に保管）。

**処理済み**：Version28「Remote MCP Capability Registry」（`docs/
reports/Version28_Report.md`）。外部からのAgentMessageではなく、
`docs/roadmap.md`優先開発候補リストの最優先項目としてClaude Code/
Codexの判断により着手——ChatGPTの既存チャットや長寿命Remote MCP
プロセスが更新前のTool定義を保持する事象を、読み取り専用MCP Tool
`capability_registry_get`（`schemaVersion`・`projectVersion`・
`buildCommit`・`toolCount`/`toolNames`・`proposalTypes`を返す）で
機械的に検出可能にした。stdio・Remote MCP双方が同じ`buildMcpServer()`
を使うため実装を分岐させず、MCP Tool一覧は24件（23→24）になった。
書き込み経路・認証・外部公開範囲は無変更（原文は`docs/handoff/
archive/Version28_ARC_Brief.md`に保管）。

次の指示書を待っています。新しい指示が来たら、このファイルの
「ここにARCの指示書を貼り付け」以下を置き換えてください
（またはARCが直接AgentMessageとして送ってくることもあります
——`agent_message_list`も必ず確認すること）。

---

**処理済み**：Version35–36「Program B Mobile Ingressローカルモデル」
（`docs/reports/Version35_Report.md`・`docs/reports/
Version36_Report.md`）。日常ログ優先指示に基づき、ADR 0064
（Architecture Gate）・ADR 0065（Mobile Ingressデータ契約）を策定、
`pnpm mobile-ingress`・`pnpm mobile-sync`・Quick Capture UI
（`GET /`）・sync自動化の完全ローカルMVPを実装・実機確認した。
「退避中の16件」の実体不明・LAN公開有効化の可否はOwner確認事項として
`docs/project-management/Version35_Decision_Packet.md`へ集約。
クラウド契約・課金・本番公開・秘密情報設定は未実施（原文は`docs/
handoff/archive/Version35_ARC_Brief.md`に保管）。

次の指示書を待っています。新しい指示が来たら、このファイルの
「ここにARCの指示書を貼り付け」以下を置き換えてください
（またはARCが直接AgentMessageとして送ってくることもあります
——`agent_message_list`も必ず確認すること）。

**処理済み**：Version37「Mobile Ingressセキュリティ強化・退避中16件
JSONL Importer・Cloud Adapter境界」（`docs/reports/
Version37_Report.md`）。認証なしLAN公開の明示的な却下を受け、
fail-closed起動ガード・Bearer token認証・rate limit・入力上限・
監査ログを実装（ADR 0066）。退避中16件のJSONL Importer
（`pnpm import-pending-logs`、決定的重複防止規則、未対応typeは
自動マッピングせず明示報告、ADR 0067）を実装——実データはこの
リポジトリに含まれない。Cloud Adapter境界は既存
`IngressRecordRepository`の再利用として整理（新規抽象なし、ADR
0068）。Quick Capture UIのMealLog/WeightLog/FinanceLog対応、スマホ
側read契約も実装。クラウド契約・課金・本番公開・秘密情報設定は
未実施（原文は`docs/handoff/archive/Version37_ARC_Brief.md`に保管）。

次の指示書を待っています。新しい指示が来たら、このファイルの
「ここにARCの指示書を貼り付け」以下を置き換えてください
（またはARCが直接AgentMessageとして送ってくることもあります
——`agent_message_list`も必ず確認すること）。

**処理済み**：Version38「Cloud-ready Mobile Life Log」（`docs/
reports/Version38_Report.md`）。Cloudflare Worker実装
（`cloudflare/src/worker.ts`）をCloudflareの公式local emulator
（Miniflare、実`workerd`ランタイム）で実機検証した——アカウント
作成・ログイン・デプロイは一切実施していない。二段階token
（DEVICE_TOKEN／PULL_TOKEN）による最小権限read契約、
`pnpm mobile-sync pull`によるcloud→localのpull/reconciliation
（idempotency・部分失敗の区別・retention込み）、NutritionLogの
Quick Capture対応（`mealLogId`手入力、自動推測なし）を実装した。
実際にMiniflareで起動したWorkerと実CLIコマンドを繋いだ手動
end-to-end確認も実施（ADR 0069）。副次的に無関係な既存テスト
（Check-In Prompter）の時刻依存フレーキネスを発見・修正した。
メイン640件・cloudflare専用14件のテストが全て合格。1ページの
Activation Packet（`docs/project-management/
Version38_Activation_Packet.md`）を作成した。クラウド契約・課金・
本番公開・秘密情報設定・認証済みLAN公開の有効化は未実施（原文は
`docs/handoff/archive/Version38_ARC_Brief.md`に保管）。

次の指示書を待っています。新しい指示が来たら、このファイルの
「ここにARCの指示書を貼り付け」以下を置き換えてください
（またはARCが直接AgentMessageとして送ってくることもあります
——`agent_message_list`も必ず確認すること）。

**処理済み**：緊急優先診断「公開Remote MCPが旧10ツールのまま」
（2026-07-20、`docs/incidents/2026-07-20_remote-mcp-stale-tools.md`）。
この指示はVersion39完了後にGit履歴上で発見した（本来はVersion39
着手前に対応すべき診断だったが、リモートへの追記に気づかず
Version39を先に完了させてしまった——Version39自体はローカル・
Miniflareのみの安全な工程であり、この診断結果とは独立して有効な
ため取り消していない）。

現在のリポジトリのソースコードは26ツールを公開する設計であることを
確認し、本セッションのサンドボックスで実際に`pnpm run api`＋
`pnpm run mcp:remote`を起動、新設した`scripts/diagnose-remote-mcp.mjs`
（実MCP client、読み取り専用）で`tool count: 26`・
`capability_registry_get`のbuildCommitが起動時点のgit HEADと一致
することを実機確認した。「旧10ツール」という症状は、Version18
（2026-07-14、「主要10エンドポイント」として実装、`capability_
registry_get`自体はVersion28で新規追加）時点のbuildが、その後一度も
再起動・再ビルドされずに動き続けている可能性が最も高いという分析
結果を記録した。**Owner実機（Windows常駐プロセス・ngrokトンネル）は
このセッションから直接アクセスできないため、実際のプロセス起動時刻・
公開URLの照合、および再起動要否の最終判断はOwner自身が
`scripts/diagnose-remote-mcp.mjs`と診断doc4〜6章の手順で実行する
必要がある**。秘密情報の表示・変更、Remote MCP/ngrokの再起動は
実行していない。

**処理済み**：Version39「Cloud Quick Capture & PC-off Gap Closure」
（`docs/reports/Version39_Report.md`）。Cloudflare Worker側
`GET /`にQuick Capture UI（Reflection/MealLog/NutritionLog/
WeightLog/FinanceLog明示選択、ローカル版と共通の
`renderQuickCaptureHtml`モジュール）を実装した。per-request
nonceのCSP（`'unsafe-inline'`不使用）、DEVICE_TOKEN/PULL_TOKENの
非埋め込み（既定非永続・opt-in・危険性表示・消去操作）を実装し、
CSP・token非漏洩・5type網羅の否定テストを追加した。「PC-off保存」を
(a)cloud ingress受付・(b)canonical ARC確定・(c)read availabilityへ
分解したCapability/Gap表（ADR 0070）を作成し、Version39時点でも
(b)(c)が未達であることを明記した。Canonical Store所在（cloud全面
移行・現行Transport-queue案・hybrid案）を6軸で比較するADR 0071を
作成——**実際の移行は行っていない**、現行案を維持する決定のみを
記録した。デプロイ前preflightチェック（`pnpm cloudflare:preflight`、
アカウント操作なし）を新設した。実機のヘッドレスブラウザ検証で
2件の実装バグ（CSP inline-style属性ブロック、非表示fieldset内
`required`属性によるフォーム全体ブロック）を発見・修正した。
メイン642件・cloudflare専用17件のテストが全て合格。ARC-PM-005が
本Versionと無関係であることを`git stash`比較で再確認した。クラウド
契約・課金・本番公開・秘密情報設定・認証済みLAN公開の有効化・
Canonical Storeの実移行は未実施（原文は`docs/handoff/archive/
Version39_ARC_Brief.md`に保管）。

次の指示書を待っています。新しい指示が来たら、このファイルの
「ここにARCの指示書を貼り付け」以下を置き換えてください
（またはARCが直接AgentMessageとして送ってくることもあります
——`agent_message_list`も必ず確認すること）。

## Owner確定ゴール：PC不要・全ChatGPTチャット共通接続

Ownerは次の2点を最優先のProduct Acceptance Criteriaとして確定しました。

1. **PC停止中でも利用可能**：スマホだけでProject ARCのcanonicalな生活ログへ
   正式保存でき、保存結果と過去ログを安全に参照できること。単なるcloud待機
   queueへの受付だけを完成扱いにしない。
2. **どのChatGPTチャットからも読み書き可能**：新旧チャットを問わず、同じ
   最新Remote MCP capabilityへ接続でき、MealLog / NutritionLog / WeightLog /
   FinanceLog等の正式型を利用できること。旧10ツールcacheを放置しない。

Version39完了後は、このゴールへ最短で到達する後続Versionを計画・継続して
ください。少なくとも以下を設計対象に含めます。

- canonical ARC datastoreのcloud residency（D1等）とlocal data migration
- cloud-hosted authenticated Remote MCPとcapability/version自己診断
- connector更新・cache refresh・後方互換の運用手順
- 自動backup/restore。Google Driveは将来の暗号化backup/export先候補であり、
  primary datastoreにはしない
- 無料枠優先、予算上限0円。上限到達時は課金せずfail closed
- 個人データの暗号化、最小権限、監査、重複防止、削除・rollback

ローカル実装・emulator・migration dry-run・合成データtest・文書化はOwner返答を
待たず進めてください。Cloudflareアカウント作成、実secret設定、実デプロイ、
公開URL変更、実個人データ移行、課金はActivation GateとしてOwner承認を求めます。
完了報告では上記2条件を実機で満たした証拠がない限り「PC不要」「全チャット対応」
と表現しないでください。

## 着手中の正式指示：Version40「低リスク記録の直接保存API化・StudySessionツール優先追加」— 2026-07-20（優先度Critical）

Owner（加納央都）本人発信。原文はAgentMessage
（id `ba6548bc-c550-43a6-b5a1-7ab4dd4c9889`、direction: ToClaudeCode、
Critical、relatedVersionは「Version29」と記載されているが古い参照
——Version39完了済みの現行コードを基準に整合性確認すること）として
本番Project ARCへ保存済みだが、このセッションの`agent_message_list`
呼び出しは`fetch failed`となり本文を取得できなかったため、Ownerが
ChatGPT画面から直接コピーしてチャットへ貼り付ける形で伝達された
（この経路自体の脆弱性が指示内容の項目6と一致——本Versionで
Git Inboxミラーの整備を行う）。原文全文は`docs/handoff/archive/
Version40_ARC_Brief.md`に保管。

要旨：(1) MealLog/NutritionLog/WeightLog/Reflection/CheckIn/
DistractionSignal/ChallengeLog/Appearance/ManagementFeedbackの
9種を、既存AgentDelegationGrantの枠組みで個別Proposal不要にする、
(2) StudySession関連6ツールを最優先追加しTimeline空でも正しく集計、
(3) FinanceLog・AgentDelegationGrant管理・システム設定・Constitution・
認証・外部公開・削除等は引き続きProposal必須、(4) 全save処理へ
read-after-write検証・冪等キー・再試行キューを実装、(5) MCP接続の
チャット間安定性・`capability_registry_get`の診断情報拡充、
(6) AgentMessage→Git Inboxのミラー経路整備、(7) 回帰テスト、
(8) ADR 0031・Constitutionとの整合性を勝手に変更せず整理、
(9) 完了報告に規定項目を含める。

着手・停止条件は既存の標準運用（金銭・秘密情報・本番デプロイ・
Constitution変更・破壊的操作のみOwner確認、それ以外はローカルで
自律的に進める）に従う。


<!-- ここにARCの指示書を貼り付け -->
