# ADR 0009: Timelineの対象範囲とデータ取得方法

## ステータス

承認済み

## 関連Principle

- Principle 9（段階的拡張／YAGNI）
- Principle 10（責務は交換可能ではなく分担する）

## コンテキスト

Version7で設計だけ行った`TimelineEntry`型（`SkinLog`/`PurchaseLog`/
`ChallengeLog`/`AppearanceLog`/`Reflection`/`Memory`/`InventoryItem`/
`Capture`の8ソースを想定）をもとに、Version8で実際の集約UseCase
（`GetTimelineUseCase`）と`GET /timeline`エンドポイントを実装する
にあたり、2つの判断が必要だった。

## 決定

### 1. 実装対象は6ソースに限定する（Memory/InventoryItemは含めない）

Timelineの目的は「各Logを横断した時系列一覧」であり、「ある瞬間に
何が起きたか」を並べるものである。この性質に合うのは、日付キーを
持つ6つのLog（Reflection/AppearanceLog/SkinLog/PurchaseLog/
ChallengeLog/Capture）である。

- **Memory**（ADR 0005）は「時間に紐づかない、更新され続ける知識」
  として意図的に設計されており、「いつ起きたか」という時系列的な
  意味を持たない（`updatedAt`はあるが、それは「最後に更新された
  時刻」であって「出来事の日時」ではない）。Timelineに混ぜると、
  「知識の更新」と「出来事の発生」という異なる性質の記録が同じ
  時系列に並んでしまい、ADR 0005が避けようとした「異なる性質の
  記録を無理に統合する」問題が再発する。
- **Life Inventory**（ADR 0006）も同様に、「あるモノを今も使って
  いる」という継続的な状態を表すEntityであり、単一の時点に紐づく
  出来事ではない（購入日はあるが、それ以降ずっと「保有中」という
  状態が続く）。

`TimelineEntry`型自体は8ソース分の`TimelineSource`を保持したまま
にする（型の変更は不要、将来Memory/InventoryItemを対象にしたい
具体的なニーズが出た時点で集約UseCaseに追加すればよい、Principle 9）。

### 2. Reflectionの全件取得は`findRecent(大きな上限)`で代用する

`ReflectionRepository`ポートは`findByDate`/`findRecent(limit)`のみを
持ち、`findAll()`は存在しない（Version1からの設計、日次記録という
性質上、実運用では「直近N件」で十分だったため）。Timelineで「実質
全件」を得るために、`findRecent(3650)`（約10年分の日次記録に相当）
を呼び出すことで対応した。

`ReflectionRepository`に`findAll()`を追加する選択肢もあったが、
既存の3実装（`InMemoryReflectionRepository`/
`JsonFileReflectionRepository`/`SupabaseReflectionRepository`）
全てに手を入れる必要があり、特にSupabase実装は実際に接続して
検証する手段がこのサンドボックス環境にない。Timelineという1機能の
ために、検証できない変更を本番相当のRepositoryへ加えるリスクを
取るより、既存メソッドの上限値を大きくする形で対応する方が
安全と判断した（Principle 9: 具体的な必要性が確認できるまで
先取りしない）。

## 根拠

- ADR 0005・ADR 0006で確立した「性質の異なる記録を無理に統合しない」
  という判断基準を、Timelineという新しい横断機能でも一貫して適用した。
- `findRecent(大きな上限)`は将来的に不正確になりうる（10年を超える
  日次記録がある場合）が、その具体的な問題が起きるのはまだ先であり、
  今`findAll()`を追加してSupabase実装まで変更するコストに見合わない。

## 影響

- Memory・Life Inventoryを含めた横断的な参照が必要な場合は、既存の
  `pnpm find`（横断検索、ADR 0005）を使う。Timelineと検索は目的が
  異なる別機能として併存する。
- 将来Reflectionの記録が3650件（約10年）を超える場合、Timelineから
  古い記録が漏れる可能性がある。その時点で`findAll()`の追加を
  検討すること。
