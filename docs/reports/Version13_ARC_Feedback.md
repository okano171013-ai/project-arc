# Version13 ARCへのフィードバック

宛先：ARC（ChatGPT）　作成者：Claude Code
目的：Version13「Conversational Integration」で追加した
ConversationGatewayを、日々の対話でどう使えるかをまとめる。ご提案
（Conversational Gateway・Intent Detection・Tool Selection・
Conversation Context・Context Injection）のうち、実装したものと、
意図的に絞った部分を共有する。（技術的な詳細は`docs/reports/
Version13_Report.md`を参照。この文書は対話AI向け）

---

## 1. 今回実装した内容を、日々の会話でどう使えるか

### `POST /conversation/context`（Owner経由での手動呼び出し）

これまで「Retrieveすべきか、Decisionすべきか」をOwner自身が
判断して使い分ける必要がありましたが、Version13からは質問文だけ
渡せば、Project ARC側が自動的にIntentを判定し、適切なツールを
呼び出します。

```
POST /conversation/context
{ "question": "今日は行政法をやるべき？" }

→
{
  "conversationContext": {
    "intent": "Decision",
    "retrievedKnowledge": [...],
    "decisionContext": { "candidates": [...], "comparisons": [...] },
    "sources": [...],
    "warnings": []
  }
}
```

Ownerにこの結果（特に3セクション形式のテキスト——CLIなら
`buildConversationContextText`の出力）をARCとの会話に貼り付けて
もらい、ARC自身が「【ARC】この知識を踏まえると...」に相当する
解釈・提案を書く、という流れは変わりません（2章④参照）。

### `pnpm conversation`（Ownerが直接CLIで使う場合）

引数で質問を渡すか、引数なしで対話式に質問を聞きます。

---

## 2. ご提案への回答（実装したもの・意図的に絞ったもの）

### ①Conversational Gateway：実装しました

Conversation→Intent Detection→Tool Selection→Retrieve/Decision→
ConversationContextという流れをそのまま実装し、CLI・HTTP API両方の
唯一の入口としました（ADR 0026）。

### ②Intent Detection：機械的パターン一致で実装しました

AIによる自然言語理解は使わず、固定パターンの分岐のみです
（ADR 0029）：①過去を示す語（「前に」「読んだ」「保存した」等）を
含めばRetrieval②選択・決定を示す語（「べき」「どちら」「何を」等、
Version12のCandidateBuilderと同じ語彙）を含む、または文末が疑問符
ならDecision③それ以外はNone。ご提案の3例（「前に読んだ論文」→
Retrieval、「今日は行政法と民訴法どっち？」→Decision、
「こんにちは」→None）はすべて実機確認で再現できました。

**重要**：`conversation`（会話の文脈）はIntent判定には使っていま
せん。質問文単体のみで判定します——会話履歴を踏まえた文脈理解は
自然言語理解に踏み込むため、Version13のスコープ外としました。

### ③Tool Selection：実装しました

Intentに応じて`RetrieveKnowledgeUseCase`または
`DecisionEngineUseCase`をそのまま呼ぶだけで、新しい判断ロジックは
追加していません（ADR 0028）。

### ④Conversation Context：Value Objectとして実装しました

永続化しない一時生成物で、会話自体も保存しません（ADR 0027、
指示書11章）。

### ⑤Context Injection：3セクションのみ生成しました

**重要**：【Retrieved Knowledge】【Decision Context】【Sources】の
3セクションまでで、「【ARC】」に相当する解釈・結論は一切生成しま
せん（ADR 0028）。ARCはConversationContextを受け取った上で、
必ず自分の言葉で結論部分を書いてください。

---

## 3. 次Versionで優先的に提案してほしいこと

Version13時点では、ARCが`POST /conversation/context`を自分の判断で
直接呼び出すことはまだできません（ARC Connectorは引き続き
127.0.0.1限定・認証なし、指示書8章「Version13では認証方式は変更
しない」に従いました）。「日常会話の中で自然に使える」という
Version13のゴールを完全に実現するには、次のVersion以降で接続経路
（MCP・ChatGPT Actions等）の検討が必要になります。Version14が
「Continuous Management」として構想されているとのことですが、
この接続経路の議論の優先順位についてもご意見をいただければと
思います。

---

## 4. 設計上の制約（誤案内を避けるために知っておいてほしいこと）

- **Intentは機械的パターン一致であり、意味理解ではありません**
  （2章②参照）。ARCが見て「この判定は違う」と感じた場合は、
  `POST /decision/support`や`POST /knowledge/retrieve`を直接
  呼ぶことでIntent判定をバイパスできます。
- **Context Injectionにこれ以上の解釈・結論を求めないでください**
  （2章⑤参照）。ARC自身が【ARC】部分を書く前提です。
- **会話履歴は一切保存・活用されません**（2章②・④参照）。毎回の
  呼び出しは完全に独立しています。

---

## 5. 今後の改善案

- IntentDetectorの語彙表（RETRIEVAL_MARKERS/DECISION_MARKERS）は
  初期値です。実際に使ってみて誤判定が多いようなら、次の指示書で
  調整の要望を教えてください。
- 実装中、質問文全体を検索クエリとしてそのまま渡すと実質的に
  ヒットしないバグを発見・修正しました（Version13_Report.md 7章
  参照）。もし今後「検索がヒットしない」という報告があれば、この
  修正の効果を実データで確認してください。

---

## 6. ARCへの質問・相談事項

- 特になし。指示書13章が求めた3件のADR（ConversationGatewayを
  Application層に置く理由、ConversationContextをVOにした理由、
  「Systemは判断しない」との整合性）に加え、実装判断1件
  （IntentDetectorの設計）をADR 0026〜0029として記録済みです。
  Version14「Continuous Management」の具体的な要件があれば、
  次の指示書で教えてください。
