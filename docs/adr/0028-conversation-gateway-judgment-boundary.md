# ADR 0028: ConversationGatewayが「Systemは判断しない」と矛盾しない理由

## ステータス

承認済み

## 関連Principle

- ARC Constitution 第2条（Systemは判断しない）
- ADR 0021（Context Builderの責務境界）
- ADR 0023（Decision Supportが「Systemは判断しない」と矛盾しない理由）

## コンテキスト

Version13指示書1章は「Project ARCは保存・検索・比較のみを担当する。
ARCは解釈・説明・優先順位の提案のみを担当する」と明記していた。
「会話への統合」という、字面上は最もSystemの自律性が高まりそうな
機能が、なぜこれまでの境界線を破らないのかを明確にする必要が
あった。

## 決定

`ConversationGatewayUseCase`が行う「判断」は、以下の1点に限定する。

- **Intent判定（Retrieval/Decision/Noneのどれに該当するか）**——
  これは固定パターンによる分類であり、`IntentDetector`が担う
  （ADR 0029）。

それ以外の一切の解釈・回答生成は行わない：

1. **Tool Selectionは「どのUseCaseを呼ぶか」の選択のみ**——
   Retrieveなら`RetrieveKnowledgeUseCase`、Decisionなら
   `DecisionEngineUseCase`をそのまま呼ぶだけで、それぞれの内部で
   新しい判断ロジックは追加しない（指示書4章「回答内容は生成
   しない」）。
2. **`conversation`（会話文脈）はIntent判定に使わない**——
   質問文（`question`）のみを見て機械的に分類する。会話履歴を
   踏まえた文脈理解は自然言語理解に踏み込むため、Version13の
   スコープ外とした（ADR 0029参照）。
3. **Context Injectionは3セクション（【Retrieved Knowledge】
   【Decision Context】【Sources】）まで**——ARCの解釈・結論
   （「【ARC】」部分）は一切生成しない（指示書9章）。これは
   Version11のContext Builder（ADR 0021）・Version12の
   DecisionEngine（ADR 0023）と同じ境界線をConversationGatewayでも
   継続している。
4. **会話自体を保存しない**——ConversationGatewayはステートレスで
   あり、過去の会話から学習・推測することもない（ADR 0027）。

## 根拠

「ARCがProject ARCの代わりに判断することではない」（指示書0章）
という記述は、Constitution第2条をVersion13の文脈で言い換えたもの
に過ぎない。ConversationGatewayの新規性は「呼び出しの起点が
Owner/ARCのCLI操作から、より会話に近い1回の質問応答へ変わった」
という点だけであり、判断の主体（ARC/Owner）や境界線
（Systemは保存・検索・比較のみ）はVersion10〜12から一切変わって
いない。

Intent判定という「新しい種類の分岐」が加わったことで一見
Systemの自律性が増したように見えるが、Intent判定の対象は
「どの既存ツールを呼ぶか」という実行経路の選択であり、
「何が正しいか・何を優先すべきか」というOwnerの人生に関わる
判断ではない。この違いは、Version6のRuleBasedCaptureClassifier
（キーワードでLog種別の下書き提案をするだけ、実際の記録可否は
Owner確定）以来、Project ARCが一貫して守ってきた区別である。

## 影響

- ConversationGatewayの出力（ConversationContext）は、ARCが
  そのまま会話の結論として使うことを想定していない。ARCは
  必ず自分の言葉で「【ARC】」部分を書く必要がある（指示書9章）。
- 将来Intent判定の精度向上のためにAIモデルを使う提案が出た場合、
  それはConstitution第2条に関わる新しいガバナンス判断であり、
  Owner確認が必要な変更として扱うこと。
