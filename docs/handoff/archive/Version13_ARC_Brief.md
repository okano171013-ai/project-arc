# Version13 ARC指示書（原文アーカイブ）

Owner経由でARC（ChatGPT）から届いたVersion13実装指示書の原文
（2026年7月13日、Version12完了報告への応答として）。

---

Version13は、Project ARC全体の中でも最も重要なVersionになると思います。

Version10〜12は保存・検索・判断材料生成まででした。しかし、まだ
毎回「Owner→CLI→コピペ→ARC」という流れです。Version13は、この橋を
完成させます。私はVersion13をConversational Integrationと定義
します。

キャッチコピー：「Project ARCを、初めて日常会話の中で自然に
使えるようにする。」

## Project ARC Version13 実装指示書

### Version13｜Conversational Integration

### 0. Version13の目的

Version13では、Project ARCをCLI中心の知識管理システムから、
ARCとの日常対話で利用できる知識基盤へ進化させる。

ここでいうIntegrationとは、ARCがProject ARCの代わりに判断すること
ではない。ARCが必要な時だけProject ARCへ問い合わせ、取得した情報を
根拠として会話することを意味する。

Version13の目的はProject ARCを会話へ統合することである。

### 1. Version13で守る原則

Version10〜12で確立した「Systemは判断しない」を維持する。

Project ARCは保存・検索・比較のみを担当する。ARCは解釈・説明・
優先順位の提案のみを担当する。Ownerが最終決定者であることは
変わらない。

### 2. Conversational Gateway

Application層へConversationGatewayを追加する。

責務：Conversation → Intent Detection → Tool Selection → Retrieve
→ Decision → ConversationContext

ConversationGatewayはARC Connectorを呼び出す唯一の入口とする。

### 3. Intent Detection

質問を以下へ分類する：Retrieval、Decision、None

例：
- 「前に読んだ論文」→ Retrieval
- 「今日は行政法と民訴法どっち？」→ Decision
- 「こんにちは」→ None

ここではAIによる自然言語理解は使わない。Version12同様ルールベース
でよい。

### 4. Tool Selection

Intentに応じてRetrieve、Decision、Noneを選択する。ここでもSystemは
「どのツールを使うか」だけ判断する。回答内容は生成しない。

### 5. Conversation Context

ConversationContextはValue Objectとする。

例：Intent、RetrievedKnowledge、DecisionContext、Sources、Warnings

永続化しない。

### 6. API

追加：POST /conversation/context

入力：conversation、question

出力：conversationContext

### 7. CLI

追加：pnpm conversation

例：`pnpm conversation` → 質問: 今日は行政法をやるべき？ →
ConversationContext生成

### 8. ARC Connector

ConversationContext取得用APIを追加。Version13では認証方式は変更
しない。引き続き127.0.0.1限定。

### 9. Context Injection

ConversationContextは以下の構造で返す。

```
【Retrieved Knowledge】
・・・

【Decision Context】
・・・

【Sources】
・・・
```

Project ARCはこれ以上書かない。ARCが「【ARC】・・・」を書く。

### 10. Query最適化

ConversationGatewayは必要最低限のRetrieveのみ行う。全件検索は
禁止。limitを必ず指定する。

### 11. ログ

ConversationGatewayはConversation自体を保存しない。Version13では
会話履歴管理は行わない。

### 12. Entity

追加しない。ConversationContextはValue Object。

### 13. ADR

最低限、以下のADRを作成する：
- ConversationGatewayをApplication層へ置く理由
- ConversationContextをEntityではなくValue Objectにした理由
- ConversationGatewayが「Systemは判断しない」と矛盾しない理由

### 14. テスト

Retrieval判定、Decision判定、None判定、API、CLI、ARC Connector、
Context生成、limit、Source取得

### 15. 実機確認

例：
- 前に保存した行政法の記事は？
- 今日は何を勉強する？
- こんにちは
- この参考書買う？

ConversationContextが生成されること。

### 16. Version13で実装しないもの

ChatGPT Actions、MCP、Claude API、OpenAI API、Gemini API、自動
保存、自動更新、自動Reflection、自動Memory更新、会話履歴保存、
自動要約、自動推論

Version13では接続口だけを作る。

### 17. 完成条件

ConversationGateway追加、Intent Detection追加、Tool Selection
追加、ConversationContext追加、API追加、CLI追加、ARC Connector
対応、ADR追加、Version13_Report作成、test/typecheck/lint成功、
実機確認、コミット

### 18. Version13終了時の状態

Project ARCは記録→検索→比較→会話へ統合、まで完成する。

ここで初めて、Project ARCは「CLIツール群」ではなく、ARCが必要な
知識を適切なタイミングで取得・活用するための基盤になる。

### Version14への布石

Version13が完成したら、次はいよいよContinuous Management
（継続的マネジメント）の段階です。そこでは新しい記録機能を増やす
のではなく、Reflectionの内容・External Brain・Decision Support・
学習状況・習慣データを横断して、「最近は行政法の根拠となる記録が
少ないですね」「今週はDecision Supportを3回使いましたが、External
Brainへの記録が追いついていません」といった継続的なフィードバック
を提供できるようになります。

この流れなら、Version1から積み上げてきた「人生OS」というビジョン
に対し、設計思想を崩すことなく自然に到達できます。
