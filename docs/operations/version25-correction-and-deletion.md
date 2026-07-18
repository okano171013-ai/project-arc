# Version25 訂正履歴・削除境界

MealLog、NutritionLog、WeightLog、FinanceLogの訂正はappend-onlyで行う。
元記録を上書きせず、新しいUUIDの記録に`correctionOfId`と
`correctionReason`を保存する。これにより、後から元の事実と訂正理由を
監査できる。

訂正UseCaseは、元IDが存在することを確認してから新しい記録を追加する。
元の`idempotencyKey`は訂正版へ引き継がない。同じ入力の再送と、Ownerが
明示した訂正を別の操作として扱うためである。

Version25では訂正を自動保存、HTTP、MCPへ公開しない。有効な
AgentDelegationGrantも訂正や削除を許可しない。外部入口を追加する場合は、
Owner承認を経る専用Proposalとして設計する。

削除は引き続き未実装である。Repositoryにも削除操作を追加せず、記録の
消去が必要な場合は既存Constitutionと承認方針に従って、対象と影響を確認
してから別途実装する。
