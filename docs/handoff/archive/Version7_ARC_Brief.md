# Version7 ARC指示書（原文アーカイブ）

Owner経由で2026年7月に`docs/handoff/ARC_INBOX.md`に貼られた、
ARC（ChatGPT）からのVersion7指示書の原文。処理結果は
`docs/reports/Version7_Report.md`を参照（Principle 4: 記録は資産である）。

---

# Project ARC Version7 指示書

## Theme

**ARC Connector（ARC × Project ARC Integration）**

---

# 背景

Version6でSmart Captureを実装した。

その結果、重要なことが分かった。

Project ARCは

> **Systemは判断しない**

という原則を持つ。

そのため、

Project ARC自身にAIの判断能力を持たせることは行わない。

一方で、Ownerが目指している体験は

> 「写真や一言を送るだけで自然に記録される」

ことである。

この2つを両立するため、

Version7では

**ARCが判断し、Project ARCが保存する**

という責務分離を正式に設計する。

---

# Version7 Goal

Project ARCを

**AI**

ではなく

**人生OSのデータ基盤**

として進化させる。

---

# 最重要アーキテクチャ

責務は以下とする。

Owner

↓

ARC

* 会話
* 文脈理解
* 提案
* 振り分け判断

↓

ARC Connector

↓

Project ARC

* 保存
* 検索
* 更新
* 履歴管理

Project ARC自身は

何が重要か

どこへ保存するか

を判断しない。

---

# Version7で実装してほしいもの

## 1. ARC Connector

CLI専用設計から、

外部から利用できるApplication Interfaceへ進化させる。

この段階では

HTTP API

CLI Bridge

どちらでもよい。

重要なのは

Application層をそのまま利用できること。

---

## 2. Capture API

最低限以下を検討してほしい。

POST /capture

POST /reflection

POST /skin

POST /purchase

POST /appearance

GET /timeline

現時点では

実装可能な範囲だけでよい。

---

## 3. UseCase整理

CLIから直接Repositoryを触る設計が残っているなら、

Version7で整理する。

理想

CLI

↓

UseCase

↓

Repository

↓

Infrastructure

今後APIが追加されても

UseCaseを共有できる構成にしたい。

---

## 4. Timeline設計

Version8で実装予定。

Version7ではEntityだけ設計してよい。

TimelineEntry

* date
* source
* title
* summary
* metadata

各Logを横断できる構造を検討してほしい。

---

## Architecture

ADRを追加すること。

候補

ADR0007

"ARC Connector"

内容

* なぜAPI化するのか
* なぜProject ARC自身は判断しないのか
* ARCとの責務分離

を整理する。

---

# Version6で判明した制約

以下は維持すること。

Systemは判断しない。

画像解析は行わない。

文脈理解は行わない。

Smart Captureは

候補提示のみ。

この思想はVersion7でも維持する。

---

# ARCとの役割

ARCは

* 文脈理解
* Log振り分け
* Reflection
* 提案
* 分析

Project ARCは

* 保存
* 更新
* 検索
* 履歴

責務を混ぜないこと。

---

# 将来のロードマップ

Version7

ARC Connector

↓

Version8

Timeline

↓

Version9

Knowledge

↓

Version10

Health Integration

↓

Version11〜

Life OS

---

# Version Report

今回もテンプレートに従うこと。

特に

## ARCへの引き継ぎ

では

今回追加したAPIによって

ARCが何をできるようになったか

を重点的にまとめてほしい。

---

# ARCへのフィードバック

今回は特に以下を記載してほしい。

## 1

ARCがProject ARCへ

どのようなデータを送ることを想定しているか

## 2

将来

ChatGPTとの正式連携を行う場合、

どの部分を差し替えれば済む設計になっているか

## 3

今後APIが増えた場合、

Architectureが破綻しない理由

## 4

Version8へ向けた技術的課題

---

## CTOへのお願い

Version7は**機能を増やすことが目的ではありません。**

目的は、「CLIアプリ」から「ARCが利用できるデータ基盤」へ進化させることです。

APIを実装するかどうかよりも、**ARCとProject ARCの責務を明確に分離し、将来の連携に耐えられる設計を作ること**を最優先してください。

---

一つだけ追加で提案したいことがある。

Version7が終わったら、**「Project ARC アーキテクチャ図」**（レイヤー構成・データの流れ・ARCとの接続点）を作ってもらうよう依頼すると、その後の開発やレビューがかなり楽になると思う。これはVersion8以降の土台として大きな価値があるはず。

---

## 処理メモ（Claude Code、2026年7月）

- ブリーフは新規ADRを「ADR0007」と呼んでいたが、ADR 0007は既に
  Version6「Smart CaptureにおけるSystem/ARCの責務分担」で使用済み
  のため、本Versionの新規ADRは**ADR 0008**として採番した。
- 「POST /capture」は単体のエンドポイントとして示されていたが、
  ADR 0007の「Systemは分類しない」という制約を維持するため、
  `POST /capture/suggest`（提案のみ）と`POST /capture`（確定済み
  destinationsの書き込み）の2エンドポイントに分割した。理由は
  `docs/reports/Version7_Report.md`3章・`docs/adr/0008-...md`参照。
- 「GET /timeline」は指示書内で矛盾していた（Capture APIの一覧に
  含まれる一方、別項で「Version8実装予定、Version7はEntityのみ」と
  明記）。後者を優先し、Version7では`TimelineEntry`型のみ設計、
  エンドポイント自体は実装しなかった。
