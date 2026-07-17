# Version25 指示書（原文、AgentMessage経由、Owner本人発信）

Version24完了報告への応答としてOwner本人が発信した正式実装指示。
Version24で実装した`AgentDelegationGrant`のscopeを、食事・栄養・
体重・収支の4カテゴリへ拡張する。

## 主たる指示

- **id**: `70926e76-aaaa-48bc-ae22-dc75ffa3cdc8`
- **direction**: `ToClaudeCode`
- **relatedVersion**: `Version25`
- **createdAt**: `2026-07-17T02:50:32.386Z`
- **tags**: `version25`, `life-log`, `food`, `nutrition`, `weight`,
  `finance`, `auto-save`, `owner-approved`

> Version25正式指示：Life Log Phase 2を実装してください。
>
> Version24の完了報告を確認しました。AgentDelegationGrant、
> Reflection・ChallengeLogの限定自動保存、監査、取消し、重複防止の
> 実装を維持したまま、未対応の生活記録をProject ARCへ追加してください。
>
> 対象Entity／記録：
> 1. MealLog — 食事単位で記録する。occurredAt、mealType、items、
>    amountまたはportion、source、notesを保持できること。Owner が
>    明示した事実とARCによる推定を区別すること。写真参照がある場合は、
>    画像そのものの恒久保存と参照情報保存を分離して設計すること。
> 2. NutritionLog — MealLogに紐づく推定または実測の栄養値を保持する。
>    calories、protein、fat、carbohydrateを基本とし、必要ならfiber、
>    salt等を拡張可能にする。estimated、basis、confidenceまたは
>    uncertaintyを必須化し、推定値を確定事実として扱わない。日次合計は
>    原記録とは別の派生集計とし、再計算可能にする。
> 3. WeightLog — 1計測1記録。同日複数計測を許容する。measuredAt、
>    weightKg、measurementContext、source、notesを保持する。日次
>    代表値を作る場合も原計測を上書きしない。
> 4. FinanceLog — 収入・支出を取引単位で記録する。occurredAt、type
>    （Income/Expense）、amount、currency、category、paymentMethod、
>    merchantOrSource、notesを保持する。既存のReflection.financeとの
>    重複を整理し、Reflection側は日次要約、FinanceLogは原取引とする。
>    カード番号・口座番号・認証情報などの秘密情報を保存しない。
>
> 自動保存境界：Version24のAgentDelegationGrantに、MealLog、
> NutritionLog、WeightLog、FinanceLogを個別scopeとして追加する。
> Owner本人がChatGPTで明示入力した通常生活記録だけを個別doなしで
> 保存できる。推測だけで新規記録を確定保存しない。Level2 signalsが
> 一つでもある場合は自動保存を禁止する。Grantの作成・拡張・更新・
> 復活をARCまたはClaude Codeが自動実行できない保証を維持する。
>
> OAuth：OAuth本番有効化、.env変更、Passcode・token・client情報の
> 取扱いは今回の実装対象外とする。
>
> 完了報告：完了Feedbackのtagsに
> mf:fb9ee72f-a144-4d65-88a5-f78a113c536c および version25 を含める。

（全文は`agent_message_list`で取得したデータそのもの。要約せず主要
部分をそのまま転記した。詳細な実装内容は`docs/reports/
Version25_Report.md`・ADR 0052参照）

## 処理結果

Version25として実装完了。詳細は`docs/reports/Version25_Report.md`
参照。
