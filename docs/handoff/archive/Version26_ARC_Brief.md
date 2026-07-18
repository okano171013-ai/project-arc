# Version26 指示書（原文、AgentMessage経由、Owner本人発信）

行動介入レイヤー（Behavior Intervention Layer）の実装を求める正式指示。
先延ばし・重要課題からの逃避・過剰なスマホ利用を早期検知し、行動修正
を促す仕組みを、Ownerのマネージャー・コンサルタント・コーチとしての
役割で実装する。

## 主たる指示

- **id**: `31dcb191-2abc-45a6-a25f-4e4827245a62`
- **direction**: `ToClaudeCode`
- **relatedVersion**: `Version26`
- **createdAt**: `2026-07-17T07:30:48.361Z`
- **tags**: `version26`, `behavior-intervention`, `screen-time`,
  `coaching`, `life-score`, `owner-approved`

> Version26正式指示：Project ARCに行動介入レイヤーを実装してください。
>
> 目的：Ownerのマネージャー・コンサルタント・コーチとして、非効率、
> 無駄、先延ばし、重要課題からの逃避、過剰なスマホ利用を早期検知し、
> 即時に行動修正を促す。
>
> 必須機能：
> 1. Check-in Engine — 原則2時間ごとに現在行動を確認できる仕組み。
>    今日の最優先課題との整合性を判定。次の2時間で終える具体的成果を
>    1つ提示または選択させる。予定未達時は、言い訳を慰めず、原因・
>    修正行動・再開時刻を短く明示。
> 2. Distraction Detection — Screen Time、Opal、YouTube、SNS、
>    ブラウザ利用、学習タイマー、カレンダー等との連携可能性を設計。
>    推測を確定事実として扱わず、signal・confidence・basisを保持。
> 3. Intervention Policy — 介入強度をNotice/Warning/Criticalの3段階
>    とする。誤検知時の却下、スヌーズ、理由記録、再通知抑制を実装。
>    医療・安全上の事情、授業中、移動中、睡眠中など介入すべきでない
>    状態を除外。Ownerの一人称・呼称ポリシーを保持し、『俺』を
>    使用しない。
> 4. Life Score Integration — 日次総合点・分野別点数へ介入対象行動を
>    反映。オトの理想像を80点基準とする。前日比・7日前比・30日前比を
>    算出。記録不足は高評価せず、比較不能を明示。
> 5. Effectiveness Measurement — 介入前後の再開時間、完了率、スマホ
>    利用減少、学習時間増加を測定。通知疲れを避けるため、重複抑制・
>    1日上限・quiet hoursを設定可能にする。
> 6. Data and Security — 端末データ取得は最小権限、Owner明示同意、
>    ローカル優先。Screen Time等の取得可否をiOS制約込みで調査し、
>    直接取得不能ならShortcut/CSV/手動共有等の代替案を比較。有料
>    サービス、外部公開拡大、認証変更、秘密情報利用はOwner承認前に
>    停止。
>
> 完了条件：手動または自動チェックインが動作。逃避候補シグナルから
> 介入を生成できる。誤検知・スヌーズ・quiet hoursが動作。介入効果が
> 日次レポートに反映される。テスト、ADR、運用文書、Version26 Report、
> AgentMessage(ToARC)で完了報告を返す。

（全文は`agent_message_list`で取得したデータそのもの。要約せず主要
部分をそのまま転記した。詳細な実装内容は`docs/reports/
Version26_Report.md`・ADR 0053参照）

## 処理結果

Version26として実装完了。詳細は`docs/reports/Version26_Report.md`
参照。Screen Time/Opal等の実連携は未着手（iOS制約上、直接取得不能と
判明。`docs/operations/screen-time-integration-feasibility.md`参照）。
