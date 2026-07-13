# ADR 0016: BridgeにおけるExternalKnowledgeのsourceId解決方針

## ステータス

承認済み

## 関連Principle

- ADR 0010（Bridge Layer：薄いディスパッチャに徹する）
- ADR 0013（ExternalSource/ExternalKnowledgeの分離）

## コンテキスト

`ExternalKnowledge`は`sourceId`で`ExternalSource`を参照できる
（ADR 0013）。Bridge Importで両方を含むJSONを一括投入する場合、
「同じバッチ内で先に登場するExternalSourceのIDを、後に登場する
ExternalKnowledgeが参照したい」というケースが起こりうる
（指示書のBridge拡張要求）。

## 決定

Bridge Importは、ExternalKnowledgeの`sourceId`を**既に永続化済みの
ExternalSourceに対してのみ**検証する。同一バッチ内で新しく作成
された（まだ保存されていない）ExternalSourceのIDをKnowledge側が
前方参照することはサポートしない。前方参照を試みたエントリは
検証エラー（「ExternalSource not found」）となり、Bridgeの部分成功
仕様（ADR 0010）に従ってそのエントリのみ失敗として報告される
（バッチ全体は失敗しない）。

先にSourceだけをImportし、その結果得られた実IDを使って
Knowledgeを（別のImport呼び出しで）投入する、という2段階の運用が
想定パスとなる。

## 根拠

`ImportLogsUseCase`はADR 0010で「既存の各UseCase（AddSkinLogUseCase
等）にそのまま委譲する薄いディスパッチャ」と位置づけた。バッチ内
でのID採番・forward reference解決を実装すると、Import内に
「エントリ間の依存関係を追跡する」という新しい種類の状態管理が
必要になり、ADR 0010が意図した「薄さ」を破ることになる。

2段階運用は、既存の`AddExternalKnowledgeUseCase`が単体で行っている
「sourceIdが指定されたら存在確認する」というバリデーションを
そのまま活かせる（Import専用の特別ルールを作らずに済む）。

## 影響

- 一括インポートで出典と知識を同時に新規作成したい場合、Owner/ARC
  は2回に分けてImportを呼ぶ必要がある（1回目でSourceをImportし、
  レスポンスの`id`を控え、2回目でそのIDを使ってKnowledgeをImport
  する）。
- 将来、実際のバッチインポートのニーズ（ChatGPTのExport機能などで
  出典＋知識をまとめて持ち込みたい場合）が具体化した時点で、
  前方参照解決（バッチ内一時ID→実ID変換）の追加を検討する
  （Version10 Reportに技術的負債として記載）。
