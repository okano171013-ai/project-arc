# Project ARC — PM Status

最終監査日: 2026-07-22（Version42時点に更新）  
基準HEAD: `864e75c`（Version42、`docs/reports/Version42_Report.md`参照）  
作業ツリー: `.claude/settings.local.json`のみ未追跡（ローカル設定、対象外）。

## 5分サマリー

Version1〜42まで完了。local生活記録、Google連携、検索・意思決定支援、HTTP/MCP、提案承認、Agent協調、Life Log、行動介入、Study Session（対話型ライフサイクル対応）、Capability Registry（環境診断拡充）、Runner Control Plane、Data Durability、Program A（読み取り専用公開）、**Program B Mobile Ingress（ローカル完成＋Cloudflare Workers実装をローカルエミュレータで実機検証、cloud側Quick Capture UI実装済み）**まで到達した。Version40では、Owner本人発信のCritical指示に基づき、AgentDelegationGrant scopeを拡張して低リスク記録9種のProposal省略を可能にし、保存信頼性契約（read-after-write・saved/verified区別）を導入した（ADR 0072）。Version41では、Owner本人が実際にMemory型の保存で感じた不便さを受け、MemoryもAgentDelegationGrant scopeへ追加した（ADR 0073）。Version42では、ADR 0074（Notion当面主運用化）決定の直後にOwnerが「Notion連携をコードとして今すぐ実装する」を明示選択したことを受け、NotionをMobile Ingressと同格の新しいTransport sourceとして統合した（ADR 0075、`NotionClient`／`PullNotionEntriesUseCase`／`pnpm mobile-sync notion-pull`）。設計思想はOwner主権、Systemは判断しない、local-first、層境界の維持。

Owner優先順位（2026-07-19）により、Version35からProgram B
（Mobile Daily Capture）を最優先で進めた。Version35〜37でローカル
MVP・セキュリティ強化・退避ログImporterを完成させた（ADR 0064〜
0068）。Version38はCloudflare Workers実装をMiniflareで実機検証した
（ADR 0069）。**Version39は、ARCがGit経由で送った指示書
（2026-07-20、`docs/handoff/archive/Version39_ARC_Brief.md`）**を
受け、「クラウド待機キューまでで、PC-off対応完了とは言えない」
というARCの指摘に応え、cloud Worker側`GET /`にQuick Capture UI
（Reflection/MealLog/NutritionLog/WeightLog/FinanceLog明示選択、
per-request nonceのCSP、token非埋め込み）を実装した。あわせて、
「PC-off保存」を(a)cloud ingress受付・(b)canonical ARC確定・
(c)read availabilityへ分解したCapability/Gap表（ADR 0070）と、
Canonical Store所在の3案比較（ADR 0071、実移行なし）、デプロイ前
preflightチェック（`pnpm cloudflare:preflight`）を追加した。実機
ブラウザ検証で2件の実装バグ（CSP inline-style属性ブロック、
非表示fieldset内`required`によるフォーム全体ブロック）を発見・
修正した。**クラウド契約・課金・本番公開・秘密情報設定・認証済み
LAN公開の有効化は一切実施していない**（Owner指示通り）。

**Version40は、Owner本人発信のAgentMessage（id `ba6548bc-...`、
Critical、`docs/handoff/archive/Version40_ARC_Brief.md`）**を受け、
MealLog/NutritionLog/WeightLog/Reflection/ChallengeLog/CheckIn/
DistractionSignal/Appearance/ManagementFeedbackの9種を対象に、
既存の`AgentDelegationGrant`（Version24〜、Constitution第4条限定
改定）のscopeを拡張することで、個別Proposal承認なしの保存を可能に
した（新規`*_create`ツールは追加せず既存の`proposal_create`を
拡張、ADR 0072）。過去Version（25〜26）から`AUTO_APPROVABLE_TYPES`
に含まれていた`FinanceLog`は、Owner指示に基づき明示的に除外し、
常にOwner個別確認を要求するよう是正した。StudySessionの対話型
ライフサイクル（create/update/finish/list、日次・期間集計）を
MCP Tool6件として新規追加し（Version27の「MCP Toolは用意しない」
方針をOwner指示により意図的に反転）、全ての自動保存パスへ
read-after-write検証・`saved`/`verified`区別・失敗時の
`retryQueueId`を実装した。`capability_registry_get`へ実行環境
診断情報を追加し、`scripts/mirror-agent-messages.mjs`
（AgentMessage→Git Inboxミラー）を新設した。実際のGrant発行・
Constitution/Principlesの変更は一切実施していない（発行は
Constitution第4条によりOwner自身の操作が必要）。

Owner向け判断事項は`docs/project-management/
Version35_Decision_Packet.md`・`Version37_Decision_Packet.md`・
`Version38_Activation_Packet.md`（実デプロイの1ページ実行
チェックリスト、Version39でQuick Capture UI分を追記）に集約した。

## 現在の進捗

| 項目 | 状態 |
|---|---|
| Version1〜34 | 完了 |
| Version35 | 完了（Program B Architecture Gate整理、Mobile Ingressデータ契約確定、ローカルMVP実装・実機確認） |
| Version36 | 完了（Quick Capture UI、`MOBILE_INGRESS_HOST` opt-in、sync自動化スクリプト） |
| Version37 | 完了（Mobile Ingressセキュリティ強化、退避ログJSONL Importer、Cloud Adapter境界整理） |
| Version38 | 完了（Cloudflare Worker実装・Miniflare実機検証、最小権限read契約、pull/reconciliation、NutritionLog対応） |
| Version39 | 完了（Cloud Quick Capture UI、CSP nonce、token非埋め込み、PC-off Capability/Gap表、Canonical Store所在3案比較、`cloudflare:preflight`） |
| Version40 | 完了（AgentDelegationGrant scope拡張、保存信頼性契約、StudySession対話型ライフサイクル6ツール、`capability_registry_get`環境診断拡充、AgentMessage→Git Inboxミラースクリプト） |
| Version41 | 完了（Owner本人指示によりMemoryをAgentDelegationGrant scopeへ追加、ADR 0073） |
| Version42 | 完了（Notion Transport統合：`NotionClient`／`PullNotionEntriesUseCase`／`pnpm mobile-sync notion-pull`、ADR 0075） |
| Typecheck / Lint | 2026-07-22合格（Version42時点で再確認、`cloudflare:typecheck`も合格） |
| Build | 不合格。TS2742と`dist`書込競合（Version31以降スコープ外、ARC-PM-005として継続。Version42で`git stash`比較により無関係を再確認） |
| Test | Version42時点675件合格（メイン、94 test files）＋17件合格（`pnpm cloudflare:test`、別ゲート） |
| Remote MCP | 認証の実装・テストは完備（Version22）。**本番は今なお無認証**（ADR 0051の「有効化した」という記録は誤りだったとVersion30で判明、訂正済み）。MCP Tool数32（Version40でStudySession系6件追加、26→32）。**2026-07-20〜21の公開Remote MCP旧ツール問題は解決済み**（`docs/incidents/2026-07-20_remote-mcp-stale-tools.md`）——根本原因はOwner PC側のプロセスが36コミット・2日間再起動されていなかったこと。`git pull`→プロセス再起動後、localhost・公開URL・ChatGPT新規チャットの3経路全てで`toolCount: 32`・`buildCommit: db3dc22`一致を実機確認済み |
| Program A | DevelopmentGrant・AgentTaskが読み取り専用でARCから確認可能。write操作は未公開（変化なし） |
| Program B | ローカルMobile Ingress完成（認証・rate limit・監査ログ・退避ログImporter）。Cloudflare Worker実装（cloud側Quick Capture UI込み）をMiniflareで実機検証済み・未デプロイ。実デプロイはOwner確認待ち（`Version38_Activation_Packet.md`）。「PC-off対応」は(a)cloud ingress受付のみ達成、(b)canonical確定・(c)全履歴read availabilityは未達（ADR 0070のCapability/Gap表） |
| Data Durability | `pnpm backup create/list/restore`が動作。`data/ingress-records.json`も自動的にbackup対象に含まれることを実機で確認済み |
| Bridge Layer | MealLog/NutritionLog/WeightLog/FinanceLog/StudySessionのImport/Export対応を追加（Version9〜27間のギャップ解消） |

## Open Issues

| ID | Priority | Issue | 状態 / 完了条件 |
|---|---|---|---|
| ARC-PM-001 | P0 | 公開Remote MCPが無認証 | **実装済み・テスト済み（Version22、Version30でsecurity review完了）。本番`.env`有効化のみ未実施** — Owner Actionのみ残存。手順は`docs/setup/remote-mcp-oauth-migration.md`（Version30改訂、one-shot checklist） |
| ARC-PM-004 | P0 | Version29未コミット・未検証 | Version30時点で解消（wipコミットにより確定・push済み） |
| ARC-PM-005 | P1 | Build再現不能 | clean環境とCIでbuild成功 |
| ARC-PM-006 | P1 | Roadmap / README / DoD / Reportsの重複・矛盾 | 本文書を現況の唯一の入口にする |
| ARC-PM-007 | P1 | OpenAPIが主要10 endpoint限定 | API契約の単一情報源と差分検知 |
| ARC-PM-008 | P1 | `server.ts`等の巨大化と多層同期漏れ | module分割、contract test |
| ARC-PM-009 | P1 | StudyLog / StudySession / Task未整理 | ADRでcanonical modelを決定 |
| ARC-PM-010 | P1 | package `0.20.0`とProject Version不一致 | release identity規約 |
| ARC-PM-011 | P2 | ADR status・形式不統一 | ADR indexとtemplate |
| ARC-PM-012 | P2 | AGENTS / CLAUDE重複、Claude偏重 | 共通規約へ集約 |
| ARC-PM-013 | P2 | `apiKeyAuth.ts`（ARC Connector）が非timing-safe比較 | Version30 security reviewでの観察。ローカル専用のため実害は限定的。次回機会に`timingSafeEqual`化を検討 |

解決済み（Open Issuesから除外）：
- **ARC-PM-003**（Claude許可設定の`rm -rf data`）：OwnerがWindowsローカル側で該当許可2件を除去し、JSON正常性を確認済み（Version30、2026-07-19）。
- **ARC-PM-002**（JSON生活データのbackup/restore/schema migration契約なし）：Version31で解決。`jsonStore.ts`のatomic書き込み化、`BackupService`・`pnpm backup create/list/restore`、世代retention（既定10世代）を実装し、実機で復元演習を確認済み。schemaVersionはmanifestレベル（`"1"`）のみ、行レベルは次Version以降（ADR 0058「未決定」参照）。
- **ARC-PM-014**（「現在退避中の16件」の実体不明）：Version37で解決。実データはOwnerのCodex workspaceに保管されており、取り込み形式・重複防止規則をADR 0067として確定、`pnpm import-pending-logs`を実装・テスト済み（合成データのみ、実データはこのリポジトリに含まれない）。実際の取り込みはOwner自身が実行する。

## 現在の目標・次のマイルストーン

**運用方針（2026-07-21、Owner決定、ADR 0074）**：ChatGPT接続の
チャットごとの不安定さ・Remote MCPのPC依存（PCが起動していないと
使えない）が実際の日常利用で繰り返し問題になったため、**Owner本人が
当面Notionを個人情報記録の母体とし、Project ARCは日常使いから
一時的に外す**と判断した。**コードは一切ロールバックしない**——
Version1〜41（665件のテスト合格）はそのまま維持し、開発も継続する。
将来Remote MCP接続の安定性・PC-off Gapが解決した時点で、Notionの
データを一括でProject ARCへ移行し運用を戻す想定。詳細はADR 0074参照。

**Notion Transport統合（2026-07-22、Owner決定、ADR 0075）**：ADR
0074決定の直後、OwnerがClaude.ai側で公式Notionコネクタを接続し、
「Project ARCのコードとしてNotion連携を実装する」を明示選択した
（ADR 0074「見送った案」の一部撤回）。NotionをMobile Ingressと
同格の新しいTransport sourceとして位置づけ、既存のCanonicalize
パイプライン（`IngressRecord`/`ReceiveIngressRecordUseCase`/
`SyncIngressRecordsUseCase`）をそのまま再利用した。pull-only、
Notion側ページは削除せず`Synced`チェックボックスで管理する。
`NOTION_API_KEY`/`NOTION_DATABASE_ID`は未設定ならopt-inで無効の
まま。実際のNotion APIとの疎通は本サンドボックスから確認できない
（`api.notion.com`への直接到達性なし）ため、Owner環境での実機確認が
必要。詳細はADR 0075・`docs/reports/Version42_Report.md`参照。

**Program B**: Architecture Gate論点整理（ADR 0064）、Mobile Ingressデータ契約（ADR 0065）、ローカルMVP、Quick Capture UI・sync自動化（Version36）、セキュリティ強化・退避ログImporter・Cloud Adapter境界（Version37）、Cloudflare Worker実装のMiniflare実機検証・pull/reconciliation（Version38）、cloud側Quick Capture UI・CSP・token非埋め込み・PC-off Capability/Gap表（ADR 0070）・Canonical Store所在3案比較（ADR 0071）・`cloudflare:preflight`（Version39）まで完了。次はOwner確認事項（`MOBILE_INGRESS_HOST`のLAN公開＋トークン設定、実際の16件の取り込み、Cloudflare実デプロイ、ADR 0071・案Cの要否）の回答を受けての実地確認。契約・課金・秘密情報設定・実デプロイは`Version38_Activation_Packet.md`の手順が確定するまで未実施のまま凍結する。

**Program A/Write Proposal Layer**: Version40でAgentDelegationGrant scope拡張（Appearance/ManagementFeedback追加、FinanceLog除外）・保存信頼性契約（read-after-write・saved/verified区別）・StudySession対話型ライフサイクル6ツール・`capability_registry_get`環境診断・AgentMessage→Git Inboxミラースクリプトを実装した（ADR 0072）。次はOwner自身によるAgentDelegationGrant発行（Constitution第4条によりOwner操作必須）を待って、実際のChatGPT/Gemini接続からの体験確認を行う。

**Stability Gate**: 残りARC-PM-005〜010を閉じる。ARC-PM-001は本番反映（Owner Action）のみ残存、ARC-PM-002〜004・014は解消済み。外部公開、認証、秘密情報、データ削除はOwner承認が必要。

## 技術的負債

- P0: なし（ARC-PM-002は解決、ARC-PM-001は本番反映のみ残存）
- P1: build、契約同期、巨大module、model重複、release管理、文書正本
- P2: 命名・template・歴史資料、Docker/Supabase説明、apiKeyAuthのtiming-safe化、Entity行レベルschemaVersion、未対応type（RewardSystem等7種）へのEntity設計要否（Owner/ARC判断待ち）

## 停止中タスク

- OAuth本番有効化: 準備完了（Version30）。Owner承認と接続再設定待ち——`docs/setup/remote-mcp-oauth-migration.md`のチェックリストで一度で実行できる
- Program B（Mobile Ingress）クラウドActivation Gate: ローカルMVPは完成済み（Version35〜37）。Cloudflare Worker実装（cloud側Quick Capture UI込み）はMiniflareで実機検証済み・未デプロイ（Version38〜39、ADR 0069・0070）。実デプロイの実行手順は`Version38_Activation_Packet.md`（1ページ、Version39でQuick Capture UI分を追記）に整理済み——実行はOwner確認待ち
- ADR 0071・案C（Hybrid read-through cache）の要否: Owner/ARCの価値判断待ち（急ぎ度：低）
- `MOBILE_INGRESS_HOST`のLAN公開＋`MOBILE_INGRESS_API_TOKEN`設定の有効化: Owner確認事項（確認事項3、`Version35_Decision_Packet.md`）——スマホからの実送信に必要。認証機構は実装済み（fail-closed、ADR 0066）
- 実際の16件の取り込み: Owner自身が`pnpm import-pending-logs`を実行（Importerは実装済み、ADR 0067）
- Appearance/ManagementFeedback/Memory等を含むAgentDelegationGrantの発行: Owner自身が`proposal_create`（type: AgentDelegationGrant）→`do`→`proposal_approve`で実行する必要がある（Constitution第4条によりClaude Code・ARC自身は発行できない、Version40〜41、ADR 0072・0073）——保留中の「ほしい物リスト・方針」の保存にはMemory scopeを含むGrant発行が必要
- Notion Internal Integration Tokenの作成・対象データベースへの共有・`NOTION_API_KEY`/`NOTION_DATABASE_ID`設定: Owner作業（Notion側のUI操作、Claude Code/ARCは代行できない、Version42、ADR 0075）——設定後の`pnpm mobile-sync notion-pull`実機確認もOwner環境で必要
- StudySessionツールの監査ログ（ApprovalDecision）対応の要否: Owner判断待ち（急ぎ度：低、Version40 Report8章）
- `STUDY_TIMER_API_TOKEN`と実timer疎通: Owner作業
- StudyLog配線: StudySessionとのmodel判断待ち

## 更新ルール

Version開始・完了、Priority変更、Owner判断、停止・再開時に更新する。履歴はReport / Developer Feedbackへ置き、ここには現在形だけを書く。
