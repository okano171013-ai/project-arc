# Version9 ARC指示書（原文アーカイブ）

Owner経由で2026年7月に`docs/handoff/ARC_INBOX.md`に貼られた、
ARC（ChatGPT）からのVersion9指示書の原文。処理結果は
`docs/reports/Version9_Report.md`を参照（Principle 4: 記録は資産である）。

---

Version9 指示書
Project ARC Version9
Theme

ARC Bridge

Goal

ARCとProject ARCの

最初の接続点を作る。

Version9では

完全自動は目指さない。

Ownerが

ARCの提案を

Project ARCへ

簡単に渡せる状態

を作る。

背景

Version8で

Timelineが完成した。

ARC Connectorも完成した。

しかし

ARC自身は

Project ARCを

直接利用できない。

Version9では

このギャップを埋める。

実装方針
1

Bridge Layer

新設。

目的

将来

CLI

REST API

MCP

SDK

どこからでも

同じUseCaseを利用できるようにする。

2

Import Interface

例えば

{
  "logs":[
    {
      "type":"purchase",
      "data":{}
    },
    {
      "type":"skin",
      "data":{}
    }
  ]
}

こういうJSONを

一括登録できるようにする。

CLIでもよい。

3

Export Interface

Timelineだけではなく

各Logを

JSON出力できるようにする。

4

Third Person Evaluation

Version6から未解決。

正式に設計する。

候補

Appearanceとは分離。

Entity化も検討。

最低限

構造化できるようにする。

例

date

person

evaluation

category
5

Architecture

Bridge Layer追加。

Architecture Diagram更新。

ADR追加。

Version Report

今回もテンプレート。

ARCへの引き継ぎ

重点

Bridge Layerによって

何ができるようになったか。

ARCへのフィードバック

今回追加してほしい。

①

Bridge Layerは

MCPへ

移行しやすいか。

②

将来

ChatGPT連携を

追加したとき

差し替える箇所。

③

Version10で

Health Integrationへ進める準備は整ったか。

ARCから追加提案

Version9で

Knowledgeはまだ実装しない。

理由。

Knowledgeは

データを読むAI

がいて初めて価値がある。

今は

データを安全に受け渡す橋

を作る方が優先順位が高い。

最後に、一つだけCTO（クロコ）へ追加でお願いしたいこと

ここまで来ると、Project ARCは「機能開発」よりプラットフォーム開発に近づいています。

なのでVersion9以降は、毎Versionの最後に

「このVersionは10年後のProject ARCにどう貢献するか」

という短い章をVersion Reportへ追加してほしいです。

短期的な機能だけでなく、長期的な設計価値を毎回言語化していくことで、「人生OS」というビジョンからブレずに開発を続けられるはずです。これはロードマップ全体の一貫性を保つ上でも大きな意味があると思います。

---

## 処理メモ（Claude Code、2026年7月）

- ブリーフはImport例で`"type":"purchase"`のような小文字を使って
  いたが、既存の`CaptureLogType`等の命名規則（`PurchaseLog`のような
  PascalCase）に合わせ、`BridgeLogType`も`'PurchaseLog'`等の
  PascalCaseで統一した。
- 「Knowledgeはまだ実装しない」というARCからの追加提案を尊重し、
  Version9のスコープに含めなかった。
- 「10年後のProject ARCへの貢献」章は`docs/reports/TEMPLATE.md`へ
  正式に追加し、Version9以降の全Version Reportで必須とした。
