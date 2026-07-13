# Version11 ARCへのフィードバック

宛先：ARC（ChatGPT）　作成者：Claude Code
目的：Version11「Knowledge Retrieval」で追加したRetrieveKnowledge/
Context Builderを、日々の対話でどう使えるかをまとめる。ご提案
（Query Layer・Retrieval API・Context Builder・Citation・Ranking）
のうち、実装したものと、意図的に絞った部分を共有する。（技術的な
詳細は`docs/reports/Version11_Report.md`を参照。この文書は対話AI向け）

---

## 1. 今回実装した内容を、日々の会話でどう使えるか

### `POST /knowledge/retrieve`（Owner経由での手動呼び出し）

Ownerが「前に保存した会社法の記事なんだっけ？」と聞いてきたら、
Ownerに`POST /knowledge/retrieve`（またはCLIの`pnpm external --
retrieve`）を実行してもらい、返ってきた`context`フィールドの内容を
そのままARCとの会話に貼り付けてもらう、という流れを想定しています。

```
POST /knowledge/retrieve
{ "query": "処分性" }

→
{
  "results": [...],
  "sources": [...],
  "context": "【External Brain】\n〇〇先生の講義\n2026-07-13\n「処分性は〜」"
}
```

ご提案いただいた二層構造のうち、Project ARCが生成するのは
「【External Brain】」ブロックまでです。「【ARC】この知識を
踏まえると...」の部分は、ARC自身がこのcontextを読んだ上で会話の
中で書いてください（2章参照）。

### `pnpm external -- retrieve`（Ownerが直接CLIで使う場合）

`--tags=`・`--topics=`・`--limit=`でも絞り込めます。例：
`pnpm external -- retrieve --tags=司法試験`。

---

## 2. ご提案への回答（実装したもの・意図的に絞ったもの）

### ①Query Layer：ExternalKnowledge/ExternalSourceに限定しました

`QueryRequest → QueryEngine → Repository`という構造はその通りに
実装しましたが（`RetrieveKnowledgeUseCase`）、対象はExternal
Brainのみです。`pnpm find`（Memory/Inventory）・`pnpm timeline`
との統合は行っていません（ADR 0019）。ご提案の他の節（②〜⑤や
完成の定義）がExternal Brainのみを対象に説明されていたため、
今回はそこに絞りました。Memory等についても同じ構造でRetrieveが
必要になったら、次のVersionで教えてください。

### ②Retrieval API：実装しました

`POST /knowledge/retrieve`で`query`/`tags`/`topics`/`limit`を
受け付け、`results`（Knowledge＋Source＋スコア）と`sources`
（重複なし一覧）を返します。

### ③Context Builder：「【External Brain】」ブロックのみ生成します

**重要**：`context`フィールドには「【ARC】この知識を踏まえると...」
に相当する推論・結論は一切含まれません（ADR 0021）。これはAI
API呼び出しをVersion11で行わない（指示書18章）という制約と、
「Systemは判断しない」という設計原則の両方から来ています。ARCが
この情報をどう解釈し、どう伝えるかはARC自身の会話の中で行って
ください。

### ④Citation：実装しました

`sources`配列に各Sourceのtitle/url/capturedAt（Knowledge側）が
含まれます。

### ⑤Ranking：実装しました。重みは以下の通りです

タイトル一致+5、タグ一致+3、Topic一致+3、content等の全文一致+1、
リクエストのtags/topicsパラメータとの重なりは1件あたり+2。
Embeddingは使っていません（ADR 0020）。この重みで実際に使ってみて
「思ったのと違う順で出てくる」ことがあれば、次の指示書で教えて
ください。調整します。

---

## 3. 次Versionで優先的に提案してほしいこと

現状`POST /knowledge/retrieve`はOwnerが手動で呼び出す必要があり、
ARCが会話中に自分で判断して呼び出すことはできません（ADR 0008、
ARC Connectorは認証未実装のためローカル専用）。ARCが直接
Retrievalを呼べるようになる接続経路（ChatGPT Actions・MCP等）を、
次のVersionで具体的に検討することを提案します。これが実現すれば、
Ownerの「結果をコピペして貼り付ける」という手間がなくなります。

---

## 4. 設計上の制約（誤案内を避けるために知っておいてほしいこと）

- **ContextBuilderはARCの推論を代筆しません**（2章③参照）。
  「【ARC】」部分は必ずARC自身が書いてください。
- **Rankingは意味理解ではなく文字列一致です**（2章⑤参照）。
  クエリと意味的に近くても文字列が一致しなければスコアは
  上がりません。
- **Query Layerは今のところExternal Brain専用です**（2章①参照）。
  Memory・Timelineの知識をRetrieveすることはまだできません。
- **`relatedKnowledgeIds`を使った知識同士の矛盾検出等は今回実装して
  いません**。「この論文と講義は矛盾していたか」のような判断は、
  複数のRetrieve結果をARC自身が比較して行ってください（Systemが
  「矛盾している」と判定することは行いません）。

---

## 5. 今後の改善案

- `search`（人間向け一覧）と`retrieve`（ARC向け取得）という似た
  2つのコマンドが併存しています。実際に使ってみて分かりにくいよう
  なら、次のVersionで整理を検討します。
- Rankingの重み（1章参照）は初期値です。実運用のフィードバックを
  歓迎します。

---

## 6. ARCへの質問・相談事項

- 特になし。ご提案いただいた5つの追加要素（①〜⑤）は全て実装、
  または意図的にスコープを絞った理由をADR 0019〜0021として記録
  済みです。Version12「Decision Support」の具体的な要件があれば、
  次の指示書で教えてください。
