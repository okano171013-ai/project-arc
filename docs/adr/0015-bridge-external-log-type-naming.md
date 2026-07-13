# ADR 0015: BridgeにおけるExternalSource/ExternalKnowledgeの命名規則

## ステータス

承認済み

## 関連Principle

- ADR 0010（Bridge Layer）

## コンテキスト

Version10指示書には、Bridge（Import/Export）でExternal Brainの
2種類を扱う際のLog種別名として、既存の`BridgeLogType`
（`Reflection`/`Memory`/`InventoryItem`/`AppearanceLog`/`SkinLog`/
`PurchaseLog`/`ChallengeLog`/`ThirdPersonEvaluation`、いずれも
PascalCaseでEntity名と一致）とは異なる命名例が示されていた。

指示書23章は「実装方針の細部はClaude Codeが自律的に決めてよい」
とも明記していた。

## 決定

指示書の命名例には従わず、既存の`BridgeLogType`の命名規則
（Entity名と一致するPascalCase）をそのまま踏襲し、
`'ExternalSource' | 'ExternalKnowledge'`を追加する。

## 根拠

Bridgeの8つの既存Log種別は全てPascalCaseでEntity名と一致しており、
これは「JSONの`type`フィールドを見ればどのEntity/UseCaseに対応する
か一目で分かる」という一貫した設計になっている。指示書の命名例
だけを理由に2種類だけ異なる命名規則を混在させると、この一貫性が
崩れ、Import/Export利用者（ARCやOwner自身がJSONを手で書く場面を
含む）に無用な認知負荷を与える。

「指示書の記述と既存実装が食い違う場合は既存の規則を優先する」
という判断は、Version4〜6でも繰り返し行ってきたのと同じ方針
（ブリーフの前提より実際のコードベースの状態を優先する）。

## 影響

- なし。Bridge Layer自体がVersion9で新設されたばかりで、外部
  （ARCとの会話等）への周知が済んでいる命名ではないため、
  変更コストは実質ゼロ。
