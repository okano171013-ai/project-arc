# ADR 0013: ExternalSourceとExternalKnowledgeの分離

## ステータス

承認済み

## 関連Principle

- ADR 0005（Memory/Inventory/Reflectionの境界：性質の異なる記録を
  無理に統合しない）
- `docs/ai-roles.md` Principle 9（段階的拡張／YAGNI）

## コンテキスト

Version10指示書は「外部情報の出典（本・記事・動画等）」と「そこから
得た知識・情報」を1つのEntityにまとめるか分離するかを論点として
挙げていた（指示書3章）。

## 決定

`ExternalSource`（出典：書誌情報）と`ExternalKnowledge`（知識：
実際に保存する内容）を別Entity・別Repositoryとして分離する。
1つのSourceを複数のKnowledgeが参照できる（`ExternalKnowledge.sourceId`
は`ExternalSource.id`への参照）。

ただしCLI（`pnpm external`）は日常利用のしやすさを優先し、
「知識を追加する流れの中で出典も一緒に入力する」一体型の入力
フローとする。Domain/Application層の分離とCLI UXの一体化は
矛盾しない（UIの使いやすさとモデルの正しさは別レイヤーの関心事）。

## 根拠

出典（書誌情報）と知識（内容の解釈）は性質もライフサイクルも異なる。

- 出典は「この情報源が存在する」という事実の記録であり、登録後に
  変わることは基本的にない（せいぜい誤字修正程度）。
- 知識は`status`（inbox/reviewed/archived）や`confidence`を持ち、
  Ownerが後から見直し・評価し続ける対象である。

これはADR 0005で確立した「異なる性質の記録を無理に統合しない」という
判断基準の延長線上にある。1つのEntityに混ぜると、「出典の書誌情報を
直したいだけなのに知識のレビュー状態まで一緒に触ってしまう」
「同じ出典から得た複数の知識のうち1つを消したら出典情報も消える」
といった不整合が起きやすくなる。

## 影響

- `AddExternalKnowledgeUseCase`/`UpdateExternalKnowledgeUseCase`は
  `sourceId`が指定された場合、対応する`ExternalSource`の存在を
  検証する（孤立した参照を作らない）。
- Bridge Import/Exportでも両者は別の`BridgeLogType`
  （`ExternalSource`/`ExternalKnowledge`）として扱う（ADR 0015）。
- Timelineには知識側のみを含める（ADR 0017）。
