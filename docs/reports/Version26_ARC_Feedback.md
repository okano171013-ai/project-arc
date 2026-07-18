# Version26 ARCへのフィードバック

宛先：ARC（ChatGPT）／Owner　作成者：Claude Code
目的：Version26「行動介入レイヤー」の実装内容と、ARCが実際に呼び出す
MCP Tool名・入力例をまとめる。（技術的な詳細は`docs/reports/
Version26_Report.md`・ADR 0053参照。この内容はAgentMessage
（direction: ToARC、tags: `version26`）としてもProject ARCへ直接保存
予定です）

---

## 1. 実装した内容

- **4つの新規Entity**：`CheckIn`（2時間ごとの行動確認、未達時は
  `missedReason`/`correctiveAction`/`resumeAt`の3点セットを構造的に
  必須化）・`DistractionSignal`（逃避候補シグナル、`source`で主張者を
  明示し`confidence`/`basis`を常時必須化）・`Intervention`
  （Pending/Acknowledged/Dismissed/Snoozedの状態機械）・
  `InterventionPolicySettings`（quiet hours・除外ウィンドウ・1日上限）。
- **決定的ルールエンジン**（`GenerateInterventionsUseCase`）：5ルール
  （overdue-checkin・distraction-cluster・missed-goal-no-restart・
  library-no-timer・scheduled-task-not-started）を、構造化フィールド
  への閾値・日時比較のみで評価。quiet hours・除外ウィンドウ・dedup・
  却下クールダウン・1日上限を実装。
- **`AgentDelegationGrant`のscope拡張**：CheckIn・DistractionSignalを
  追加（8型）。`InterventionResponse`は自動承認対象に含めていません
  （誤って自動化範囲を広げないための意図的な判断）。
- **`daily_behavior_score_get`**：既存`Reflection.score()`は変更せず、
  チェックイン実施率・介入減点を組み合わせた合成スコアを別途計算。
  80点基準・前日比・7日/30日比較（データ不足時は`available: false`
  で明示）。
- **セキュリティ判断**：Interventionの生成はMCP Tool化・HTTP Route化
  しませんでした（Version22の脅威モデルが指摘した「Proposal Layer
  非経由の直接書き込み」の穴を新規に増やさないため）。Owner本人の
  マシン上のスクリプト（`checkInPrompter.ts`）が直接呼ぶ設計です。

テスト478件全緑（+106件）、typecheck/lintともにエラーゼロ。実HTTP
リクエストで、Grant作成→DistractionSignal自動保存→介入生成→
`GET /interventions`→却下→クールダウン抑制→
`daily-behavior-score`の減点反映までの一連を確認済みです。

## 2. ARCが実際に呼び出すMCP Tool（秘密情報なし）

書き込みは引き続き`proposal_create`→`proposal_approve`（Owner`do`
必須、または有効なGrant範囲内なら自動保存）です。読み取り専用の
新規Toolは以下の6つです。

- `check_in_list`（`limit`必須、`date`で絞り込み可能）
- `distraction_signal_list`（`limit`必須、`source`/`date`で絞り込み
  可能）
- `intervention_list`（`limit`必須、`status`で絞り込み可能）
- `intervention_policy_settings_get`（引数なし）
- `daily_behavior_score_get`（`date`のみ、日次合成スコアを再計算して
  返す。保存はしない）
- `intervention_effectiveness_get`（期間指定、介入前後の再開時間・
  完了率等の合成データ集計）

例：`proposal_create`でDistractionSignalを提案する場合のpayload
（有効なGrantがなければOwnerの`do`が必要です）：

```json
{
  "type": "DistractionSignal",
  "target": "YouTube視聴、学習タイマー未起動",
  "payload": {
    "record": {
      "occurredAt": "2026-07-17T14:00:00+09:00",
      "signalType": "youtube",
      "source": "OwnerReported",
      "confidence": "medium",
      "basis": "Ownerが会話中に自己申告"
    }
  },
  "reason": "Ownerが会話中に明示した逃避行動"
}
```

## 3. 実装しなかったもの（重要）

- **Screen Time/Opal/YouTube/SNSの実連携**：iOSのDeviceActivity
  frameworkがFamily Controls entitlementなしにサードパーティから
  直接アクセスできない制約があり、Opalも公開APIを提供していません
  （`docs/operations/screen-time-integration-feasibility.md`参照）。
  Shortcuts/CSV/手動共有の代替案比較に留めています。
- **`InterventionResponse`の自動承認**：誤って却下・スヌーズの自動化
  を広げるリスクをOwner確認なしに拡大しない判断です。
- **チェックインの実際の2時間ごと自動生成**：`checkInPrompter.ts`は
  実装・テスト済みですが、Windowsタスクスケジューラへの実登録は
  Owner確認後に行います。現時点では手動実行（`pnpm run
  checkin-runner`）でのみ試験できます。
- **実際の効果測定値**：`intervention_effectiveness_get`は実装・合成
  データでテスト済みですが、実データによる測定は実運用の蓄積が前提
  です。

## 4. Owner・ARCへの共有事項

「早期検知」というVersion26の目的に対して、検知の自動化（Screen
Time等の実連携、2時間ごとの自動実行）はまだ実現していません。当面は
Owner本人がChatGPTで逃避シグナルを報告する運用になります。

StudyLog（学習ログ）は依然として未配線のままです（Version23〜25から
継続、詳細は`docs/reports/Version25_Report.md`10章）。
