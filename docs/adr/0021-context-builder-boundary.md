# ADR 0021: Context Builderの責務境界（ARCの推論を生成しない）

## ステータス

承認済み

## 関連Principle

- ARC Constitution 第2条（Systemは判断しない）
- `docs/ai-roles.md` Principle 1/2/10（意思決定範囲：一切なし／
  役割の兼務は禁止）

## コンテキスト

Version11指示書は、ARCとの会話例として

```
【External Brain】
○○先生の講義
2026/7/13
「処分性は〜」

---

【ARC】
この知識を踏まえると...
```

という二層構造を示していた。Context Builder（指示書③）が
どこまでを生成すべきか——「【External Brain】」ブロックのみか、
「【ARC】」の推論部分まで含めるか——を明確にする必要があった。

## 決定

`buildRetrievalContext()`は「【External Brain】」ブロック
（出典・日付・原文・Ownerの要約/コメント/保存理由）のみを生成する。
「【ARC】この知識を踏まえると...」という推論・結論部分は一切
生成しない。これはARC（ChatGPT）が実際の会話の中で行う責務であり、
Project ARC側では生成しない。

この決定は指示書18章の「Version11で実装しないもの」（OpenAI API・
Claude API・Gemini API・自動要約）とも整合する——推論部分を生成
するには何らかのAIモデルを呼び出す必要があり、それはVersion11の
スコープ外である。

## 根拠

「取得した知識をどう解釈し、Ownerにどう伝えるか」は、
Constitution第2条が定める「何が正しいか・何を優先すべきかの判断」
そのものであり、これまで一貫してARCまたはOwnerの責務としてきた
領域（ADR 0007のSmart Capture、ADR 0012のExternal Brain判断範囲と
同じ境界線）。Context BuilderがAIを呼び出して「【ARC】」部分まで
生成してしまうと、Systemが解釈・推論という兼務禁止の役割
（Principle 10）を担うことになる。

`buildRetrievalContext()`はDomain/Application層の純粋関数として
実装し、I/O（HTTP呼び出し等）を一切持たない。これにより「Systemは
判断しない」という制約がコードの構造からも保証される（呼び出す
関数がないので、判断のしようがない）。

## 影響

- ARC Connector利用時、`POST /knowledge/retrieve`のレスポンスに
  含まれる`context`フィールドは「【External Brain】」ブロックの
  連結のみである。ARC側で「【ARC】」以降を自分の会話文脈で生成する
  実装が必要になる。
- 将来「Systemが要約案・推論案を出す」機能を検討する場合、それは
  Constitution第2条に関わる新しいガバナンス判断であり、Owner確認が
  必要な変更として扱うこと（`CLAUDE.md`の「確認が必要な判断」に
  該当、指示書が想定するVersion12「Decision Support」以降で改めて
  議論する）。
