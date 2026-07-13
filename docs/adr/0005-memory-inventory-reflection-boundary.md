# ADR 0005: MemoryとLife Inventory / Reflectionの境界

## ステータス

承認済み

## 関連Principle

- Principle 9（段階的拡張／YAGNI — 重複した仕組みを作らない）
- Principle 4（記録は資産である）
- Principle 8（長期保守性）

## コンテキスト

Version4で「ARC Memory」を新設するにあたり、2つの境界線を明確に
する必要があった。

1. Memoryの保存対象カテゴリ「Assets」は、Version2〜3で作った
   Life Inventory（財布・傘・シェーバー等）と対象が重複して見える。
2. Owner要件で「MemoryRepositoryはReflectionRepositoryとは分離する」
   ことが明示されている。

このまま何も整理せずに実装すると、「シェーバーの情報はMemoryと
Inventoryのどちらに書くのか」が曖昧になり、検索（Search機能）で
重複した結果が返る、あるいはどちらか片方しか更新されず情報が
古くなる、といった問題が起きる。

## 決定

### MemoryとLife Inventoryの役割分担

- **Life Inventory**：個々の「モノ」を対象にした、構造化された
  詳細管理（購入日・価格・状態・交換目安・メンテナンス履歴）。
  「このシェーバーをいつ買って、いつ手入れしたか」という粒度。
- **Memory（Assetsカテゴリ）**：「今何を使っているか」の素早い
  参照に特化した軽量な知識（例：「シェーバー → PHILIPS 5000
  Series」）。詳細な購入・メンテナンス情報は持たず、Inventoryへの
  参照や短いメモに留める。

Owner向けの実運用としては、**詳細に管理したいモノはLife Inventoryに、
すぐ思い出せれば十分なモノや、そもそもInventoryほど厳密に管理する
気がない情報はMemoryに**、という使い分けを想定する。両者を無理に
統合しない（Principle 9）。

### MemoryRepositoryの分離

Owner要件通り、`MemoryRepository`を`ReflectionRepository`とは
独立したポートとして新設する。理由：

- Reflectionは「その日単位で閉じる記録」（Principle設計時点から
  日付をキーにした時系列データ）。
- Memoryは「時間に紐づかない、更新され続ける知識」（例：目標や
  好みは、ある日を境に変わるのではなく、随時上書きされる）。

この性質の違いは、Repositoryのメソッド設計にも表れる
（Reflectionは`findByDate`が中心、Memoryは`search`/`findByCategory`
が中心）。無理に共通化せず、別々のRepositoryとして設計する。

### Search機能の対象範囲

Version4の横断検索（`pnpm search`）は、**MemoryとLife Inventoryの
みを対象とする**。Reflection（日々の記録）とAppearance Log（月次の
記録）は対象外とする。理由：Search機能の目的は「あれ何使ってた？」
に即答することであり、これは「知識の参照」であって「過去の日記を
検索する」ことではない。両者を同じ検索ボックスに混ぜると、
「今何を持っているか」を知りたいだけなのに過去の振り返り文章が
大量にヒットし、UXの目的（分かりやすさ優先）に反する。

## 根拠

- 重複した保存先を作らないことで、「どちらが正か分からなくなる」
  という典型的な二重管理の問題を避ける。
- Repositoryを分離することで、Version1〜3で確立したClean
  Architectureの一貫性（Domain/Applicationが永続化の詳細を知らない）
  を保ったまま拡張できる。

## 影響

- `MemoryEntry`は`InventoryItem`と似たフィールド（category, title,
  content）を持つが、意図的に別Entityとする。
- 将来Decision Engineを設計する際、判断材料としてMemory・Inventory
  両方を参照する設計になる可能性が高い。その際もRepositoryは
  分離したまま、UseCase層で組み合わせる方針を維持する。
