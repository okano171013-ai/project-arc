# Developer Feedback — Version40

## メタデータ

- Version / 日付: Version40 / 2026-07-21
- 担当エンジン: Claude Code
- Git commit / tag: （コミット後の追記コミットで実ハッシュに置き換える）
- 対応Issue / 関連Report: 低リスク記録の直接保存API化・StudySessionツール優先追加・保存信頼性契約 / `docs/reports/Version40_Report.md`
- 状態: Complete（ローカル実装・実機確認のみ。実際のGrant発行はOwner確認待ち）

## 1. 目的

Owner本人発信のAgentMessage（id `ba6548bc-...`、Critical）に基づき、
①低リスク記録9種のProposal不要保存、②StudySession対話型ライフ
サイクルの最優先追加、③FinanceLog等は引き続きOwner個別確認、
④保存信頼性契約（read-after-write・冪等性・失敗の非成功扱い）、
⑤MCP接続安定性・`capability_registry_get`拡充、⑥AgentMessage→Git
Inboxミラー経路整備を実施する。あわせて着手前に発見した緊急診断
（公開Remote MCPの旧10ツール問題）にも対応する。

## 2. 実装

- 追加：`InProgressStudySession`Entity・Repository・Adapter、
  `StartStudySessionUseCase`/`UpdateStudySessionUseCase`/
  `FinishStudySessionUseCase`/`ListStudySessionsUseCase`
- 追加：MCP Tool 6件（`study_session_create`/`update`/`finish`/
  `list`、`study_summary_by_date`/`by_period`）、HTTP Route4本
  （`/study-sessions/*`）
- 追加：`scripts/mirror-agent-messages.mjs`
- 変更：`WriteProposalGatewayUseCase`（`AUTO_APPROVABLE_TYPES`再編、
  read-after-write検証、`saved`/`verified`/`retryQueueId`/
  `saveError`フィールド）、`AgentDelegationGrant`（scope型再編）、
  `ClassifyApprovalLevelUseCase`（FinanceLog型固定Level2）、
  `capabilityRegistry.ts`（`environment`診断情報、
  `PROJECT_ARC_VERSION`更新）
- Before：MealLog等はGrantで自動承認可能だったが、Appearance/
  ManagementFeedbackは対象外。FinanceLogは（過去Versionの設計上）
  対象内だった。StudySessionはMCP経由で一切操作できなかった。
  保存の成否は`executeApproval`が例外を投げるか否かでしか判別
  できず、実際に保存されたかの検証はなかった。
- After：9型全てがGrant scope拡張の対象になり得る（FinanceLogは
  型システムレベルで対象外に固定）。StudySessionの開始・更新・
  終了・一覧・集計がMCP経由で完結する。保存の成否は
  `saved`/`verified`で機械的に区別できる。

## 3. 設計判断

- **採用案**：9個の新規`*_create`ツールではなく既存
  `AgentDelegationGrant`機構のscope拡張で対応する。理由：
  「書き込み経路を増やさない」というADR 0039・0048・0051の一貫した
  方針を継続するため。指示文自身がこの代替を明示的に許可していた。
- **採用案**：FinanceLogを`AUTO_APPROVABLE_TYPES`・
  `AgentDelegationGrantScope`から除外する。理由：Owner指示項目3が
  明示的に要求。過去Versionの設計判断（Version25〜26でFinanceLogを
  含めていた）を、Owner本人の現在の指示で上書きする。
- **採用案**：StudySessionツールはProposal層・Grant・
  ApprovalDecision監査を経由しない直接書き込みとする。理由：
  既存のStudy Timer Gateway（Version27、Bearer token認証のみ）と
  同じ設計思想（機械的記録、Owner確認を要する「判断」を含まない）
  を踏襲するのが最も一貫性が高いため。Version27の「MCP Toolは
  用意しない」という判断はOwner本人の今回の指示で明示的に反転
  させた。
- **見送り案**：新しい永続的な再試行キューEntityの追加。理由：
  既存のidempotencyKeyベースdedupで実質的に同じ効果が得られる
  ため（Principle 9 YAGNI）。

## 4. 理由

Constitution第4条・ADR 0031に関わる判断（AUTO_APPROVABLE_TYPESの
拡張・縮小）を含むため、ADR 0072を新規作成した
（DEVELOPMENT_RULES.mdの「Constitution・設計保証に関わる判断はADR
必須」に該当）。`docs/security/remote-mcp-threat-model.md`13章に
実機監査結果を記録した。

## 5. 副作用

- 互換性：既存の`recordStudySession`/`summarizeStudySessions`
  （Study Timer Gateway専用経路）には変更なし。既存の
  Reflection/ChallengeLog/MealLog等のAUTO_APPROVABLE挙動にも変更
  なし（FinanceLogのみ除外）。`Proposal`/`ApproveProposalOutput`
  への新フィールドは全てoptionalで後方互換。
- セキュリティ：FinanceLogの自動承認経路を閉じたことはセキュリティ
  上の改善。StudySession直接書き込みツールは新しい書き込み面だが、
  既存のStudy Timer Gatewayと同水準のリスクと判断した
  （`docs/security/remote-mcp-threat-model.md`13.3）。
  `capability_registry_get`がファイルパス情報を返すようになった
  点は認識しておくべき差分（13.4）。
- 運用：`scripts/mirror-agent-messages.mjs`はOwner自身がPC上で
  手動実行する新しい運用ステップ（`docs/handoff/README.md`「経路C」
  参照）。

## 6. テスト

- 実行コマンド：`pnpm typecheck && pnpm lint && pnpm test`
- 結果：**660件合格**（92 test files、Version39時点644件+16件）、
  失敗・skip・pendingなし
- ARC-PM-005（`pnpm build`のTS2742失敗）は、本Versionの変更を
  `git stash`した状態でも再現することを確認し、無関係であることを
  再確認した。
- 実機確認：実際に`pnpm run api`+`pnpm run mcp:remote`を起動し、
  実MCP clientでStudySessionライフサイクル全体・
  `capability_registry_get`の新フィールドを確認。
  `scripts/mirror-agent-messages.mjs`も合成テストデータで転記・
  重複防止の実機確認を行った（確認後、テストデータは削除・
  `ARC_INBOX.md`は`git checkout`で元に戻した）。

## 7. 未解決

- StudySessionツールのApprovalDecision監査対応（技術的負債として
  記録、Owner判断待ち）。
- `scripts/mirror-agent-messages.mjs`のCollaboration Runnerへの
  統合（今回のスコープ外）。
- 実際のAgentDelegationGrant（Appearance/ManagementFeedback含む）
  の発行はOwner自身の操作として残る。

## 8. 次Version

1. Owner確認後、実際にGrantを発行し新しい自動保存体験を確認する
   （依存：Owner確認）
2. `scripts/mirror-agent-messages.mjs`の定期実行統合を検討する
   （依存：Owner/ARCの優先度判断）
3. StudySessionツールの監査ログ対応の要否を相談する（依存：Owner
   判断）

## 9. Owner確認事項

- **【急ぎ度：高、継続】公開Remote MCPが旧10ツールのままな件**：
  Version39から継続。Gemini実接続で`agent_message_list`（サーバー
  側が最新でなければ存在しないツール）が呼び出せたことから、
  サーバー側は既に最新（本Versionからは32ツール）で動作しており、
  クライアント（ChatGPT/Gemini）側のconnector cacheが古いだけの
  可能性が高いと判断した。Geminiに`capability_registry_get`を
  直接名前指定で呼ばせ、`toolCount: 32`が返れば確定する
  （`docs/incidents/2026-07-20_remote-mcp-stale-tools.md`参照）。
- **AppearanceLog・ManagementFeedback・（既存の）MealLog等をscopeに
  含む新しいAgentDelegationGrantを発行するかどうか**：発行は
  Constitution第4条により必ずOwner自身の`proposal_create`
  （type: AgentDelegationGrant）→`do`→`proposal_approve`という
  既存フローを経由する——Claude Codeは代行できない。急ぎ度：低〜中
  ——発行しない限り、これまで通りProposal経由の個別確認が必要な
  だけで、既存の運用は壊れない。
- **StudySessionツールの監査ログ非対応を許容するか**：Study Timer
  Gatewayと同じ設計だが、将来ChatGPT/Geminiが直接呼べる経路が
  増えるため、監査要件を今のうちに強化すべきか確認したい。急ぎ度：低。
- Version37〜39から継続する確認事項（LAN公開＋トークン設定の
  有効化、16件の実取り込み、Cloudflare実デプロイ、ADR 0071・案C）
  は変化なし。

## 10. 関連ADR

- 新規：ADR 0072（AgentDelegationGrant scope拡張・保存信頼性契約・
  StudySession直接書き込みツール）

## 完了宣言

- [x] Report、Feedback、Roadmap、PM Status、Open Issuesが同じ事実を示す
- [x] commit / tagを記録する（本コミット後の追記コミットで実ハッシュに置き換える）
- [x] 未実行テストを成功扱いしていない（660件全件実行・全件合格を実機で確認）
- [x] Owner確認事項を通常タスクへ埋没させていない（9章に明記）
- [x] 次担当者がこの文書だけで再開できる（8章に依存関係付きで記載）
