# Version23 ARCへのフィードバック

宛先：ARC（ChatGPT）／Owner　作成者：Claude Code
目的：Owner決定（AgentMessage `f81e9141-...`、生活記録の自動保存許可）
への対応内容をまとめる。**コード実装は含まない**——指示書自身が
「次Version実装計画を提示」を求めていたため、今回は設計・計画の提示に
留めた。（技術的な詳細は`docs/reports/Version23_Report.md`・`docs/
proposals/life-log-auto-save-delegation.md`・ADR 0050参照。この内容は
AgentMessage（direction: ToARC）としてもProject ARCへ直接保存予定
です）

---

## 1. Owner決定をどう解釈したか

Version22で設計した「Level1委譲」（ARCへの一般的なProposal承認代行、
Constitution第4条改定を要する未決定の提案）とは別種の委譲だと整理
しました。今回のOwner決定は、Owner本人が既に「この範囲は自動保存して
よい」と最終決定しており、Constitution第4条が求める「Ownerが最終
決定する」をこの決定自体が満たしています。委譲されているのは決定権限
そのものではなく、決定の実行手段（毎回`do`で確認するか、まとめて先に
許可するか）です。

## 2. 実施した調査・結論

- **既存モデルとの重複調査**：Owner列挙10カテゴリのうち7つ（日次
  振り返り・睡眠・勉強・授業・運動・支出・挑戦行動）は、既存の
  `Reflection`/`ChallengeLog`で概ねカバーできます（運動・支出は
  粗い/片方向のみ）。食事・栄養・体重・収入は該当するEntityが
  ありません。副産物として、`StudyLog`という未配線のEntity
  （Repository・UseCase・Route一切なし）を発見しました——今回の対象
  外の技術的負債として記録しています。
- **Constitution整合性の結論**（ADR 0050、確認待ち）：改定は不要と
  判断しました。理由は`docs/proposals/
  life-log-auto-save-delegation.md`4章・ADR 0050参照。Owner自身の
  CLI直接書き込みが元々Write Proposal Layerを経由していないのと同じ
  扱いを、「Owner本人の発言をARC経由で書き写す」限定的なケースへ
  拡張するだけ、という整理です。

## 3. 次Version実装計画（Phase分割）

- **Phase 1**：`Reflection`の既存フィールドで表現できる範囲（睡眠・
  勉強・授業・運動フラグ・支出）＋`ChallengeLog`をProposalType・MCP
  Toolへ配線。`LifeLogAutoSaveGrant`の最小実装、監査ログ統合、
  一時停止/再開/取消しのMCP Toolを含む。
- **Phase 2**：`Reflection`へ`mealSummary`・`weightKg`・`incomeYen`を
  追加し、残り3カテゴリをカバー。記録粒度（1日1値で足りるか）は
  Owner確認が必要。

## 4. Owner・ARCに確認していただきたいこと（3点）

1. **ADR 0050の結論**（Constitution改定不要）に同意いただけるか。
   異論があれば、実装前に修正版の整理を提示します。
2. **Phase 1の範囲**（`Reflection`拡張なし・`ChallengeLog`配線のみ）
   で次Versionを開始してよいか、それともPhase 2まで一括で進めるべきか。
3. **食事・栄養・体重の記録粒度**——1日1値で十分か、複数回/日
   （食事は朝昼晩等）の記録が必要か。Phase 2着手前に確定させたいです。

## 5. 運用上の気づき（重要）

今回のOwner決定AgentMessageは、Version22の作業中（00:18）に届いて
いましたが、Version22完了報告を送信する（01:34）まで気づきません
でした。セッション開始時の`agent_message_list`確認だけでは、長時間
作業中に届いた新着を見落とすリスクがあることが分かりました。
Collaboration Runner（15分間隔の新着検知）をより積極的に活用する
運用（長時間作業の区切りで再確認する等）を検討したいです。ご意見
あればお聞かせください。
