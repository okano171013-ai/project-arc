# Project ARC PM Review — 2026-07-19

## Executive Summary

Project ARCは個人開発として異例に強い設計規律と記録量を持つ。一方、Version28までの高速拡張により、security、data durability、release再現性、文書の現在性が機能数に追いついていない。現状は「機能は豊富だが、安心してVersion100へ進める基盤ではない」。次の5Versionは新機能より安定化へ投資すべきである。

監査対象はsource、test、設定、README、core docs、ADR 0001〜0056、Roadmap、DoD、Reports、ARC Feedback、Handoff、setup、operations、security、proposals、CI、AI向け指示。`.env`と実dataは秘密・個人情報のため内容を読んでいない。

## Step 1 — 現状把握

### Version別成果

| Version | 主な成果 |
|---|---|
| 1〜4 | Clean Architecture骨格、JSON local persistence、Google連携、Memory / Reflection |
| 5〜9 | 各種Life Log、Smart Capture、HTTP Connector、Timeline、Bridge |
| 10〜13 | External Brain、Knowledge Retrieval、Decision Support、Conversation Gateway |
| 14〜18 | Proposal write、ManagementFeedback、MCP、AgentMessage、Remote MCP / OpenAPI |
| 19〜24 | Continuous Collaboration、Runner、Approval Policy、Authority、限定Delegation |
| 25 | Meal / Nutrition / Weight / Finance Log、append-only correction |
| 26 | Check-in、Distraction、Intervention |
| 27 | Study Session ingestion |
| 28 | MCP Capability Registry |
| 29 | Runner Control Plane。未commit・完了gate未通過 |

現在はlocal生活dataの記録・検索、Google Calendar / Tasks、CLI / HTTP / MCP、proposal-based write、Agent間message、runner、check-in、行動介入が可能。未完成はRemote MCP OAuth本番化、data backup/migration/restore、StudyLog/StudySession/Task整理、OpenAPI全量化、V29完了、一般Level1 delegation。

設計思想はOwner主権、Systemは候補と記録を扱い最終判断しない、local-first、Clean Architecture、proposal write、append-only correction。思想は良い。問題は実運用と公開面が追いついていない点にある。

## Step 2 — ドキュメント監査

重大な不整合は以下。

1. `package.json`は`0.20.0` / Version20のまま、実体はV28/29。
2. READMEにV13時点の説明と、実装済みDecision Engineを将来候補とする記述が残る。
3. Roadmapは現行Versionと旧「長期ロードマップ2.0」のVersion番号を再利用する。
4. DoDは807行で、現行gate、過去実績、未完了Issueが混在する。
5. V24の名称はOAuth本番化を想起させるが、実際には認証未有効。
6. OpenAPIはADR上主要10 endpoint限定で、現在のAPIを表さない。
7. ArchitectureのSupabase説明とJSON中心の現実の主従が不鮮明。
8. V28/V29 Reportは短く、必須Report templateに従わない。
9. FeedbackはV5以降のみで、Reportと長文重複するVersionが多い。
10. V1 Report、V8 handoff等の欠番、filename case不統一がある。
11. AGENTSとCLAUDEが重複し、Codexを含む実際の分担を表さない。

過去資料は削除せず監査証跡として保持する。ただしHistorical / Superseded labelとindexで現行情報から分離する。

## Step 3 — ADR監査

更新対象:

- 0001は0003によりSuperseded
- 0002はV2再検討期限を過ぎており再判定
- 0004はAcceptedと「V3では不採用」の矛盾を解消
- 0041は認証部分を0044によりPartially Superseded
- 0042はngrok採用実績を反映
- 0044は無認証公開の期限・撤回条件・risk acceptanceを明記
- 0050は0051によりRejected / Superseded
- 0054〜0056は共通見出し、status、impact、rollbackを補う

不足ADR:

- JSON schema/version/migration/atomicity/backup
- Project Version、semver、git tag、buildCommitのrelease identity
- 文書single source of truthとlifecycle
- OpenAPIと実APIのcontract生成
- Claude / Codex / ChatGPTの承認・責任境界
- StudyLog / StudySession / Taskのcanonical model
- life data retention/privacy/incident response
- test pyramid、contract test、release gate

歴史ADRは削除不要。0012〜0029はindexで領域別に束ね、今後は複数Versionへ影響する判断にADRを限定する。

## Step 4 — Roadmap監査

V1〜28の大筋はgitとReportsに一致する。ただしVersion / Phase / release statusが混同される。V23は計画中心、V24は認証本番化ではなくdelegation導入、V29は未完了である。今後は各項目に`Proposed / Planned / In Progress / RC / Complete / Superseded`、受入条件、ADR、Report、commit/tagを持たせる。

## Step 5 — 技術的負債

### P0

- 無認証Remote MCP公開。write/approve能力を持つ
- JSON生活dataのbackup / restore / migration契約不在
- `.claude/settings.local.json`に`rm -rf data`許可
- V29未commit・未検証。runner実動信頼性に関係

### P1

- build failure（TS2742、生成物書込競合）
- `http/server.ts` 1,100行超、Connector / WriteProposalGateway等の肥大化
- API / MCP / serializer / OpenAPIの手動同期漏れ
- OpenAPI不完全、release identity不一致
- StudyLog / StudySession / Taskの重複・孤立
- JSON repositoryのtransaction/concurrency保証不足
- issue台帳不在、Report/Feedback/Handoffの重複

### P2

- ADR templateと言語、report filenameの不統一
- 古いVersion/Docker/Supabase説明
- `.mcp.json`の`npx tsx`によるruntime drift
- CI内コメントの文字化け

## Step 6〜9 — 長期運用制度

- Developer Feedbackは`docs/developer-feedback/TEMPLATE.md`を正本とし、未作成ならVersion Completeにしない。
- `docs/project-management/STATUS.md`を5分で読める現況の唯一の入口とする。
- 再編案は`docs/project-management/DOCUMENT_STRUCTURE.md`。即時大量移動はしない。
- Claude Codeを含む全Agentは`docs/governance/DEVELOPMENT_RULES.md`の開始/終了gate、ADR判定、Owner専権境界に従う。

## Step 10 — 最終評価

### 良い点

- Owner主権とSystem/ARC境界が一貫
- Clean Architectureとproposal writeが安全な拡張軸
- ADR / Report / Feedbackを残す文化
- test増加と実際の回帰捕捉
- local-firstとappend-only correctionがlife dataに適合

### 問題点

- 記録量は多いが現在の正解が一箇所にない
- securityとdata recoveryが機能開発より遅い
- Version完了の意味が文書ごとに違う
- AI別の指示・承認が分散し危険許可も残る
- API増加に巨大fileと手動同期が限界

### 優先改善

1. P0を閉じるまで外部公開能力と新機能を増やさない
2. backup / restore / schema migrationを製品機能として扱う
3. PM StatusとOpen Issuesを唯一の現在情報源にする
4. release identityと完了gateを自動検査する
5. API contractを単一情報源化し巨大moduleを分割する

### 今後5Version

| Version | テーマ | 完了条件 |
|---|---|---|
| 30 | Security & Permission Hardening | Remote MCP認証強制、破壊的AI許可除去、脅威test |
| 31 | Data Durability | backup、世代保持、schemaVersion、migration、restore drill |
| 32 | Release & Documentation Control | release identity、PM dashboard、ADR index、link/整合CI |
| 33 | API Contract & Modularity | OpenAPI全量、contract test、server/connector分割 |
| 34 | Domain Consolidation & Operations | Study/Task整理、runner SLO、監視、incident runbook |

### 全体評価

**B-（設計思想A、機能実績A-、運用耐久性C、security C-、引き継ぎB-）**。

Version100へ到達する素質は十分ある。しかし現状のまま機能追加を続けると、Version40前後で「どの文書が正しいか」「dataを安全に変換できるか」「公開面を信頼できるか」が速度を止める可能性が高い。次の5Versionを基盤整備へ使えば、以後の開発速度と安心感は上がる。
