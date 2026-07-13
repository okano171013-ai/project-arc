# ADR 0024: DecisionContextをEntityではなくValue Objectにした理由

## ステータス

承認済み

## 関連Principle

- ADR 0009（Timelineの対象範囲、TimelineEntryも同様にVOとして設計）

## コンテキスト

Version12指示書12章は「新しいEntityは作らない。DecisionContextは
Value Objectとして扱う」と明示的に指定していた。この判断の根拠を
記録する。

## 決定

`DecisionContext`（および`DecisionEvidence`/
`DecisionCandidateComparison`）は`src/domain/value-objects/`配下に
置く素朴なインターフェースとし、`id`を持つEntity・Repositoryを
持つ永続化対象とはしない。

## 根拠

Entityと呼ぶための条件（本プロジェクトの既存Entity——Reflection・
MemoryEntry・ExternalKnowledge等——が共通して持つ性質）は、
「一意なidを持ち、時間の経過の中で同一性を保ったまま更新され、
Repositoryを通じて永続化・再取得される」ことである。

`DecisionContext`はこの条件を満たさない：

- **同一性がない**：同じ質問を2回投げても、External Brainの状態が
  変わっていれば異なる`DecisionContext`が生成される。「同じ
  DecisionContextを再度取得する」という操作に意味がない。
- **永続化しない**：指示書10章が明記する通り「一時生成物」であり、
  Ownerが後から「あのDecisionContextをもう一度見たい」と思っても、
  それはExternal Brainの根拠データを再度Retrieveし直せば再生成
  できるものであって、保存された記録を参照する行為ではない。
- **更新されない**：Entityは`update()`によって状態が変化するが、
  `DecisionContext`は生成された時点で完結した射影であり、後から
  書き換えられることはない。

これはVersion8のTimelineEntry（ADR 0009）と全く同じ理由づけである
——「独自の永続化を持たない射影（projection）」はvalue objectとして
`domain/value-objects/`に置く、という既存の設計規約をそのまま
適用した。

## 影響

- `DecisionContext`用の`DecisionContextRepository`は存在しない。
  `pnpm decision`実行の度に、DecisionEngineが最新のExternal Brainの
  状態から都度生成する。
- Bridge Import/ExportにDecisionContextを持ち込まない判断
  （ADR 0025）とも整合する——Repositoryを持たないものをBridgeの
  Import/Export対象にすることは、Bridge Layer（ADR 0010）の
  「既存Repositoryへの薄い委譲」という設計とそもそも噛み合わない。
