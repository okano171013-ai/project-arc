# ADR 0019: Version11 Query Layerのスコープ

## ステータス

承認済み

## 関連Principle

- `docs/ai-roles.md` Principle 9（段階的拡張／YAGNI）
- ADR 0014（External Brain検索を`pnpm find`から分離）

## コンテキスト

Version11指示書は、`pnpm external -- search`・`pnpm find`・
`pnpm timeline`・（将来の）Memory検索が別々の仕組みになっている
現状を指摘し、`QueryRequest → QueryEngine → Repository`という
共通のQuery Layerを追加することを提案していた（指示書①）。一方で
同じ指示書の他の節（②Retrieval API、④Citation、⑤Ranking、完成の
定義）は一貫してExternalKnowledge/ExternalSourceの取得のみを対象に
説明しており、Memory・Timeline・InventoryをQuery Layerに含める
具体的な要件は挙げられていなかった。

## 決定

Version11では、`QueryEngine`に相当する`RetrieveKnowledgeUseCase`を
**ExternalKnowledge/ExternalSourceの取得専用**として実装する。
`pnpm find`（Memory/Inventory対象、ADR 0005・0014）・
`pnpm timeline`・既存の`SearchExternalKnowledgeUseCase`（Version10、
CLI一覧表示用）はそのまま維持し、統合・置き換えはしない。

`RetrieveKnowledgeUseCase`は「`QueryRequest`（query/tags/topics/
limit）を受け取り、既存のRepositoryへ問い合わせてスコア順の結果を
返す」という指示書①の構造をそのまま体現しているが、対象を
ExternalKnowledge/ExternalSourceの2つに限定した「Query Layerの
最初の実装例」という位置づけとする。

## 根拠

指示書①が提案する全面的なQuery Layer統合（Memory/Timeline/
Inventoryを含む）は、Version11の完成の定義（「ARCが必要な知識を
Retrieveできる」）に対して過大なスコープである。ADR 0014で
「External Brainの検索は独立したコマンドとして持つ」と決定した
際の判断基準（無理な共通化はしない、Principle 9）は今回も同様に
適用できる——Memory/Timeline/Inventoryの取得要件が具体化しない
うちに共通抽象を先取りすると、抽象の形が実際のニーズとずれる
リスクがある。

`SearchExternalKnowledgeUseCase`（Version10）とは役割を分けた。
`Search`はCLI/HTTPで人間が一覧・一致箇所を確認するための機能、
`Retrieve`はARCへ渡すことを想定したスコア順ランキング＋Context
Builder出力が主目的であり、フィールドの重み付けや出力形式が異なる
（ADR 0020参照）。ロジックの一部重複（フィールド一致判定）は
許容し、無理な共通化はしない（3行程度の重複は早すぎる抽象化より
良いという方針を踏襲）。

## 影響

- 将来、Memory・Timeline・Inventoryについても「ARCへ根拠付きで
  渡す」という具体的なニーズが生まれた場合、`RetrieveKnowledgeUseCase`
  と同じ構造（QueryRequest/QueryEngine/Repository）を他のRepository
  にも適用する形でQuery Layerを拡張できる。ただし、その際も
  Repository自体は変更しない（指示書①「Repositoryはそのまま」を
  維持）。
- `pnpm external -- search`と`pnpm external -- retrieve`という
  似た機能の2コマンドが併存する。用途の違い（人間向け一覧 vs
  ARC向け取得）をCLIのヘルプ・ドキュメントで明確にする。
