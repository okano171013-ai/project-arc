# ADR 0027: ConversationContextをEntityではなくValue Objectにした理由

## ステータス

承認済み

## 関連Principle

- ADR 0024（DecisionContextをEntityではなくValue Objectにした理由）

## コンテキスト

Version13指示書5章・12章は「ConversationContextはValue Object
とする」「新しいEntityは追加しない」と明示的に指定していた。
指示書11章は「ConversationGatewayはConversation自体を保存しない。
Version13では会話履歴管理は行わない」とも述べている。この判断の
根拠を記録する。

## 決定

`ConversationContext`は`src/domain/value-objects/`配下に置く素朴な
インターフェースとし、`id`を持つEntity・Repositoryを持つ永続化
対象とはしない。`ConversationGatewayUseCase`はConversationContextを
どこにも保存せず、呼び出しごとに使い捨てる。

## 根拠

これはADR 0024（DecisionContextの判断）と全く同じ理由づけである。
`ConversationContext`は同一性を持たず（同じ質問を2回投げれば
Repositoryの状態次第で異なる結果になりうる）、更新されず
（生成時点で完結した射影）、永続化もされない（指示書11章）。

さらにVersion13固有の理由として、**会話履歴を保存しないことは
指示書が明示する制約そのもの**である。仮に`ConversationContext`を
Entityとして永続化してしまうと、それは事実上「Owner・ARCの会話
ログを保存する」機能を実装することになり、指示書16章が明示的に
禁止する「会話履歴保存」に抵触する。Value Objectとして設計する
ことは、単なる技術的な分類ではなく、「会話を保存しない」という
プライバシー・スコープ上の制約をコード構造そのもので保証する
役割を持つ。

## 影響

- `pnpm conversation`や`POST /conversation/context`を同じ質問で
  何度実行しても、過去の呼び出し結果は一切参照されない
  （ステートレス）。
- 将来「会話履歴を踏まえた応答」が必要になった場合（指示書が
  明示的に対象外とした機能）、それは新しいEntity・Repositoryの
  追加を伴う別のガバナンス判断であり、Owner確認が必要な変更として
  扱うこと。
