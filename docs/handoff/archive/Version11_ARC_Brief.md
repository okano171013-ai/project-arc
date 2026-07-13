# Version11 ARC指示書（原文アーカイブ）

Owner経由でARC（ChatGPT）からVersion11のテーマ提案として届いた
メッセージの原文（2026年7月13日、Version10完了報告への応答として）。

---

これはかなり重要な分岐点です。

Version10で「知識を蓄積する」ことは完成しました。 しかし、まだARCはその知識をほとんど利用できません。
そのため、Version11は新しいLogを増やすVersionではなく、
External BrainをARCとの対話で実際に使えるようにするVersion
にするべきだと思います。
私はVersion11を
Knowledge Retrieval
と定義します。
理由は、

- Version10 = 保存
- Version11 = 利用
- Version12 = 活用
- Version13 = 提案

という自然な発展になるからです。

## Version11｜Knowledge Retrieval

目的は
ARCが必要な知識だけをExternal Brainから取得し、根拠付きで会話できるようにすること
です。

ここで重要なのは、
ARCは
全データ
を読むべきではありません。

例えば
ユーザーが
「行政法の処分性ってなんだっけ？」
と聞いたら
ARCは

```
行政法
処分性
行政事件訴訟法
```

などでExternal Brainを検索し、
関係するKnowledgeだけ取得します。

取得したら

```
【External Brain】
○○先生の講義
2026/7/13
「処分性は〜」

---

【ARC】
この知識を踏まえると...
```

という二層構造で答えます。

Version10で分離した
原文
と
ARCの推論
をそのまま利用できます。

### Version11で追加したいもの

#### ① Query Layer

今は

```
external search
memory
timeline
find
```

全部別です。

Version11では

```
QueryRequest
↓
QueryEngine
↓
Repository
```

を追加します。

Repositoryはそのまま。
Queryだけ統一します。

#### ② Retrieval API

例えば

```
POST /knowledge/retrieve
```

すると

```
query
tags
topics
limit
```

を渡せる。

返ってくるのは

```
Knowledge[]
Sources[]
```

#### ③ Context Builder

取得したKnowledgeを
そのままAIへ渡すと
情報量が多すぎます。

なので
Context Builder
を作ります。

例えば

```
Question
↓
Knowledge
↓
ContextBuilder
↓
Prompt
```

を生成します。

#### ④ Citation

ARCが
「この情報はどこから？」
を説明できるように
Knowledgeごとに

```
Source
↓
Title
↓
URL
↓
capturedAt
```

を表示します。

#### ⑤ Ranking

検索結果が100件あっても困ります。

Version11では
単純でいいので

```
タイトル一致
+
タグ一致
+
Topic一致
```

くらいでスコアリングします。

Embeddingは不要です。

### Version11で実装しないもの

ここは重要です。

まだ

- ベクトル検索
- RAG
- OpenAI API
- Claude API
- Gemini API
- 自動要約
- 自動タグ
- 自動分類

全部不要。

Version11では
検索して返す
だけ。

### Version11で完成すること

例えば

おと
「前に保存した会社法の記事なんだっけ？」

ARC
↓
Retrieve
↓
External Brain
↓
3件ヒット
↓
ARC
「○○新聞の記事ですね。内容は〜出典は〜あなたは保存理由として『司法試験で使えそう』と書いています。」

また

おと
「この前読んだ論文と先生の授業って矛盾してた？」

ARC
↓
論文Knowledge取得
↓
授業Knowledge取得
↓
比較
↓
回答

これができる。

### Version11終了時

Project ARCは

```
記録する
↓
覚える
↓
探す
↓
使う
```

まで完成します。

ここまで来ると、
Version12からようやく
AIによる提案
へ進めます。

私なら、Version11の正式名称は次のようにします。

Version11｜Knowledge Retrieval
キャッチコピー
「覚えている」から「必要な時に取り出せる」へ。

これはVersion1〜10の思想とも非常に整合的です。

- Version10：External Brain（知識を蓄積する）
- Version11：Knowledge Retrieval（知識を取り出す）
- Version12：Decision Support（知識を意思決定に生かす）
- Version13：Life Management（継続的な提案・マネジメント）

この流れなら、Project ARCは「人生OS」というビジョンに沿って、一段ずつ自然に進化していけます。
