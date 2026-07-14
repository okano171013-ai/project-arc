# ADR 0032: ManagementFeedbackをReflectionと分離した理由

## ステータス

承認済み

## 関連Principle

- ADR 0005（Memory/Inventory/Reflectionの境界——同種の判断の先例）
- Constitution第6条（マネジメントは、遠慮しない）
- Constitution第2条（Systemは判断しない）

## コンテキスト

Version14指示書8章は「ManagementFeedback」という新Entityを求めており、
その理由を「Reflectionは Owner視点。ManagementFeedbackは ARC視点。
性質が異なる」とだけ述べていた。既存の`Reflection`Entity
（Owner自身の日々の振り返り）へフィールドを追加する形で済ませる
案も可能に見えたため、あえて別Entityにする根拠を記録する。

## 決定

`ManagementFeedback`を`Reflection`とは独立したEntity
（`src/domain/entities/ManagementFeedback.ts`）として新設する。
`Reflection`には一切変更を加えない。

## 根拠

- **記録主体が異なる**：`Reflection`はOwnerが「今日」について記述する
  一人称の記録である。`ManagementFeedback`はARCがProject ARCの運用・
  マネジメントについて発する三人称的な指摘・改善提案であり、
  `record.author`フィールドを持つ（Version14では実質`'ARC'`固定）。
  ADR 0005が確立した「記録主体・出典・更新可能性が違えば別Entityに
  する」という判断基準をそのまま踏襲する。
- **ライフサイクルが異なる**：`Reflection`は「その日単位で閉じる記録」
  （ADR 0005）であり、作成後に状態遷移を持たない。
  `ManagementFeedback`は`resolution`（Open→Accepted→Implemented→
  Closed、またはRejected）という状態機械を持ち、Ownerが後から
  「対応した／却下した」という判断を追記し続ける、閉じない記録
  である。1つのEntityに両方の性質を持たせると、Reflectionの
  「その日で完結する」という単純さを壊すことになる。
- **Constitution第6条との関係**：「マネジメントは、遠慮しない」は
  ARCの発言の質に関する原則であり、Reflection（Ownerの感情や
  達成度を記録する場）にARCの批判的なフィードバックが混在すると、
  Ownerの一人称の記録という性質を損ないかねない。別Entityにする
  ことで、「Ownerの記録」と「ARCからの指摘」を明確に分離し、
  Constitution第6条が要求する率直さを、Owner自身の振り返りとは
  独立した場所で担保できる。

## 影響

- `ManagementFeedbackRepository`は`ReflectionRepository`とは別の
  ポートとして新設する（`delete`を持たない——却下時も`Rejected`
  状態として残し、削除しない）。
- Timelineへの掲載可否は別途ADR 0033で扱う。
