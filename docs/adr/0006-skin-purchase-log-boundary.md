# ADR 0006: Skin Log / Purchase Log と Appearance Log / Life Inventoryの境界

## ステータス

承認済み

## 関連Principle

- Principle 9（段階的拡張／YAGNI — 重複した仕組みを作らない）
- Principle 4（記録は資産である）
- Principle 8（長期保守性）

## コンテキスト

Version5で「Skin Log」「Purchase Log」を新設するにあたり、ADR 0005
（Memory/Inventory/Reflectionの境界）と同種の問題が2つ発生した。

1. Skin Logで記録したい内容（肌の状態）は、Version4の`AppearanceLog`
   がすでに持つ`skin`フィールド（自由記述）と対象が重複して見える。
2. Purchase Logで記録したい内容（消耗品の購入〜使い切り）は、
   Version2〜3の`InventoryItem`がすでに持つ`purchaseDate`/
   `condition`/`maintenanceHistory`と対象が重複して見える。

整理せずに実装すると、「肌の状態はAppearance LogとSkin Logのどちらに
書くのか」「化粧水はLife InventoryとPurchase Logのどちらに書くのか」
が曖昧になり、ADR 0005で避けた二重管理の問題が再発する。

## 決定

### Skin LogとAppearance Logの役割分担

- **Appearance Log**：月次の、肌・髪・髭・服装・体型を含む総合的な
  外見の振り返り。各項目は自由記述で、総合評価（1〜5）を付ける。
  「今月全体としてどうだったか」という粒度。
- **Skin Log**：肌の状態のみを対象に、赤み・毛穴・ニキビ・ニキビ跡・
  皮脂の5項目を1〜5の数値で構造化して記録する。月次縛りはなく、
  頻繁に記録して時系列で比較することを目的とする。写真比較機能
  （`pnpm skin -- compare`、画像解析はせずファイルパスを提示するのみ）
  を持つ点もAppearance Logと異なる。

Appearance Logの`skin`フィールドは、月次の総合コメント欄として
そのまま残す（例：「Skin Logの数値を見て一言でまとめる」用途）。
両者は意図的に統合しない。

### Purchase LogとLife Inventoryの役割分担

- **Life Inventory**：財布・シェーバー・靴等、長期間使い続ける
  耐久消費財の状態管理。1つのモノを1つのレコードとして持ち、
  状態・交換目安・メンテナンス履歴（複数）を追記していく。
- **Purchase Log**：化粧水・洗顔料・カミソリ替刃等の消耗品を対象に、
  「購入日→使い始め→使い切り」のライフサイクルを管理する。同じ
  商品（例：メラノCC）を何度も買い直すことを前提に、**購入のたびに
  新しいレコードを作る**（Life Inventoryのように1つのモノに履歴を
  追記していく設計ではない）。

判断基準：「同じモノを長く使い続け、状態が変化していく」ものは
Life Inventory、「使い切ったら同じ商品を買い直す」消耗品はPurchase
Logに記録する。

## 根拠

- ADR 0005と同じ理由（重複した保存先を作らない、Repositoryを分離
  したままUseCase層で組み合わせる方針を維持）。
- Skin LogとPurchase Logは、既存のAppearance Log/Life Inventoryとは
  「記録の粒度」と「更新のライフサイクル」が異なるため、無理に
  既存Entityへフィールド追加するのではなく、別Entityとして新設した
  方がドメインモデルとして正確になる。

## 影響

- `SkinLog`は`AppearanceLog`と似た構造（date + record + createdAt）
  だが、月次縛りがなく同日複数件を許可する点が異なる。
- `PurchaseLog`は`InventoryItem`と異なり、`update()`のような
  自由な上書きは持たず、`startUsing()`/`finish()`という状態遷移
  メソッドのみを公開する（未使用→使用中→使い切りの一方向遷移）。
- Version6でSmart Capture（写真・文章の自動振り分け）を設計する際、
  「肌の写真 → Skin Log」「レシート・消耗品購入 → Purchase Log」
  という判断基準は、本ADRの境界定義がそのまま分類ロジックの根拠になる。
