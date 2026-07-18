# Version26 Report: 行動介入レイヤーと厳格コーチング

`docs/reports/TEMPLATE.md`の14章構成に準拠。

**コミットハッシュ**：`20297be`（`feature/v4-v6-smart-capture`ブランチ）

## 1. Version概要

**テーマ**：行動介入レイヤー（Behavior Intervention Layer）。Owner
本人発信のAgentMessage（id `31dcb191-2abc-45a6-a25f-4e4827245a62`、
relatedVersion: Version26、tags: version26,owner-approved）による
正式指示——先延ばし・重要課題からの逃避・過剰なスマホ利用を早期検知し
行動修正を促す仕組みを求めた。2時間ごとのチェックイン、Screen Time等
との連携可能性の調査、逃避候補シグナルからの介入生成、Notice/Warning/
Criticalの3段階、誤検知時の却下・スヌーズ、quiet hours・除外状態、
日次スコアへの反映を要求した。

## 2. 今回実装した機能（理由も含めて説明）

### 4つの新規Entity

- **`CheckIn`**：2時間ごとの行動確認記録。`previousGoalStatus`が
  `'partial'|'missed'`のとき`missedReason`/`correctiveAction`/
  `resumeAt`の3点を`create()`で構造的に必須化——指示書「言い訳を
  慰めず、原因・修正行動・再開時刻を短く明示」を、ARCの対話品質では
  なくデータ構造として強制した。
- **`DistractionSignal`**：逃避候補シグナル。`source`
  （`OwnerReported`/`ExternalMetric`/`ARCInference`）で内容の主張者を
  常に明示し、`confidence`/`basis`を常時必須化——指示書「推測を確定
  事実として扱わない」を型で強制した。
- **`Intervention`**：`AgentDelegationGrant`と同型の状態機械
  （Pending/Acknowledged/Dismissed/Snoozed）。`message`は固定
  テンプレートへの数値補間のみで生成し、自由記述で組み立てない。
- **`InterventionPolicySettings`**：quiet hours・除外ウィンドウ
  （授業中/移動中/睡眠中/医療上の理由）・1日あたりの通知上限を保持
  するシングルトン設定。

### 決定的ルールエンジン（`GenerateInterventionsUseCase`）

5つのルール（overdue-checkin・distraction-cluster・
missed-goal-no-restart・library-no-timer・scheduled-task-not-started）
を、CheckIn/DistractionSignalの構造化フィールドへの閾値・日時比較
のみで評価する——`basis`/`notes`等の自由記述は一切読まない。quiet
hours・除外ウィンドウ中は新規生成を止め、同一ルールの再発火は
dedupウィンドウと却下クールダウンで抑制し、1日あたりの通知上限も
遵守する。**Constitution第2条との緊張**（「介入」の生成がSystemの
「判断」に当たらないか）は、ADR 0048が確立した「決定的な閾値・
パターンマッチングは判断に当たらない」という前例をそのまま適用して
解消した（詳細はADR 0053）。

### セキュリティ判断：Interventionの生成をネットワーク非公開に

`GenerateInterventionsUseCase`はMCP Tool化・HTTP Route化しなかった。
Version22の脅威モデルが`management_feedback_resolve`（Proposal Layer
非経由の直接書き込み）を無認証Remote MCPの具体的な穴として記録して
いる——これは模倣すべき前例ではなく、既に指摘された問題そのもの。
`MCP_OAUTH_ENABLED`は引き続き`.env`未設定（Version24からOwnerの手
作業待ち）のため、ここに新しい書き込み可能エンドポイントを追加する
ことは既知の問題を新規に増やすことになると判断した。代わりに、Owner
本人のマシン上でWindowsタスクスケジューラから起動する
`checkInPrompter.ts`（`collaborationRunner.ts`と同型の一回実行
スクリプト）が直接importして呼ぶ設計とした。

### `AgentDelegationGrant`のscope拡張

`AgentDelegationGrantScope`を8型に拡張（`CheckIn`・
`DistractionSignal`追加）。`AUTO_APPROVABLE_TYPES`にもこの2型のみ
追加した。`InterventionResponse`（却下・スヌーズ等）は自動承認対象に
含めない——誤って自動化範囲を広げるリスクをOwner確認なしに拡大しない
判断。`InterventionPolicySettings`は`AgentDelegationGrant`と同格の
安全境界として、型固定Level2ルール・自動承認対象外の二重ロックで
保護した。

### `GetDailyBehaviorScoreUseCase`

既存`Reflection.score()`は一切変更せず、チェックイン実施率・
Acknowledged介入の減点を組み合わせた新しい合成スコアを別途計算する。
「オトの理想像を80点基準とする」は`IDEAL_LIFE_SCORE_BASELINE`という
名前付き定数とした。7日/30日比較は最低有効日数に満たない場合
`available: false`で明示し、0点で水増ししない——指示書「記録不足は
高評価せず、比較不能を明示」「単発の好記録ではなく継続性を重視」を
構造で実現した。

### Read側の配線

6つの新規読み取り専用MCP Tool（`check_in_list`・
`distraction_signal_list`・`intervention_list`・
`intervention_policy_settings_get`・`daily_behavior_score_get`・
`intervention_effectiveness_get`）と対応するHTTP Routeを追加。
書き込みは既存の`proposal_create`/`approve`が新ProposalTypeを受け
付けるだけで完結し、書き込み経路は（Interventionを除き）1つも
増やしていない。

## 3. 実装しなかった機能（延期理由も記載）

1. **Screen Time/Opal/YouTube/SNSの実連携**：iOSのDeviceActivity
   frameworkはFamily Controls entitlementなしにサードパーティが
   直接アクセスできない制約があり、Opalも公開APIを提供していない
   （`docs/operations/screen-time-integration-feasibility.md`参照）。
   指示書6章自体が「直接取得不能なら代替案比較」を求めており、今回は
   Shortcuts/CSV/手動共有の比較調査に留めた。
2. **`InterventionResponse`の自動承認・`intervention_generate`のMCP
   Tool化**：誤って却下・スヌーズの自動化やIntervention生成の
   ネットワーク公開を広げるリスクをOwner確認なしに拡大しない判断。
3. **新規スケジュールタスクの実際の登録**：`checkInPrompter.ts`・
   `register-scheduled-tasks.ps1`は実装・テストしたが、実際の
   `Register-ScheduledTask`実行はOwner確認後に行う（新しい常駐
   バックグラウンドプロセスの追加のため）。
4. **`Reflection.score()`の変更**：既存の安定した参考指標を壊す
   リスクを避け、新しい合成スコアを別途用意した。
5. **実際の効果測定値**：`MeasureInterventionEffectivenessUseCase`は
   実装・合成データでテストしたが、実データによる測定は実運用の
   蓄積が前提。

## 4. Architecture Review

**新規**

- Entity: `CheckIn`・`DistractionSignal`・`Intervention`・
  `InterventionPolicySettings`
- Value Object: `BehaviorScoreConstants`
- UseCase: `AddCheckInUseCase`・`ListCheckInsUseCase`・
  `AddDistractionSignalUseCase`・`ListDistractionSignalsUseCase`・
  `GenerateInterventionsUseCase`・`RespondToInterventionUseCase`・
  `ListInterventionsUseCase`・`MeasureInterventionEffectivenessUseCase`・
  `GetInterventionPolicySettingsUseCase`・
  `UpdateInterventionPolicySettingsUseCase`・
  `GetDailyBehaviorScoreUseCase`
- Port: `CheckInRepository`・`DistractionSignalRepository`・
  `InterventionRepository`・`InterventionPolicySettingsRepository`
- Adapter: `JsonFileCheckInRepository`・
  `JsonFileDistractionSignalRepository`・
  `JsonFileInterventionRepository`・
  `JsonFileInterventionPolicySettingsRepository`
- Infrastructure: `checkInPrompter.ts`（新規スクリプト、
  `pnpm run checkin-runner`）
- MCP Tool: `check_in_list`・`distraction_signal_list`・
  `intervention_list`・`intervention_policy_settings_get`・
  `daily_behavior_score_get`・`intervention_effectiveness_get`

**変更**

- `Proposal`型：4型（`CheckIn`/`DistractionSignal`/
  `InterventionResponse`/`InterventionPolicySettings`）を
  `ProposalType`へ追加（`Intervention`自体は含まない）
- `AgentDelegationGrantScope`：8型に拡張
- `ClassifyApprovalLevelUseCase`：型固定Level2ルールに
  `InterventionPolicySettings`を追加
- `WriteProposalGatewayUseCase`：コンストラクタが18引数に、
  `AUTO_APPROVABLE_TYPES`にCheckIn/DistractionSignal追加、
  payloadSchemas・executeApprovalに4型分のcase追加
- `Connector`・`http/server.ts`・`generateOpenApi.ts`・`propose.ts`・
  `proposalSchema.ts`・`serializers.ts`：上記に対応する配線
- `scripts/register-scheduled-tasks.ps1`：3つ目のタスクブロック追記
  （未実行）

## 5. ADR（追加・変更したADR、追加しなかった理由）

- **ADR 0053**（新規）：Article 2との緊張の解消、セキュリティ判断
  （Interventionのネットワーク非公開）の根拠、4 Entity設計、
  Intervention非Proposal化の理由。
- 既存ADR（0048・0051・0052）は変更なし——本Versionはこれらが確立
  した設計パターンの再適用のみで、新しい例外ルールを作らなかった。

## 6. テスト（件数、カバレッジ、typecheck、lint、実機確認）

- `pnpm test`：478件全て緑（Version25完了時点372件から+106件）
- `pnpm typecheck`：エラーゼロ
- `pnpm lint`：エラーゼロ
- **実機確認（実HTTPリクエスト、隔離した一時データディレクトリで
  起動した実際のHTTP APIサーバーに対して）**：
  1. `AgentDelegationGrant`作成（scope: DistractionSignal, CheckIn）
     →Level2分類確認→承認
  2. 3件のDistractionSignal Proposal（直近60分・confidence medium
     以上）→全て`autoApproved: true`で自動保存
  3. `checkInPrompter.runOnce()`相当のロジックを実行→
     `distraction-cluster`（Warning）Interventionの生成を確認
  4. `GET /interventions`でPending状態のまま一覧取得できることを確認
  5. `InterventionResponse`（action: dismiss）Proposal→
     `autoApproved`されないことを確認→Owner do相当のapprove→
     レスポンス本体（`{intervention: {...status: 'Dismissed'...}}`）
     を確認
  6. 直後に再度ルールエンジンを実行→却下クールダウンにより
     `distraction-cluster`が再発火しないことを確認
  7. `GET /daily-behavior-score`で`interventionPenalty === 0`
     （Dismissedは減点対象外）を確認
  8. CheckIn/InterventionPolicySettingsのProposalレスポンス本体
     （`serializeApproveResult`）を実際のHTTPレスポンスとして確認
  9. `POST /interventions/generate`が存在しない（404）ことを確認
     ——Interventionの生成がネットワーク経由で呼べないことの直接検証

  全9ステップが設計通りに動作することを確認した。検証用スクリプト・
  隔離データディレクトリは確認後に削除した。

## 7. 修正したバグ（検出方法、原因、対応方法、再発防止）

- **`evaluateMissedGoalNoRestart`が実際の壁時計時刻（`Date.now()`）
  を参照していた**：`GenerateInterventionsUseCase`のルール評価は
  すべて`execute()`に渡された`now`パラメータを使う設計だったが、
  `missed-goal-no-restart`ルールの実装のみ`Date.now()`を直接参照して
  いた。境界値テスト（`resumeAt`が過去の固定日時のテストケース）で
  「テスト実行時の実際の日時」と「テストが仮定する`now`」がずれて
  いたため即座に発覚し、`now`パラメータを正しく受け取るよう修正した。
  テスト駆動で実装した箇所であり、実機確認まで待たずユニットテストの
  段階で検出できた。

## 8. 技術的負債（今後改善したい点）

- `WriteProposalGatewayUseCase`のコンストラクタが18引数になった——
  Version24（10引数）・Version25（14引数）から一貫して増え続けて
  いる技術的負債。パラメータオブジェクト化のリファクタリングを
  そろそろ次Versionで着手すべき水準に達している。
- `checkInPrompter.ts`は`collaborationRunner.ts`とstate/lock/log
  ヘルパーのコードが重複している（意図的——低リスクな複製を優先し、
  共通モジュール抽出はしなかった）。2つ目の類似スクリプトが増えた
  段階で共通化を検討する価値がある。
- Screen Time/Opal等の実連携が未着手のため、`DistractionSignal`の
  `source: 'ExternalMetric'`は現状Owner本人が手動で数値を報告する
  経路でしか使われない。

## 9. 次Versionへの申し送り（技術的観点から推奨する事項）

- `WriteProposalGatewayUseCase`のパラメータオブジェクト化（8章）。
- `checkInPrompter.ts`の実際のタスク登録（`register-scheduled-
  tasks.ps1`の実行）をOwnerに確認し、承認後に実施すること。
- `InterventionResponse`の自動承認可否をOwnerに確認すること
  （現状は誤って自動化範囲を広げないよう意図的に対象外）。
- Shortcuts経由のCSV自動共有が実際に機能するかの検証
  （`docs/operations/screen-time-integration-feasibility.md`3章）。

## 10. StudyLog未配線問題

指示書の主目的（行動介入レイヤー）と直接関係しないため、今回は
追加調査を行わなかった。Version23〜25で記録済みの調査結果
（`docs/proposals/life-log-auto-save-delegation.md`3章）から状況は
変わっていない。

## 11. POへの提案（提案・懸念点・改善案を自由に記載）

- `checkInPrompter.ts`の実登録が完了し、実際に2時間ごとの介入生成が
  動き始めた段階で、Notice/Warning/Criticalそれぞれの実際の発火頻度
  を1〜2週間観察してから`InterventionPolicySettings`の既定値
  （`dailyNotificationLimit: 6`等）を調整することを提案する——
  実データなしに閾値の妥当性を判断するのは推測に留まるため。

## 12. ARCへの引き継ぎ

**新しい資産**：`CheckIn`・`DistractionSignal`・`Intervention`——
Owner本人がChatGPTで明示した現在の行動・逃避シグナルを記録でき、
決定的ルールエンジンが機械的な閾値評価から介入を生成する。
`daily_behavior_score_get`で日次の合成スコア（Reflection＋チェック
イン実施率－介入減点、80点基準比較、前日比・7日/30日比較）を取得
できる。ただし`checkInPrompter.ts`の実タスク登録が完了するまでは、
2時間ごとの自動生成は動いていない（手動で`pnpm run checkin-runner`
を実行すれば試験できる）。

**新しいルール**：「介入の生成はSystemの判断ではなく、既にラベル
付けされたデータへの決定的な閾値評価である」という設計原則を確立
した（ADR 0053）。この原則は、DistractionSignalの内容を「誰が
主張しているか」（`source`フィールド）を常に明示することと表裏一体
——ARCが会話中に何か新しい「逃避シグナル」を報告する際は、必ず
`confidence`/`basis`を伴わせること。

**新しい思想**：Version22の脅威モデルという過去の発見を、今回の
新機能の設計判断（Interventionをネットワーク非公開にする）の直接の
根拠として引用した。「以前見つけた問題と同じ形をしていないか」を
確認するという具体的なチェックが、新機能追加のたびに繰り返し機能する
ことを実際に確認できた。

**Ownerについて分かったこと**：Version26着手前、Project ARCの
バックエンドサービスが（機械の休止に起因して）停止していたことを
Ownerが即座に報告し、根本原因の調査と復旧を求めた——日常的な運用上の
異変にも敏感で、放置せず都度確認する姿勢が一貫している。

## 13. Product Review

**ユーザー体験で改善されたこと**：コードレベルでは、2時間ごとの
チェックイン記録・逃避シグナルの報告・機械的な介入生成・却下や
スヌーズへの応答という一連の行動管理フローが完成した。ただし
`checkInPrompter.ts`の実タスク登録が完了するまでは、Ownerが実際に
「2時間ごとに自動で介入が届く」体験を得られる状態にはなっていない。

**毎日使う理由**：日次の合成行動スコア（`daily_behavior_score_get`）
により、Reflectionだけでは見えなかった「チェックインを継続できて
いるか」「介入にどう応答したか」が数値化される。80点という理想
基準との比較・7日/30日のトレンド比較により、単発の好調日ではなく
継続性を評価する仕組みが加わった。

**懸念**：Screen Time/Opal等の実連携が未着手のため、当面は
Owner本人がChatGPTへ手動で逃避シグナルを報告する必要がある——
「早期検知」という指示書の目的に対して、検知の自動化はまだ実現
していない。

**次Versionで最も価値が高い改善**：`checkInPrompter.ts`の実タスク
登録をOwnerが承認・完了し、実際に2時間ごとの自動チェックイン促し・
介入生成が動き出すこと。それによって初めて、今回実装した仕組みの
実効性（介入がどれだけ行動修正に繋がるか）を`intervention_
effectiveness_get`で実測できるようになる。

## 14. 10年後のProject ARCへの貢献

Version22の脅威モデルという「過去に発見した問題」を、Version26の
新機能設計における「やってはいけないことのチェックリスト」として
実際に機能させたことは、10年後Project ARCがさらに多くの機能を積み
重ねるようになっても、過去の教訓が風化せず繰り返し参照される仕組みの
先例になると考える——ADRという形で根拠を残すだけでなく、実際に次の
設計判断の場面でそのADRを引用して意思決定するという実践が、今回
初めて明確な形で行われた。

また、「介入」というOwnerの行動に踏み込む機能を実装するにあたり、
Constitution第2条との緊張を回避せずに正面から扱い、既存の型固定
ルールという前例に接続することで解消したことは、Project ARCが今後
「マネジメント」「コーチング」の色合いが強い機能を追加する際の
設計パターンとして繰り返し使えるはずである。10年後、Project ARCが
より踏み込んだ行動介入を行うようになっても、「Systemは既にラベル
付けされたデータの閾値評価のみを行い、内容の主張は常に人間かARCの
責任である」という境界線は、今回確立した形のまま保たれるべきだと
考える。
