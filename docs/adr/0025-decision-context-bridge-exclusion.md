# ADR 0025: DecisionContextをBridge Import/Exportに統合しない理由

## ステータス

承認済み

## 関連Principle

- ADR 0010（Bridge Layer：既存Repositoryへの薄い委譲）
- ADR 0024（DecisionContextをValue Objectにした理由）

## コンテキスト

Version12指示書10章は「Bridge ExportにDecisionContextを追加して
よい。ただし保存対象ではない。一時生成物。」と述べていた（「して
よい」という許容表現であり、必須ではない）。指示書17章の完成条件
には「Bridge対応」が含まれている。

## 決定

`DecisionContext`を`BridgeLogType`（`ImportLogsUseCase`/
`ExportLogsUseCase`が扱う型）には追加しない。Bridge Import/Export
のコード自体への変更は行わない。

「Bridge対応」という完成条件は、DecisionEngineが内部で
`RetrieveKnowledgeUseCase`（Version11、Bridgeが扱う
ExternalKnowledge/ExternalSourceと同じRepositoryを参照する）を
そのまま再利用していること——すなわちBridgeが管理するデータと
同じ基盤の上で動作していること——によって満たされているものと解釈
する。

## 根拠

`ExportLogsUseCase`は、各`BridgeLogType`について対応する
Repositoryの`findAll()`を呼び出し、永続化された全件をエクスポート
する、という一貫した設計になっている（ADR 0010）。DecisionContextは
Repositoryを持たない一時生成物であり（ADR 0024）、`findAll()`に
相当する操作が存在しない。

`DecisionContext`をExportに含めるとすれば、「`type=DecisionContext`
かつ`question`パラメータを渡すとその場でDecisionEngineを実行して
結果を返す」という、他の全`BridgeLogType`とは全く性質の異なる
特殊分岐をExportLogsUseCaseに追加することになる。これは指示書10章
自身が「一時生成物」と釘を刺している通り、Exportという「保存済み
データの取り出し」という一貫した意味を壊す。

指示書10章の文言が「してよい」という許容（義務ではない）である
ことと、指示書18章が「AI API呼び出し」等と並べて厳格に禁止して
いる項目にBridge統合が含まれていないことから、これは「実装しても
良いが必須ではない」機能として合理的に見送れると判断した
（Principle 9: 段階的拡張、具体的な必要性が確認できるまで
先取りしない）。

## 影響

- Owner/ARCが「DecisionContextをJSONファイルとしてBridge経由で
  やり取りしたい」という具体的なニーズを持った場合、次のVersionで
  `POST /decision/support`のレスポンス（既にJSON形式）をそのまま
  ファイル保存する運用で当面は代替できる。専用のBridge統合が
  必要になった場合は、Export側にDecisionContext専用の分岐を
  追加することを検討する。
- `pnpm bridge -- export`のテストにDecisionContextのケースは
  追加していない（対象外のため）。
