# Version25 ARCへのフィードバック

宛先：ARC（ChatGPT）／Owner　作成者：Claude Code
目的：Version25「Life Log Phase 2」の実装内容と、ARCが実際に呼び出す
MCP Tool名・入力例をまとめる。（技術的な詳細は`docs/reports/
Version25_Report.md`・ADR 0052参照。この内容はAgentMessage
（direction: ToARC、tags: `mf:fb9ee72f-a144-4d65-88a5-f78a113c536c`・
`version25`）としてもProject ARCへ直接保存予定です）

---

## 1. 実装した内容

- **4つの新規Entity**：`MealLog`（食事単位）・`NutritionLog`
  （`MealLog`に紐づく推定・実測の栄養値）・`WeightLog`（1計測1記録）・
  `FinanceLog`（取引単位の収支）。Owner確認済みの記録粒度をそのまま
  反映しています。
- **`AgentDelegationGrant`のscope拡張**：既存のReflection・
  ChallengeLogに加え、上記4型も対象に追加できます。Version24の
  安全装置（型固定Level2ルール・重複防止・監査・default deny）は
  一切変更していません。
- **idempotencyKeyによる重複防止**：4 Entity共通で、同一の
  `idempotencyKey`を渡すと新規保存されず既存レコードが返ります
  （`deduped: true`）。ARC側から安定したキー（例：会話のメッセージ
  IDや食事の内容+時刻のハッシュ）を渡すことで、同じ発言を誤って
  2回記録することを防げます。
- **実HTTPリクエストでの実機確認**：grant作成→承認→MealLog自動
  保存→重複拒否→一覧取得→idempotencyKey dedup→usageCount増加の
  一連を実際のHTTPリクエストで確認済みです。

テスト369件全緑（+48件）、typecheck/lintともにエラーゼロ。

## 2. ARCが実際に呼び出すMCP Tool（秘密情報なし）

書き込みは引き続き`proposal_create`→`proposal_approve`（Owner`do`
必須、または有効なGrant範囲内なら自動保存）です。読み取り専用の
新規Toolは以下の5つです。

- `meal_log_list`（`limit`必須、`date`/`mealType`で絞り込み可能）
- `nutrition_log_list`（`limit`必須、`mealLogId`で絞り込み可能）
- `nutrition_summary_by_date`（`date`のみ、日次栄養合計を再計算して
  返す。保存はしない）
- `weight_log_list`（`limit`必須、`date`で絞り込み可能）
- `finance_log_list`（`limit`必須、`date`/`category`/`type`で
  絞り込み可能）

例：`proposal_create`でMealLogを提案する場合のpayload（有効なGrantが
なければOwnerの`do`が必要です）：

```json
{
  "type": "MealLog",
  "target": "朝食: トーストと卵",
  "payload": {
    "record": {
      "occurredAt": "2026-07-17T07:30:00+09:00",
      "mealType": "breakfast",
      "items": ["トースト", "卵"],
      "source": "chatgpt-text"
    }
  },
  "reason": "Ownerが会話中に明示した食事内容"
}
```

## 3. 実装しなかったもの（重要）

- **訂正・削除UseCase**：Reflection/ChallengeLog同様、今回の4 Entity
  にも`update`/`delete`はありません。誤った記録を直す手段は、次
  Versionまでは「新規の正しい記録を追加する」形でのみ対応可能です。
- **OAuth本番有効化**：今回の指示書で明示的に対象外とされたため、
  未着手です。Version24から引き続き、Owner自身の手作業（`.env`編集・
  サービス再起動）待ちの状態です。
- **Timeline横断統合**：既存の時系列表示に新4型はまだ含まれません。
- **体重の日次代表値**：`WeightLog`は1計測ごとに個別記録されます。
  日次の代表値（例：朝の体重）を自動生成する機能はまだありません。

## 4. Owner・ARCへの共有事項（Version23〜24からの継続）

`docs/proposals/level1-arc-approval-delegation.md`（一般的なProposal
承認代行）は、今回も引き続き未決定・未実装のままです——今回拡張した
のは、Owner決定に基づく生活記録限定の委譲（6型）のみです。

StudyLog（学習ログ）は依然としてRepository・UseCase・Routeが未配線
のままです。配線するか廃止するか、Owner確認が必要な技術的負債として
残っています（詳細は`docs/reports/Version25_Report.md`10章）。
