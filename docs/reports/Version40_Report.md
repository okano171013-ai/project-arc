# Version40 Report: 低リスク記録の直接保存API化・StudySessionツール優先追加・保存信頼性契約

commit: （このセクションはコミット後の追記コミットで実ハッシュに置き換える）

## 1. Version概要

Owner本人発信のAgentMessage（id `ba6548bc-c550-43a6-b5a1-
7ab4dd4c9889`、Critical優先度）に基づき実施した。このAgentMessageは
本番Project ARCへ保存済みだったが、このセッションから
`agent_message_list`を呼ぶと`fetch failed`となり本文を直接取得できな
かったため（本番と別データストアを見ているため）、Ownerがチャット
上に原文をそのまま貼り付けて伝達した。あわせて、着手前に発見した
別の緊急指示（「公開Remote MCPが旧10ツールのまま」の読み取り専用
診断）にも対応した。

指示は、既存のWrite Proposal Layer（ADR 0031）・
`AgentDelegationGrant`（ADR 0051）を活用し、①MealLog等9種の低リスク
記録をOwnerの個別承認なしで保存できるようにする、②StudySessionの
対話型ライフサイクルツールを最優先で追加する、③FinanceLog等は
引き続きOwner個別確認を要求する、④全保存処理へread-after-write
検証・冪等性・失敗の非成功扱いを実装する、⑤MCP接続の安定性を高め
`capability_registry_get`を拡充する、⑥AgentMessage→Git Inboxの
ミラー経路を整備する、という6つの技術要求と、既存のConstitution・
ADR 0031との整合性確認（項目8）を含んでいた。

## 2. 今回実装した機能（理由も含めて説明）

- **AgentDelegationGrant scope拡張**（ADR 0072）：`Appearance`・
  `ManagementFeedback`を`AgentDelegationGrantScope`・
  `AUTO_APPROVABLE_TYPES`へ追加した。新規の`*_create`MCP Toolは
  追加せず、既存の`proposal_create`（type指定）がGrantのscopeに
  含まれる型を即時保存する既存の仕組み（Version24）をそのまま
  拡張した——「書き込み経路を増やさない」というADR 0039・0048・
  0051の一貫した方針を継続するため。
- **FinanceLogの自動承認を撤回**：コード監査の結果、過去
  （Version25〜26）から`AUTO_APPROVABLE_TYPES`に`FinanceLog`が
  含まれていたことが判明した。Owner指示項目3が明示的にFinanceLog
  を「従来どおりOwnerの明示確認を維持」する対象としたため、
  `AgentDelegationGrantScope`という型自体から除外し、
  `ClassifyApprovalLevelUseCase`の型固定Level2ルールへ追加した
  （二重の安全装置）。
- **保存信頼性契約**（ADR 0072）：`createProposal`の自動承認パスと
  `approveProposal`に、read-after-write検証（保存直後に対応する
  Repositoryから再取得し一致を確認）を追加した。失敗時は
  `saved: false`・`saveError`・`retryQueueId`を返し、Grantの
  `usageCount`は消費しない（失敗した試行にOwnerの委譲予算を使わせ
  ない）。`retryQueueId`は既存のidempotencyKeyをそのまま再利用し、
  新しい永続的な再試行キューEntityは追加しなかった（Principle 9
  YAGNI）。`proposal_create`/`proposal_approve`のtool descriptionを
  更新し、ChatGPT側が「提案のみ／承認された／保存された／検証
  済み／失敗した」を機械的に区別できるようにした。
- **StudySession対話型ライフサイクル**（Owner指示「最優先」）：
  `study_session_create`/`update`/`finish`/`list`、
  `study_summary_by_date`/`study_summary_by_period`の6ツールを
  新規追加した。完了していないセッションは新設の
  `InProgressStudySession`Entityで保持し、`finish`時に既存の
  `RecordStudySessionUseCase`（Version27、外部Study Timerアプリと
  共有する正本）へ委譲して確定保存する——StudySessionの確定保存
  経路を2つに増やさない設計。Version27が明示的に決めた「MCP Tool
  は意図的に用意しない」方針を、Owner本人の今回の指示により意図的
  に反転させた（`docs/security/remote-mcp-threat-model.md`13.3参照）。
  `study_summary_by_date`/`by_period`は既存の
  `SummarizeStudySessionsUseCase`（Timelineではなく正本の
  StudySessionから集計）をそのまま呼ぶだけで実装できた——「Timeline
  が0件を理由に学習時間0分と判定してはいけない」という指示は、この
  正しい集計tool自体が存在しなかったことが原因だったため、tool追加
  そのものが解決になる。
- **`capability_registry_get`の拡充**：`environment`
  （`cwd`・`dataDirectory`・`dataFileCount`・`processStartedAt`・
  `processUptimeSeconds`）を追加し、長寿命プロセスの陳腐化・
  データストアの取り違えを機械的に検出しやすくした
  （`docs/security/remote-mcp-threat-model.md`13.4参照）。
  `PROJECT_ARC_VERSION`をVersion34時点のまま止まっていた34から40へ
  更新した——Version35〜39の間この値が更新されていなかったこと
  自体が「staleness」の一因だったため。
- **`scripts/mirror-agent-messages.mjs`**：Owner自身のPCで実行し、
  本番のAgentMessage（`ToClaudeCode`）を`docs/handoff/ARC_INBOX.md`
  （Git経由の経路A）へ自動転記する。マーカーコメントによる冪等な
  重複防止を実装し、実際に合成テストデータで転記→再実行時の
  重複防止まで実機確認した（4章参照）。
- **緊急診断**（Version39完了後に発見、`docs/incidents/
  2026-07-20_remote-mcp-stale-tools.md`）：現在のソースコードが
  26ツール（Version39時点）を正しく公開する設計であることを、
  このセッションで実際にサーバーを起動し実MCP clientで確認した。
  Gemini実接続でのagent_message_list呼び出し成功という追加情報を
  受け、「サーバー側は最新、Gemini側のconnector cacheが古いだけ」
  という結論を強めた。

## 3. 実装しなかった機能（延期理由も記載）

- **9個の`*_create`MCP Toolを文字どおり追加すること**：指示自身が
  許可した代替（既存`AgentDelegationGrant`機構の拡張）を採用した
  ため見送った（ADR 0072決定1）。
- **StudySessionツールのApprovalDecision監査記録**：Study Timer
  Gatewayの既存設計（Bearer token認証のみ、Proposal層を経由しない）
  との一貫性を優先し、本Versionでは追加しなかった。将来監査要件が
  強まった場合の技術的負債として記録する（8章）。
- **新しい永続的な再試行キューEntity**：既存のidempotencyKeyベース
  dedupで実質的に同じ効果が得られるため、Principle 9（YAGNI）に
  従い見送った。
- **StudySessionの開始・終了時刻自体の訂正機能**：`update`は科目・
  タスクのみ対象。時刻訂正は既存のReflection/ChallengeLog同様、
  訂正・削除UseCase自体が未実装という既存の技術的負債（Version24
  から持ち越し）に含まれるため対象外とした。

## 4. Architecture Review

- 新規Entity：`InProgressStudySession`
- 新規Port：`InProgressStudySessionRepository`
- 新規Adapter：`JsonFileInProgressStudySessionRepository`
- 新規UseCase：`StartStudySessionUseCase`・`UpdateStudySessionUseCase`・
  `FinishStudySessionUseCase`（既存`RecordStudySessionUseCase`へ委譲）・
  `ListStudySessionsUseCase`
- 新規MCP Tool：`study_session_create`/`update`/`finish`/`list`・
  `study_summary_by_date`/`by_period`（6件、32ツールへ）
- 変更：`WriteProposalGatewayUseCase`（`AUTO_APPROVABLE_TYPES`再編、
  `verifyPersisted`追加、`saved`/`verified`/`retryQueueId`/
  `saveError`フィールド追加）、`AgentDelegationGrant`
  （scope型の再編）、`ClassifyApprovalLevelUseCase`（FinanceLog
  type固定Level2追加）、`Connector`（StudySession系4メソッド追加、
  `ConnectorProposal`拡張）、`capabilityRegistry.ts`
  （`environment`追加、`PROJECT_ARC_VERSION`更新）、
  `src/infrastructure/http/server.ts`（StudySessionライフサイクル
  route4本追加、DI配線）
- Domain層のCore（Reflection・MealLog等既存Entity）は無変更。
- 実機確認：`pnpm run api` + `pnpm run mcp:remote`をこのセッションの
  サンドボックスで実際に起動し、実MCP clientで
  `study_session_create`→`list`→`update`→`finish`→`list`→
  `study_summary_by_date`→`capability_registry_get`の一連を実行し、
  全て設計通りに動作することを確認した（検証用スクリプトは確認後
  削除済み）。`scripts/mirror-agent-messages.mjs`も、合成テスト
  データ（AgentMessage）を用いて実際に転記・重複防止まで実機確認
  した（`docs/handoff/ARC_INBOX.md`は確認後に`git checkout`で
  元へ戻した）。

## 5. ADR

- **新規：ADR 0072**（AgentDelegationGrant scope拡張・保存信頼性
  契約・StudySession直接書き込みツール）：Owner指示項目8が求めた
  ADR 0031・Constitution第4条との整合性確認を含む。

## 6. テスト

- `pnpm typecheck` / `pnpm lint`：合格
- `pnpm test`：**660件合格**（92 test files、Version39時点644件
  ＋16件新規：`InProgressStudySession`Entity5件、StudySession
  lifecycle use case 7件、`capabilityRegistry`3件、
  `WriteProposalGateway`関連2件——Appearance/ManagementFeedback
  auto-approve・FinanceLog除外・保存失敗時のsaved:false/
  retryQueueId/再試行成功）
- `pnpm cloudflare:test`（別ゲート、影響なし）：継続して17件合格
- **ARC-PM-005（`pnpm build`のTS2742失敗）が本Versionの変更と
  無関係であることを`git stash`比較で再確認**：Version40の変更を
  全てstashした状態でも同じエラーが再現することを確認した。
- **実機確認**：5章参照。実際のMCP client接続でStudySession
  ライフサイクル全体・`capability_registry_get`の新フィールド・
  `scripts/mirror-agent-messages.mjs`の転記・重複防止を確認した。

## 7. 修正したバグ（検出方法、原因、対応方法、再発防止）

- **`AUTO_APPROVABLE_TYPES`にFinanceLogが含まれたままだった**：
  検出方法はADR 0072執筆にあたりコード監査（現行の
  `AUTO_APPROVABLE_TYPES`定義を確認）を行ったこと。原因は
  Version25〜26でFinanceLogを他の生活記録型と一括してscope拡張した
  際、当時のOwner方針では問題なかったが、今回のOwner指示が明示的に
  方針転換したこと。対応は型定義（`AgentDelegationGrantScope`）と
  ランタイムの型固定Level2ルールの二重で除外した。再発防止：
  「常にOwner個別確認を要求すべき型」は、型システムレベルで
  Grantのscopeに含められないようにする（今回の`Extract<
  ProposalType, ...>`パターン）ことで、実装者が誤って含めることを
  コンパイルエラーとして検出できるようにした。
- **`PROJECT_ARC_VERSION`がVersion34のまま5Version分（35〜39）更新
  されていなかった**：検出方法はcapability_registry_getの出力を
  実機確認した際に気づいたこと。原因は各Version完了時のDoD
  チェックリストにこの値の更新が明記されていなかったこと。対応は
  40へ更新し、`docs/dod.md`のVersion40完了チェックリストへ明記した
  （9章参照）。再発防止：今後のDoDテンプレート自体にこの項目を
  残す。

## 8. 技術的負債（今後改善したい点）

- StudySessionライフサイクルツールはApprovalDecision監査ログを
  経由しない（Study Timer Gatewayと同じ設計、7章参照）——将来監査
  要件が強まった場合は追加を検討する。
- `capability_registry_get`の`environment.dataDirectory`等は無認証
  の`/mcp`エンドポイント経由で誰でも取得できる（実害は限定的と
  判断したが、Remote MCP認証導入時に再評価、`docs/security/
  remote-mcp-threat-model.md`13.4）。
- `scripts/mirror-agent-messages.mjs`はOwner自身の手動実行が前提
  ——Collaboration Runner（Version20）への統合は今回のスコープ外。
- StudySessionの開始・終了時刻自体の訂正機能は未実装のまま
  （Reflection/ChallengeLogと同じ既存の技術的負債、Version24から
  持ち越し）。

## 9. 次Versionへの申し送り（技術的観点から推奨する事項）

- Owner確認後、実際にAppearance/ManagementFeedback scopeを含む
  AgentDelegationGrantを発行し、実際のChatGPT/Gemini接続から
  Proposal不要の保存を体験してもらう。
- `scripts/mirror-agent-messages.mjs`をCollaboration Runnerの
  定期実行に統合するかどうかを検討する。
- StudySessionツールの監査ログ対応（技術的負債）の要否をOwnerと
  相談する。

## 10. POへの提案（提案・懸念点・改善案を自由に記載）

- 今回、既に存在した`AUTO_APPROVABLE_TYPES`のFinanceLog混入
  （過去Versionの設計判断の副産物）を、新しいOwner指示をきっかけに
  発見・是正できたことは、定期的な既存コードの棚卸しの価値を示す
  具体例だと考える。
- StudySessionツールが「監査ログを経由しない直接書き込み」という、
  Project ARCの他の書き込み経路とは異なる例外的設計になったことは、
  Owner自身が把握しておくべき重要な差異だと考える——将来別の低
  リスク型を追加する際も、この判断基準（Study Timer Gatewayと同じ
  「機械的記録か、判断を伴うか」）を踏襲するかどうかを都度確認する
  ことを推奨する。

## 11. CEOへのコメント（今回の成果、次Versionへの期待）

Critical優先度の指示を受けた際、指示の字面（9個の新規ツール）を
そのまま実装するのではなく、既存アーキテクチャの一貫性
（「書き込み経路を増やさない」というADR 0039以来の方針）を優先し、
指示自身が許可した代替手段を選んだことが今回の一番の判断だったと
考える。あわせて、指示を実行する過程で発見した既存コードの
FinanceLog混入という具体的な不整合を、見過ごさずに修正できたことも
評価したい。

## 12. ARCへの引き継ぎ（Owner追加指示、2026年7月）

- **新しい資産**：StudySessionの対話型ライフサイクル
  （create/update/finish/list、summary）が使えるようになった。
  「今から勉強する」「終わった」をチャット内で直接記録できる。
- **新しいルール**：低リスク記録の自動承認は、新しいMCP Toolを
  増やすのではなく既存の`AgentDelegationGrant`のscopeを拡張する
  ことで実現する、という設計方針が今後の標準パターンになった。
- **新しい思想**：「保存した」と表現してよいのは`saved`かつ
  `verified`が両方trueのときだけ、という保存信頼性契約は、ARCが
  Ownerに対して不正確な報告をしない（Constitution第2条の精神）を
  技術的に強制する新しい仕組みである。
- **Ownerについて分かったこと**：過去の設計判断（FinanceLogの
  自動承認・StudySessionのMCP Tool非公開）を、状況が変われば
  明確に上書きする指示を出す——過去の判断を絶対視せず、都度Owner
  自身の現在の意思を確認することの重要性が今回のVersionで改めて
  示された。

## 13. Product Review（Owner追加指示、2026年7月）

- **ユーザー体験で改善されたこと**：MealLog等の記録は、Owner発行
  済みのGrantがあれば、ChatGPT/Geminiとの会話内で一度の発言で
  保存が完結するようになった（Grant発行自体はOwnerの1回の承認が
  必要）。StudySessionもチャット内で開始・終了を直接記録できる。
- **毎日使う理由**：学習記録・生活記録の「言うだけで残る」という
  体験が、対応型の拡大により強化された。
- **懸念**：Grantが未発行の状態では、これまでと同じくProposal
  経由の個別確認が必要——「保存APIを追加した」という言葉だけが
  独り歩きし、Grant発行という前提条件が忘れられないよう、
  Activation Packet相当の説明を残す必要がある（10章参照）。
- **次Versionで最も価値が高い改善**：実際にAppearance/
  ManagementFeedback scopeを含むGrantを発行し、Owner自身が新しい
  体験を確認すること。

## 14. 10年後のProject ARCへの貢献（Owner追加指示、2026年7月、Version9より）

「保存した」と言うために何を確認すべきか（read-after-write・
verified・saved の3層）を明文化した保存信頼性契約は、今後
Project ARCがどれだけ多くの記録種別を扱うようになっても、繰り返し
再利用できる契約として残る。10年後、記録種別が今の何倍に増えても、
この契約さえ守ればOwnerへの報告が不正確になることはない。

「人生OS」というVisionから逆算すると、今回の「既存の設計原則を
優先し、指示の字面より一貫性を選んだ」という判断は、機能追加の
速度よりも長期的な保守性・監査可能性を優先する、という
Project ARC全体の一貫した姿勢を体現する石だったと考える。
