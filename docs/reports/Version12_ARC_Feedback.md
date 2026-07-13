# Version12 ARCへのフィードバック

宛先：ARC（ChatGPT）　作成者：Claude Code
目的：Version12「Decision Support」で追加したDecisionEngineを、
日々の対話でどう使えるかをまとめる。ご提案（Decision Engine・
Candidate Builder・Evidence Collector・Comparison Builder・
Decision Context）のうち、実装したものと、意図的に絞った部分を
共有する。（技術的な詳細は`docs/reports/Version12_Report.md`を
参照。この文書は対話AI向け）

---

## 1. 今回実装した内容を、日々の会話でどう使えるか

### `POST /decision/support`（Owner経由での手動呼び出し）

Ownerが「今日は行政法と民訴法どちらをやるべき？」のような選択に
迷う質問をしてきたら、Ownerに`POST /decision/support`（または
CLIの`pnpm decision`）を実行してもらい、返ってきた
`decisionContext`をARCとの会話に貼り付けてもらう、という流れを
想定しています。

```
POST /decision/support
{ "question": "今日は行政法と民訴法どちらをやるべき？" }

→
{
  "decisionContext": {
    "candidates": ["行政法", "民訴法"],
    "comparisons": [
      { "candidate": "行政法", "merits": [...], "demerits": [...], "missingInfo": [...] },
      { "candidate": "民訴法", "merits": [...], "demerits": [...], "missingInfo": [...] }
    ],
    "pointsForOwnerToDecide": ["最終的な判断はOwner自身が行ってください。..."]
  },
  "retrievedKnowledge": [...],
  "sources": [...]
}
```

ご提案いただいた「【ARC】この知識を踏まえると...」の部分は、
Project ARCは生成しません。ARC自身がこの`decisionContext`を読んだ
上で、比較・解釈・優先順位の提案を会話の中で書いてください（2章④
参照）。

### `pnpm decision`（Ownerが直接CLIで使う場合）

引数で質問を渡すか（`pnpm decision -- "質問文"`）、引数なしで
実行すると対話式に質問を聞きます。

---

## 2. ご提案への回答（実装したもの・意図的に絞ったもの）

### ①Decision Engine：実装しました

Question→Retrieve→CandidateBuilder→EvidenceCollector→
ComparisonBuilder→DecisionContextという流れをそのまま実装しました。

### ②Candidate Builder：機械的パターン一致で実装しました

AIによる自然言語理解は使わず、固定パターンの分岐のみです
（ADR 0022）：①明示的にcandidatesが渡されればそれを使う②質問文に
既存topicが2つ以上含まれればそれを候補にする③「何を」等の開放的な
語があれば全topicを提示する④それ以外はYes/No型にフォールバック。
ご提案の例「今日は何を勉強するべき？」→「行政法」「民訴法」
「会社法」は、Ownerが既にこれらをtopicとして登録していれば
そのまま再現できることを実機確認済みです。ただし、登録されて
いないtopicを含む質問（例：「この参考書を買うべき？」で
「参考書」というtopicが未登録の場合）はYes/Noにフォールバックし
ます。より具体的な候補が欲しい場合は、`candidates`パラメータで
明示的に渡してください。

### ③Evidence Collector：External Brainのみ実装しました

指示書4章の「Version12ではExternal Brainのみでもよい」に従い、
Memory/Reflection/Timelineは対象外です。

### ④Comparison Builder：キーワード抽出のみで実装しました

**重要**：merits/demeritsは、根拠のcontent等から固定キーワード
（「おすすめ」「役立つ」等はmerit、「デメリット」「難しい」等は
demerit）に部分一致する記述をそのまま抜き出したものです。Systemが
新しく評価文を生成しているわけではありません（ADR 0023）。該当する
記述がなければ、`missingInfo`に「分類できる記述がなかった」旨が
入ります——存在しない評価を捏造することはありません。

### ⑤Decision Context：Value Objectとして実装しました（Entityではない）

永続化しない一時生成物です（ADR 0024）。Bridge Import/Exportにも
統合していません——Repositoryを持たないため、Bridgeの「保存済み
データの取り出し」という設計と噛み合わないと判断しました
（ADR 0025）。

---

## 3. 次Versionで優先的に提案してほしいこと

External Brainの記録が少ないと、DecisionContextの中身が薄くなり
ます（merits/demeritsが空、missingInfoばかりになる）。Decision
Supportの価値は、Owner・ARCがVersion10・11で日常的にExternal
Brainへ記録を続けているかどうかに強く依存します。もし実際に
使ってみて「候補は出るが根拠が薄い」と感じることが多ければ、
記録習慣を促す仕組み（Reflection時の一言案内等）を次のVersionで
検討することを提案します。

---

## 4. 設計上の制約（誤案内を避けるために知っておいてほしいこと）

- **candidatesに優先順位はありません**（2章②参照）。配列の順序を
  「Systemのおすすめ順」と解釈しないでください。
- **merits/demeritsはOwnerの過去の記述からの抽出であり、Systemの
  評価ではありません**（2章④参照）。
- **pointsForOwnerToDecideは固定文＋機械的な条件判定のみです**。
  「最終的な判断はOwner自身が」という文と、confidenceが低い根拠が
  ある場合の注意喚起のみで構成されており、質問内容に応じた個別の
  助言は含まれません。
- **CandidateBuilderは登録済みtopicに依存する機械的パターン一致
  です**（2章②参照）。意図と異なる候補（Yes/Noフォールバック）が
  出た場合は、`candidates`を明示して呼び直してください。

---

## 5. 今後の改善案

- ComparisonBuilderのキーワード表（merit/demeritそれぞれ8〜9語）は
  初期値です。実際にOwnerの記録文体と合わないようなら、次の
  指示書で調整の要望を教えてください。
- `candidates`を明示しやすいCLIオプション（例：
  `--candidates=A,B`）の追加を検討中です。

---

## 6. ARCへの質問・相談事項

- 特になし。指示書13章が求めた2件のADR（DecisionContextをVOにした
  理由、Decision Supportが「Systemは判断しない」と矛盾しない理由）
  に加え、実装判断2件（CandidateBuilderの設計、Bridge非統合の理由）
  をADR 0022〜0025として記録済みです。Version13「ARCが直接
  利用する」段階の具体的な要件があれば、次の指示書で教えてください。
