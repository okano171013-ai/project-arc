# ADR 0018: ExternalKnowledgeをMemoryEntryから分離する理由

## ステータス

承認済み

## 関連Principle

- ADR 0005（Memory/Inventory/Reflectionの境界）
- ADR 0013（ExternalSource/ExternalKnowledgeの分離）

## コンテキスト

`MemoryEntry`（ADR 0005、Version4）は「時間に紐づかない、更新され
続ける知識」（持ち物・目標・好み・学歴・キャリア・健康・お金・
人間関係等）を保存するEntityとして既に存在する。Version10指示書は、
External Brainの知識（`ExternalKnowledge`）を`MemoryEntry`に統合
するか、分離した新規Entityとするかを論点に挙げていた（指示書
17章 ADR候補1：記録主体・出典・更新可能性・信頼性・時間性の違いを
整理する）。

## 決定

`ExternalKnowledge`を`MemoryEntry`とは別のEntity・別Repositoryとして
新設する。統合しない。

## 根拠

指示書が挙げた5つの観点で比較すると、両者は性質が明確に異なる。

| 観点 | MemoryEntry | ExternalKnowledge |
|---|---|---|
| 記録主体 | Owner自身の知識・状態（一人称） | 外部情報源から得た内容（出典に由来） |
| 出典 | 持たない（Owner自身が記録の発生源） | `sourceId`で`ExternalSource`を参照できる（任意） |
| 更新可能性 | 単純な上書き更新（`category`/`title`/`content`/`tags`） | `status`（inbox/reviewed/archived）というレビュー
サイクルを持つ。原文（`content`）とOwnerの解釈
（`ownerSummary`/`ownerComment`）を分離して保持する（ADR
0013） |
| 信頼性 | 概念自体が存在しない（Owner自身の記録に「信頼度」は不要） | `confidence`（unassessed/low/medium/high）という
Owner設定の補助属性を持つ（ADR 0012） |
| 時間性 | 「いつ知ったか」ではなく「今どうか」を表す（Timeline対象外、
ADR 0009） | `capturedAt`（記録した日）を持ち、Timelineの対象になる
（ADR 0017） |

これら5点は表面的なフィールドの違いではなく、「Ownerの記録」と
「外部から取り込んだ記録」という根本的に異なる性質から生じている。
ADR 0005が確立した「性質の異なる記録を無理に統合しない」という
判断基準（Reflection/Memory/Inventoryの分離）を、Owner発の情報と
外部発の情報という新しい軸でも一貫して適用した。

`MemoryEntry`に`sourceId`・`confidence`・`status`等のOptionalな
フィールドを後付けして無理に統合する選択肢もあったが、その場合
「Owner自身の知識なのに信頼度を聞かれる」「外部情報なのに
Reflectionと同じ更新モデルで扱われる」といった不整合がUI・
Domainロジックの両方に漏れ出し、ADR 0005が回避しようとした問題が
再発する。

## 影響

- `pnpm memory`と`pnpm external`はコマンドとして完全に独立する。
  Ownerから見て「これはMemoryかExternal Brainか」を意識して使い
  分ける必要がある（19章のUI・UX判断基準に基づき、`status:
  inbox`初期値により「とりあえず保存」で迷いを減らす設計とした）。
- 将来、外部から得た知識をOwner自身の恒久的な知識として
  `MemoryEntry`に「昇格」させたいニーズが具体化した場合
  （指示書22章「MemoryEntryへの昇格提案」）、それは新しい
  UseCase（例：`PromoteExternalKnowledgeToMemory`）として追加検討
  する。Version10では実装しない。
