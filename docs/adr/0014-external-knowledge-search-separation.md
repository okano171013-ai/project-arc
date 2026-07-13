# ADR 0014: External Brainの検索を`pnpm find`から分離する

## ステータス

承認済み

## 関連Principle

- ADR 0005（Memory/Inventory/Reflectionの境界）
- `docs/ai-roles.md` Principle 9（段階的拡張／YAGNI）

## コンテキスト

Project ARCには既に`pnpm find`（`SearchEverything`UseCase）という
横断検索コマンドがあり、Memory・Life Inventoryを対象にしている
（ADR 0005）。Version10指示書は、External Brainの知識検索を
この既存の`pnpm find`に統合するか、独立した検索として持つかを
論点として挙げていた（指示書4章）。

## 決定

`SearchExternalKnowledgeUseCase`を独立して新設し、
`pnpm external -- search <keyword>`という専用コマンドとする。
`pnpm find`（`SearchEverything`）には統合しない。

検索対象は`ExternalKnowledge`自身のフィールド（title/content/
ownerSummary/ownerComment/purpose/topics/tags）に加え、紐づく
`ExternalSource`のフィールド（title/author/publisher/identifier）
も含める（`matchedIn`にどのフィールドで一致したかを返す）。
空文字・未指定のクエリは「該当なし」ではなく「全件表示」として
扱う。

## 根拠

`pnpm find`はADR 0005で「Memory・Life Inventoryを対象にした横断
検索」として意図的にスコープを決めた機能であり、これをExternal
Brainまで拡張するとADR 0005が定めた境界が曖昧になる。

さらにExternalKnowledgeの検索は、自身のフィールドだけでなく
関連するExternalSourceのフィールドも横断する必要があり
（例：「日本経済新聞社」で検索して、そのSourceに紐づく全Knowledge
を見つけたい）、`SearchEverything`の既存インターフェースが前提と
する「単一Entityのフィールドに対する部分一致」とは検索の性質が
異なる。無理に共通化するより、独立したUseCaseとして持つ方が
将来の変更（例：Source側のフィールド追加）にも対応しやすい
（Principle 9: 具体的な必要性が確認できるまで共通化を先取りしない）。

## 影響

- 検索の入口が`pnpm find`と`pnpm external -- search`の2つに分かれる。
  Ownerから見て利用感が分かれる点は技術的負債として認識し、
  利用パターンが安定した時点で統合UXを再検討する余地を残す
  （Version10 Reportに記載）。
