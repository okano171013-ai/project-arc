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

**処理済み（Version35、Version36は同条件で継続中）**：
Version35–36日常ログ優先指示（`docs/reports/Version35_Report.md`）。

Ownerは優先順位を明確化した。最優先は、スマホからアーク（Project ARC）の日常ログを参照・保存でき、PC停止中でも動作すること。完全自動開発は第2優先とする。

Version34完了後、技術的負債の細部ではなくProgram Bを進めること。まずVersion34の「576件中573件green（新規3件）」が全576件成功を意味するか確認し、失敗・skip・未実行があれば解消または明記する。ただし確認だけで停止しない。

Version35では、Program B Architecture Gate、無料枠優先のcloud候補比較、月額上限0円を初期既定とした構成案、Mobile IngressのローカルMVP、read/write/idempotency/待機/失敗のデータ契約、退避中16件を将来取り込むimport形式、脅威モデル・ADR・テスト・Report・Developer Feedback・STATUS・Roadmapを整備する。

クラウド契約・課金・本番公開・秘密情報設定は行わず、Owner判断事項を短いDecision Packetに集約する。設計・調査・文書化・ローカル実装・無料かつ可逆な検証は返答待ちで停止せず進める。Version35完了後は同条件でVersion36のローカルMVP完成まで続行してよい。DevelopmentGrant本番発行とOAuth本番有効化はOwner確認事項として保留する。

**対応内容**：テスト件数の表現は誤りで実際は573件中573件全合格
だったことを確認（Version35着手前に解消）。ADR 0064（Architecture
Gate、cloud比較、$0/月既定）・ADR 0065（Mobile Ingressデータ契約）
を策定し、`IngressRecord`Entity・`pnpm mobile-ingress`・
`pnpm mobile-sync`の完全ローカルMVPを実装・実機確認した。「退避中の
16件」は実体不明のためOwner確認事項として`docs/project-management/
Version35_Decision_Packet.md`へ集約（取り込み経路自体は設計済み）。
クラウド契約・課金・本番公開・秘密情報設定は未実施。Version36として
同条件でローカルMVPの完成度向上を継続中（原文は本セクションに保持、
`docs/handoff/archive/`への移動はVersion36完了時に行う）。

次の指示書を待っています。新しい指示が来たら、このファイルの
「ここにARCの指示書を貼り付け」以下を置き換えてください
（またはARCが直接AgentMessageとして送ってくることもあります
——`agent_message_list`も必ず確認すること）。

<!-- ここにARCの指示書を貼り付け -->
