# ADR 0053: Version26「行動介入レイヤーと厳格コーチング」

## ステータス

承認済み（Owner本人発信のAgentMessage `31dcb191-2abc-45a6-a25f-4e4827245a62`、
relatedVersion: Version26、tags: version26,owner-approved）

## 関連Principle

- Constitution第2条（Systemは、判断しない）・第4条（Ownerが、
  最終決定する。ただし`AgentDelegationGrant`による限定委譲を含む）
- Principle 9（段階的拡張／YAGNI）
- ADR 0031（Write Proposal Layer）・ADR 0039（書き込み経路を増やさ
  ない方針）・ADR 0045（参照は存在検証しない）・ADR 0046
  （Collaboration Runnerのスコープ、インプロセススケジューラを
  作らない方針）・ADR 0047（Windowsタスクスケジューラへの委譲）・
  ADR 0048（Approval Policy Engine、型固定ルールの前例）・
  ADR 0051/0052（AgentDelegationGrant scope拡張パターン）・
  Version22脅威モデル（`docs/security/remote-mcp-threat-model.md`、
  無認証Remote MCPでのProposal非経由書き込みの危険性）

## コンテキスト

Owner本人がAgentMessage `31dcb191-...`で、先延ばし・重要課題からの
逃避・過剰なスマホ利用を早期検知し行動修正を促す「行動介入レイヤー」の
実装を正式に指示した。指示書は2時間ごとのチェックイン、Screen Time/
Opal等との連携可能性の設計、逃避候補シグナルからの介入生成、
Notice/Warning/Criticalの3段階、誤検知時の却下・スヌーズ、quiet
hours・除外状態、日次スコアへの反映を求めた。

最大の設計上の緊張点：「介入」（行動への評価・警告）を生成する処理は
Constitution第2条「Systemは判断しない」と衝突しうる。

## 決定

### Article 2との緊張の解消（本ADRの中心的根拠）

ADR 0048が既に確立した前例——`ClassifyApprovalLevelUseCase`のような
「構造化された真偽値・列挙値への決定的な閾値・パターンマッチング」は
Article 2の「判断」に当たらない——をそのまま適用した。具体的には：

1. **DistractionSignalの内容を主張できるのは誰か**を`source`フィールド
   （`'OwnerReported' | 'ExternalMetric' | 'ARCInference'`）で常に
   明示する。Project ARC自身のコードは一切新しいシグナルの内容を
   発明しない——Owner本人が申告するか、客観的指標（`metricValue`）が
   閾値を超えるか、ARCが`confidence`/`basis`付きで推論するかの
   いずれかのみ。これはReflection/MealLog等が既に確立した
   `estimated`/`estimationBasis`/`confidence`パターン（Version24）を
   一般化したもの。
2. **`GenerateInterventionsUseCase`（決定的ルールエンジン）**は、
   既にラベル付けされた構造化フィールド（`confidence`・`kind`・
   `occurredAt`等）への閾値・日時比較のみを行い、`basis`/`notes`等の
   自由記述は一切読まない。`message`は`MESSAGE_TEMPLATES`という
   固定テンプレート関数への数値補間のみで生成し、自由文生成は行わない。
   `ClassifyApprovalLevelUseCase.execute()`が`signals`の真偽値を
   フィルタするのと同型の「機械的なlookup」である。
3. **`Intervention`は`ProposalType`にしない**——`RecordApprovalDecision
   UseCase`が`ApprovalDecision`をProposal外で直接書くのと同じ理由
   （既にOwner/ARC/客観指標が主張した内容に対する機械的な監査派生物
   であり、新しい決定を主張するものではない）。

### セキュリティ：Interventionの生成をネットワーク経由で呼べるように
しない

`GenerateInterventionsUseCase`は意図的にMCP Tool化・HTTP Route化しな
かった。Version22の脅威モデルが`management_feedback_resolve`（Proposal
Layerを経由しない直接書き込み）を「無認証Remote MCPにおける具体的な
穴」として記録している——これは模倣すべき前例ではなく、既に指摘された
問題そのものである。現状`MCP_OAUTH_ENABLED`は`.env`に未設定のまま
（Version24からOwnerの手作業待ち）であり、Remote MCPは引き続き無認証
のため、ここに新しい書き込み可能エンドポイントを追加することは
既知の問題を新規に増やすことになる。

したがって`GenerateInterventionsUseCase`は、Owner本人のマシン上で
Windowsタスクスケジューラから起動される`checkInPrompter.ts`
（`collaborationRunner.ts`と同型の一回実行スクリプト）が**直接
import**して呼ぶ設計とした——Connector/HTTP経由ではない。読み取り
専用のMCP Tool（`check_in_list`等）は、既存のMealLog等と同じ既知の
リスク（無認証Remote MCPでの読み取り露出、Version22で受容済み）の
範囲内であり新規リスクではないため追加した。

### 4つの新規Entity

`ChallengeLog`/`MealLog`と同じ「record + `create()`構造検証」パターン
を踏襲。

- **`CheckIn`**：`previousGoalStatus`が`'partial'|'missed'`のとき
  `missedReason`/`correctiveAction`/`resumeAt`の3点を型レベルで
  必須化——指示書「予定未達時は、言い訳を慰めず、原因・修正行動・
  再開時刻を短く明示」を、ARCの対話品質ではなくデータ構造として
  強制する。
- **`DistractionSignal`**：`confidence`/`basis`が常に必須（NutritionLog
  と異なりOR条件ではない——指示書が「signal・confidence・basisを保持」
  を3点セットとして明示的に要求しているため）。
- **`Intervention`**：`AgentDelegationGrant`と同型の状態機械
  （Pending/Acknowledged/Dismissed/Snoozed、Acknowledged/Dismissedは
  終端）。`wakeIfDue()`はSnoozed→Pendingの機械的な日時比較のみで、
  Owner・ARCの「応答」ではない。
- **`InterventionPolicySettings`**：シングルトン設定（quiet hours・
  除外ウィンドウ・1日あたりの通知上限）。「Systemがいつ介入して
  よいか」を制御する境界であり、`AgentDelegationGrant`と同格の安全
  境界として、`ClassifyApprovalLevelUseCase`の型固定Level2ルールに
  追加し、`AUTO_APPROVABLE_TYPES`にも含めない二重ロックとした。

### `AgentDelegationGrant`のscope拡張・自動承認境界

`AgentDelegationGrantScope`を8型に拡張（`CheckIn`・`DistractionSignal`
追加）。`AUTO_APPROVABLE_TYPES`にはこの2型のみ追加した——
`InterventionResponse`（却下・スヌーズ等の応答）は今回は含めない。
誤って却下・スヌーズの自動化を広げるリスクをOwner確認なしに拡大し
ないという判断であり、次Version確認事項として明示する。

### `GetDailyBehaviorScoreUseCase`

既存`Reflection.score()`は一切変更しない——安定した既存指標を壊す
リスクを避け、新しい合成スコアを別途計算する。「オトの理想像を80点
基準とする」は`IDEAL_LIFE_SCORE_BASELINE`という名前付き定数
（`src/domain/value-objects/BehaviorScoreConstants.ts`）とし、
マジックナンバーにしない。7日/30日比較は最低有効日数（
`MIN_DAYS_FOR_7D_COMPARISON`/`MIN_DAYS_FOR_30D_COMPARISON`）に満たない
場合`available: false`で明示し、0点で水増ししない——指示書「記録不足は
高評価せず、比較不能を明示」「単発の好記録ではなく継続性を重視」を、
最低日数ゲート＋複数日平均比較という構造で実現した。

### Screen Time/Opal等の実連携（今回は実装しない）

指示書6章自体が「取得可否をiOS制約込みで調査し、直接取得不能なら
Shortcut/CSV/手動共有等の代替案を比較」ことを求めており、これは
フィージビリティ調査であって実装要件ではない。`docs/operations/
screen-time-integration-feasibility.md`に調査結果を記録した——
iOSのScreen Time API（DeviceActivity framework）はApple Family
Controls entitlementなしにサードパーティが直接アクセスできない
制約があるため、Shortcuts appからのCSVエクスポート/手動共有を
代替案として比較した。

## 根拠

- ADR 0048の「決定的なパターンマッチングはConstitution第2条の
  『判断』にあたらない」という前例をそのまま適用することで、新しい
  例外ルールを作らずにIntervention生成の設計を正当化できた。
- ADR 0051の「型固定Level2ルール」前例を`InterventionPolicySettings`
  にも適用することで、既存の安全装置の再利用性が2回目も実証された。
- Version22脅威モデルの教訓（Proposal非経由書き込みの危険性）を
  今回のセキュリティ判断の直接の根拠として引用した——「前に見つけた
  問題」と「今回追加しようとしている設計」が同じ形をしていないかを
  確認する、という具体的なチェックリストとして機能した。

## 影響

- `Proposal.ProposalType`に4型追加（`Intervention`自体は含まない）。
- `AgentDelegationGrantScope`が8型に拡張。
- `WriteProposalGatewayUseCase`のコンストラクタが14→18引数になった
  ——既存3呼び出し元を更新した。
- 新規MCP Tool 6つ（`check_in_list`・`distraction_signal_list`・
  `intervention_list`・`intervention_policy_settings_get`・
  `daily_behavior_score_get`・`intervention_effectiveness_get`、
  いずれも読み取り専用）・新規HTTP Route 6つを追加。
- 新規スクリプト`checkInPrompter.ts`（`pnpm run checkin-runner`）と
  `scripts/register-scheduled-tasks.ps1`への3つ目のタスクブロックを
  追加した——**ただし実際のタスク登録（`register-scheduled-
  tasks.ps1`の実行）はOwner確認後に行う**、新しい常駐バックグラウンド
  プロセスの追加のため。
- Screen Time/Opal等の実連携、`Reflection.score()`の変更、
  `InterventionResponse`の自動承認は今回のスコープに含まれていない
  （`docs/reports/Version26_Report.md`3章参照）。
