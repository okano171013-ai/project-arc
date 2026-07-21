# ADR 0072: Version40 — AgentDelegationGrant scope拡張による低リスク
記録の直接保存・保存信頼性契約

## ステータス

Accepted

## 関連Principle・ADR

- Constitution第2条（Systemは判断しない）・第4条（Ownerが最終決定
  する。ただし`AgentDelegationGrant`の範囲内は例外）
- ADR 0031（Write Proposal Layer——「Ownerの再送が承認の証」）
- ADR 0039（AgentMessageをProposalパターンで実装——書き込み経路を
  増やさない方針）
- ADR 0048（Version21：ARCによるProposal承認代行を実装しなかった
  理由の記録）
- ADR 0051（Version24：Constitution第4条の限定改定、
  `AgentDelegationGrant`Entity新設）
- Owner本人発信のAgentMessage（id `ba6548bc-c550-43a6-b5a1-
  7ab4dd4c9889`、`docs/handoff/archive/Version40_ARC_Brief.md`に保管）

## コンテキスト

Owner本人が、日常記録（MealLog等9種）を送信するたびにProposal
作成→再送承認という2段階操作を要求されることの負担を理由に、
「低リスク記録についてはProposalを経由しない直接保存」を求める
Critical優先度の指示を出した。指示は同時に、これが「AIがOwnerの
承認を勝手に代行する」ことを意図しないと明記し、既存の
Constitution・ADRとの整合性確認を求めた——ADR 0048が過去に「ARCに
よる承認代行」を明確に却下した経緯があるため、この確認は必須である。

指示文自身が、既存アーキテクチャとの兼ね合いで新規`*_create`
ツールが不可能なら「Ownerによる包括的かつ撤回可能な
AgentDelegationGrantを一度設定し、その範囲内では自動保存される
設計でも構いません」という代替を明示的に許可している。本ADRは、
この代替案を採用する決定を記録する。

## 決定1：新規Proposal-bypassツールを追加せず、既存AgentDelegationGrant
機構のscopeを拡張する

指示の項目1は文字どおりには`meal_log_create`等9個の新規MCP Toolを
要求しているが、**これらは実装しない**。代わりに、既存の
`proposal_create`（type指定）が、Owner発行済みの有効な
`AgentDelegationGrant`のscopeに含まれる型については`createProposal`
の時点で即時保存される、という既存の仕組み（Version24、ADR 0051）を
拡張して使う。

理由：

1. **「書き込み経路を増やさない」という一貫した設計方針**
   （ADR 0039・0048・0051が繰り返し明示）を継続する。9個の並行
   ツールを追加すると、将来同じ書き込みロジックへ到達する経路が
   2系統（`proposal_create`系と`*_create`系）になり、認可チェック・
   監査ログ・冪等性の実装をどちらにも同期させ続ける必要が生まれる
   ——ドリフトリスクが高い。
2. **利用者体験は実質的に同一**：Grantのscopeに含まれる型について
   `proposal_create`を呼ぶと、ChatGPT側からは1回の呼び出しで
   `saved: true`が返る——「日常記録ごとにOwnerへ承認操作を要求
   しない」という指示の核心的な要求は、ツール名を分けなくても
   満たされる。
3. **指示文自身がこの代替を明示的に許可している**（コンテキスト
   節参照）——独断ではなく指示の範囲内の実装判断である。

## 決定2：AgentDelegationGrantScope・AUTO_APPROVABLE_TYPESを拡張する

`src/domain/entities/AgentDelegationGrant.ts`の
`AgentDelegationGrantScope`と`src/application/use-cases/
write-proposal-gateway/WriteProposalGateway.ts`の
`AUTO_APPROVABLE_TYPES`へ、指示の項目1が列挙した9型のうち未対応
だった`Appearance`・`ManagementFeedback`を追加した
（`Reflection`・`ChallengeLog`・`MealLog`・`NutritionLog`・
`WeightLog`・`CheckIn`・`DistractionSignal`は既にVersion24〜26で
対応済み）。

## 決定3：既存のFinanceLog自動承認を撤回する（指示項目3への準拠）

コード監査の結果、現行の`AUTO_APPROVABLE_TYPES`には**Version25〜26
時点で`FinanceLog`が既に含まれていた**ことが判明した。しかし今回の
指示の項目3は「FinanceLogその他の収入・支出・資産・課金・契約に
関する操作」を明示的に「従来どおりOwnerの明示確認を維持」する対象
として挙げている——これはOwner本人による現在の明示的な方針であり、
過去のVersionの設計判断を上書きする。`FinanceLog`を
`AUTO_APPROVABLE_TYPES`および`AgentDelegationGrantScope`から削除し、
`ClassifyApprovalLevelUseCase`の型固定Level2ルールへ追加すること
で、`AgentDelegationGrant`・`InterventionPolicySettings`と同様に
**Grantの有無に関わらず常にOwnerの個別承認を要求する**設計へ変更
した。

**Owner確認事項**：この変更により、もし既にFinanceLog scopeを含む
有効な`AgentDelegationGrant`が発行済みだった場合、そのGrantの
FinanceLog部分は次回以降のFinanceLog Proposalに対して効果を持たなく
なる（コード側で強制的にLevel2化されるため）。これは今回の指示に
沿った意図的な変更である。

## 決定4：保存信頼性契約（read-after-write・saved/verified区別・
再試行）

`WriteProposalGatewayUseCase.createProposal()`の自動承認パスと
`approveProposal()`の両方に、以下を実装した。

- `executeApproval()`が成功した後、対応するRepositoryへ
  read-after-write検証（保存直後に同じ条件で再取得し、書き込んだ
  内容と一致することを確認）を行う。
- 検証が一致した場合のみ`saved: true`・`verified: true`を返す。
- `executeApproval()`が例外を投げた場合、またはread-after-write
  検証が不一致だった場合は、`saved: false`・`error`・
  `retryQueueId`を返す——**成功として扱わない**。
- `retryQueueId`は、呼び出し側が渡した`idempotencyKey`
  （対応する型に存在する場合）をそのまま返す。新しい永続キュー
  Entityは追加しない——既存の「同一`idempotencyKey`での再送は
  dedupされる」という設計（MealLog等、Version25）が、事実上の
  再試行キューとして機能する（Principle 9 YAGNI：新しい永続化層を
  追加する必要がない）。`idempotencyKey`を持たない型
  （Reflection・Appearance・ManagementFeedback）は、
  `retryQueueId`として`type:target:createdAt`から導出した
  決定的なキーを返す。

ChatGPT等の呼び出し側は、レスポンスの`saved`・`verified`・
`autoApproved`の3フィールドを見れば、指示が求める5状態（提案のみ／
承認された／Repositoryへ保存された／再読込により保存確認された／
失敗した）を機械的に区別できる。

## 決定5：ADR 0031・Constitution第4条は変更しない

`AgentDelegationGrant`は既にConstitution第4条のVersion24改定
（ADR 0051）で「Ownerが範囲・期限・上限を明示して発行した委譲書の
範囲内でARCが個別承認なしに記録を保存できる」ことを認めている。
今回追加する2型（Appearance・ManagementFeedback）は、この既存の
枠組みのscopeを広げるだけであり、Constitution・Principlesの新たな
改定は不要と判断した。ADR 0031の「Ownerの再送が承認の証」という
保証も無変更——`AgentDelegationGrant`が無い場合の既定は引き続き
Owner個別承認であり、`approveProposal()`は変更していない
（`autoApproved`なProposalの再送を拒否する既存の重複防止ロジックも
無変更）。

**Grant自体の発行はClaude Codeが代行しない**：Constitution第4条は
「Claude Code・ARC自身がGrantを作成・変更・復活させることはできない」
と明記している。したがって、Appearance・ManagementFeedbackを
含む新しいGrantを実際に発行する操作は、Owner自身が
`proposal_create`（type: AgentDelegationGrant）→`do`→
`proposal_approve`という既存フローで行う必要がある——本Versionの
実装はこれを「可能にする」だけであり、Grantの発行そのものは
Owner Actionとして残る。

## 影響

- `src/domain/entities/AgentDelegationGrant.ts`：
  `AgentDelegationGrantScope`から`FinanceLog`を削除、`Appearance`・
  `ManagementFeedback`を追加。
- `src/application/use-cases/write-proposal-gateway/
  WriteProposalGateway.ts`：`AUTO_APPROVABLE_TYPES`更新、
  `createProposal`/`approveProposal`の戻り値に`saved`・`verified`・
  `retryQueueId`を追加（既存フィールドは維持、後方互換）。
- `src/application/use-cases/approval-policy/
  ClassifyApprovalLevel.ts`：`FinanceLog`を型固定Level2対象へ追加。
- 既存の呼び出し元（CLI・HTTP・MCP・テスト）は、新フィールドを
  無視しても動作する（すべてoptional追加）。

## 見送った案

- **9個の新規`*_create`MCP Toolを文字どおり追加する**：決定1の理由で
  見送った。指示自身が許可する代替を採用した。
- **新しい永続的な再試行キューEntityを追加する**：既存の
  idempotencyKeyベースのdedupで実質的に同じ効果が得られるため、
  Principle 9（YAGNI）に従い見送った。
- **ADR 0031を改定し「Ownerの再送」以外の承認証明手段を正式に
  認める**：`AgentDelegationGrant`という既存の限定的な例外の枠内で
  今回の要求が完全に満たせるため、ADR 0031本体の変更は不要と判断
  した。
