# Version13 Report: Conversational Integration

`docs/reports/TEMPLATE.md`の14章構成に準拠。

## 1. Version概要

**テーマ**：Conversational Integration — 「Owner→CLI→コピペ→ARC」
という手作業の橋を、1回の質問応答で完結する形に近づける。
Version12完了報告に対するARCの応答としてチャット上のメッセージで
届いた指示書に基づく（原文は`docs/handoff/archive/
Version13_ARC_Brief.md`に保管）。「Project ARCを、初めて日常会話の
中で自然に使えるようにする。」

**指示書の特徴**：ARC自身が「Project ARC全体の中でも最も重要な
Versionになる」と位置づけていた。Version10〜12を「保存・検索・
判断材料生成」という3段階として明確に総括した上で、Version13を
「これらを1つの入口（ConversationGateway）に統合する」という構造
として定義していた。設計上の最大の論点は、指示書2章が挙げた
「Conversation→Intent Detection→Tool Selection→Retrieve→
Decision→ConversationContext」というフローをどう実装するか、
特にIntent Detectionをどう機械的に行うかだった。

## 2. 今回実装した機能（理由も含めて説明）

### ConversationGatewayUseCase

指示書2章の流れ（Conversation→Intent Detection→Tool Selection→
Retrieve/Decision→ConversationContext）を実装したUseCase。
CLI・HTTP APIの両方が呼び出す唯一の入口とした（ADR 0026）。

### IntentDetector

質問文をRetrieval/Decision/Noneへ機械的パターン一致で分類する
（ADR 0029）。判定順：①過去の記録を示す語（「前に」「読んだ」
「保存した」等）を含む→Retrieval②選択・決定を示す語（「べき」
「どちら」「何を」等、Version12のCandidateBuilderと同じ語彙）を
含む、または文末が疑問符→Decision③それ以外→None。

### Tool Selection

Intentに応じて`RetrieveKnowledgeUseCase`（Version11）または
`DecisionEngineUseCase`（Version12）をそのまま呼び出す。新しい
検索・比較ロジックは一切追加しない。

### ConversationContext（Value Object）

`question`/`intent`/`retrievedKnowledge`/`decisionContext`/
`sources`/`warnings`を持つ、永続化しない一時生成物（ADR 0027）。
会話自体（`conversation`引数）も保存しない（指示書11章）。

### Context Injection（`buildConversationContextText`）

ConversationContextを【Retrieved Knowledge】【Decision Context】
【Sources】の3セクションのテキストへ整形する純粋関数。「【ARC】」
に相当する解釈・結論は一切生成しない（ADR 0028）。

### CLI（`pnpm conversation`）／HTTP API（`POST /conversation/context`）

CLIは質問を引数で渡すか、対話式に聞く。APIはbody
`{question, conversation?, limit?}`を受け取り、
`{conversationContext}`を返す。ARC Connectorの認証方式は
Version8から変更していない（127.0.0.1限定、指示書8章）。

## 3. 実装しなかった機能（延期理由も記載）

- **会話履歴の保存・文脈を踏まえたIntent判定**：指示書11章「会話
  履歴管理は行わない」に従い、`conversation`引数は受け取るが
  Intent判定には使わない（ADR 0029）。判定は直近の質問文のみを
  見る。
- **AI API呼び出し・自動要約・自動推論**：指示書16章で明示的に
  対象外。
- **ChatGPT Actions・MCP接続**：指示書16章で明示的に対象外
  （「Version13では接続口だけを作る」）。
- **認証の追加**：指示書8章「Version13では認証方式は変更しない」
  に従い、ARC Connector全体の認証はADR 0008のまま。

## 4. Architecture Review

### 新規Value Object（Domain層）

- `src/domain/value-objects/ConversationContext.ts`
  （`ConversationContext`/`ConversationIntent`）

### 新規UseCase（Application層、`conversation-gateway/`フォルダ新設）

- `src/application/use-cases/conversation-gateway/DetectIntent.ts`
  （IntentDetector）
- `src/application/use-cases/conversation-gateway/
  ConversationGateway.ts`（ConversationGatewayUseCase）
- `src/application/use-cases/conversation-gateway/
  BuildConversationText.ts`（Context Injectionの純粋関数）
- 対応するテストファイル2件

新規Entity・新規Port・新規Repositoryはなし——既存の
`RetrieveKnowledgeUseCase`（Version11）・`DecisionEngineUseCase`
（Version12）をそのまま利用した。

### 新規Infrastructure

- `src/infrastructure/cli/conversation.ts`（新規CLI、
  `pnpm conversation`）

### 変更したファイル

- `src/application/serializers.ts`：`serializeConversationContext`
  追加
- `src/infrastructure/http/server.ts`：`conversationGateway`
  UseCaseの配線、`POST /conversation/context`ルート追加
- `src/infrastructure/http/server.test.ts`：HTTPエンドポイント
  テスト追加
- `package.json`：`conversation`スクリプト追加

## 5. ADR（追加・変更したADR、追加しなかった理由）

指示書13章が明示的に求めた3件に加え、実装上の重要な判断1件を
合わせ、ADR 0026〜0029の4件を新規作成した。

- **ADR 0026**: ConversationGatewayをApplication層へ置く理由
  （指示書13章の必須要求）
- **ADR 0027**: ConversationContextをEntityではなくValue Objectに
  した理由（指示書13章の必須要求）
- **ADR 0028**: ConversationGatewayが「Systemは判断しない」と
  矛盾しない理由（指示書13章の必須要求）
- **ADR 0029**: IntentDetectorの機械的パターンマッチング設計
  （指示書が明示要求していないが、AI不使用でIntent判定を行う
  具体的ロジックはこのVersionで最も判断が分かれる部分であり、
  Version12のADR 0022と同じ理由でADR化した）

## 6. テスト（件数、カバレッジ、typecheck、lint、実機確認）

- `pnpm test`：**181件**全て緑（Version12完了時点168件から13件
  増加。IntentDetector 7件、ConversationGateway 5件、HTTP server
  1件）
- `pnpm typecheck`：エラーゼロ
- `pnpm lint`：エラーゼロ
- **実機確認**：指示書15章が挙げた4つの質問例を、Bridge Import
  経由で実データ（「行政法メモ」「民訴法メモ」の2件の
  ExternalKnowledge）を投入した上で全て実行した。
  - 「前に保存した行政法の記事は？」→ Intent: Retrieval、1件
    ヒット、【Sources】に出典が表示されることを確認
  - 「今日は何を勉強する？」→ Intent: Decision、行政法・民訴法の
    2候補と比較・Ownerが判断すべき点が表示されることを確認
  - 「こんにちは」→ Intent: None、3セクションいずれも「該当なし」
    ＋Warningsに「問い合わせ不要」の注記が出ることを確認
  - 「この参考書買う？」→ Intent: Decision（Yes/Noフォールバック、
    Version12のADR 0022と同じ挙動）、根拠なしのmissingInfoが
    正しく出ることを確認
  - 対話式（`pnpm conversation`、引数なし）を擬似expectドライバで
    駆動し、「質問:」プロンプトへの応答から3セクション表示までを
    確認
  - `pnpm run api`を起動し、Node `fetch`経由で4つの質問全てを
    `POST /conversation/context`で実行、Intentの分類結果と
    日本語データの往復を確認
  - 検証に使ったデータは全て確認後に`data/external-*.json`から
    削除済み

## 7. 修正したバグ（検出方法、原因、対応方法、再発防止）

実装中のテスト作成の過程で、Version10・11・12とは異なる種類の
実質的なロジックバグを1件発見・修正した。

### バグ: ConversationGatewayのRetrieval経路が質問文では実質ヒットしない

- **検出方法**：`ConversationGateway.test.ts`の「Retrieval判定に
  応じてRetrieveKnowledgeUseCaseへルーティングされる」テストで、
  実際にExternalKnowledgeを登録した状態にもかかわらず
  `retrievedKnowledge`が空配列で返ってきた。
- **原因**：`RetrieveKnowledgeUseCase`（Version11、ADR 0020）の
  スコアリングは「Knowledge側のフィールド（title/tags/topics/
  content）が`query`を部分文字列として含むか」を判定する
  （`field.includes(query)`）。Version11の想定利用は
  `pnpm external -- retrieve 処分性`のような短いキーワードを
  `query`に渡す形であり、その場合は短いqueryが長いcontent等に
  含まれる、という自然な包含関係が成り立つ。しかしVersion13の
  ConversationGatewayは、Owner/ARCの質問文全体
  （「前に保存した行政法の記事は？」のような文）をそのまま
  `query`として渡していた。質問文はKnowledgeの短いtitle/tags等
  よりも長いことが多く、「短いフィールドが長い質問文全体を部分
  文字列として含む」ことはほぼ起こらないため、実質的に何も
  ヒットしなかった。
- **対応方法**：ConversationGatewayの`handleRetrieval()`で、
  質問文に呼び出し前に既存ExternalKnowledgeの全topicを取得し、
  質問文にtopic文字列が部分文字列として含まれるか（逆方向の一致、
  CandidateBuilderのADR 0022と同じパターン）を確認した上で、
  一致したtopicを`RetrieveKnowledgeUseCase`の`topics`パラメータ
  （厳密なタグ/トピック重なりでスコアを加点する既存の仕組み、
  ADR 0020）として追加で渡すよう修正した。`query`（質問文全体）は
  そのまま渡し続けるため、たまたま質問文が短くフィールドに含まれる
  ケースでも動作する。
- **再発防止**：`ConversationGateway.test.ts`にRetrieval経路の
  正常系テストを追加し、実データでの一致を担保した。今後
  「自然文の質問をRetrieveKnowledgeUseCaseに渡す」新しい呼び出し
  経路を追加する際は、`query`の一致方向（フィールドがqueryを含む
  か、queryがフィールドを含むか）を必ず確認することをコード
  コメントに明記した。

## 8. 技術的負債（今後改善したい点）

- **IntentDetectorの機械的パターン一致には限界がある**
  （ADR 0029、CandidateBuilderと同じ種類の制約）。DECISION_MARKERS
  ・RETRIEVAL_MARKERSに含まれない語彙で書かれた質問は、文末の
  疑問符の有無でDecision/Noneのいずれかに振り分けられるのみで、
  意味的なニュアンスは捉えられない。
- **`conversation`（会話文脈）引数が未使用**：APIは受け取るが
  Intent判定には使わない（ADR 0029）。将来この文脈を活用する
  ニーズが出た場合、パターンマッチングの範囲でどこまで対応できる
  か検討が必要。
- **Retrieval経路のtopic逆方向一致も、CandidateBuilder同様の限界を
  持つ**：質問文にtopicとして登録された語句が含まれない場合、
  `query`の直接一致に頼ることになり、ヒット率が下がる可能性が
  ある。

## 9. 次Versionへの申し送り（技術的観点から推奨する事項）

- Version14「Continuous Management」（指示書が予告する次の構想）
  では、Reflection・External Brain・Decision Support・学習状況・
  習慣データを横断した継続的フィードバックが求められる。
  `ConversationGatewayUseCase`のTool Selectionパターン（Intentに
  応じて既存UseCaseを呼び分けるだけ）は、新しい横断UseCase
  （例：`ContinuousFeedbackUseCase`）を追加する際の設計の参考に
  なる。
- IntentDetectorの語彙拡張が必要になった場合、DECISION_MARKERSは
  CandidateBuilder（Version12）と語彙を揃えている、という制約
  （ADR 0029）を忘れずに両方を同時に更新すること。

## 10. POへの提案（提案・懸念点・改善案を自由に記載）

- Version13時点では、ARCが`POST /conversation/context`を自分の
  判断で呼び出すことはまだできない（認証未実装、指示書8章で
  Version13の変更対象外と明記）。「Project ARCを日常会話の中で
  自然に使えるようにする」というVersion13のキャッチコピーの
  完全な実現には、次のVersion以降で接続経路（MCP・ChatGPT
  Actions等）の議論が避けられない。指示書の想定通りVersion14が
  「継続的マネジメント」であるなら、この接続経路の議論はさらに
  後回しになる可能性があり、POとして優先順位の確認を提案したい。

## 11. CEOへのコメント（今回の成果、次Versionへの期待）

Version13は、ARC自身が「Project ARC全体で最も重要」と位置づけた
Versionであり、実際にVersion10〜12の全ての成果（保存・検索・
比較）を1つの入口に統合する、という統合的な性格を持っていた。
設計上最も注意を要したのは、Intent DetectionとRetrieveKnowledge
Useの間の「語彙・一致方向の整合性」だった——実装を分けて考えると
気づきにくいが、実際にend-to-endでテストしたことで、
RetrieveKnowledgeUseCase本来の想定利用（短いキーワード）と
ConversationGatewayの新しい利用（自然文の質問）の間にズレがある
ことを発見できた。これはVersion9・10で見つかった「バグは統合
テスト・実機確認でしか見つからない」という教訓の再確認でもある。

## 12. ARCへの引き継ぎ

### 新しい資産

- **Conversational Integration**（`pnpm conversation`、`POST
  /conversation/context`）— 1つの質問を投げるだけで、Retrieval
  すべきかDecisionすべきかをProject ARC側で判定し、対応する結果
  （ConversationContext）が返ってくる。ARCは`question`だけを
  渡せば、Retrieve/Decisionのどちらを呼ぶべきかを自分で判断する
  必要がなくなった。

### 新しいルール

- ConversationContextの`intent`は機械的パターン一致による判定
  であり、意味理解ではない。ARCが見て「この判定は違う」と感じた
  場合、`POST /decision/support`や`POST /knowledge/retrieve`を
  直接呼ぶことで、Intent判定をバイパスできる。
- Context Injectionの3セクションを超える解釈・結論
  （「【ARC】」部分）は必ずARC自身が書く必要がある。
  ConversationContextにはそれに相当する文章は一切含まれない。
- `conversation`（会話文脈）を渡しても、現在のIntent判定には
  影響しない。

### 新しい思想

Version13は、Version10〜12で個別に作られた3つの機能（External
Brain・Knowledge Retrieval・Decision Support）を「ARCが実際にどう
使うか」という利用者視点で統合した、初めてのVersionである。
これまでのVersionが「新しい能力を追加する」ことに主眼を置いていた
のに対し、Version13は「既存の能力をどう組み合わせて提供するか」
という統合の設計に主眼を置いた点で、Project ARCの開発フェーズが
一段階進んだことを示している。

### Ownerについて分かったこと

Version13の指示書もVersion11・12同様、ARCから直接チャット上で
届き、Ownerはそのまま転送する形でClaude Codeに伝えた。3回連続で
同じ受け渡し方が続いており、Owner・ARC・Claude Codeの三者の
役割分担が安定して運用されていることが見て取れる（事実ベースの
観察）。

## 13. Product Review

### ユーザー体験で改善されたこと

Before：Version12までは、「これはRetrievalが必要な質問か、
Decisionが必要な質問か」をOwner自身が判断し、それぞれ別のコマンド
（`pnpm external -- retrieve`または`pnpm decision`）を使い分ける
必要があった。

After：`pnpm conversation -- "<質問>"`一発で、Project ARC側が
自動的に適切なツールを選び、結果を返す。Ownerは「どのコマンドを
使うべきか」を考える必要がなくなった。

### 毎日使う理由

Version11・12の機能を「入口を1つにまとめる」形で束ねたことで、
日常的な質問（「前に読んだあの記事」「今日はどっちをやるべきか」）
に対して迷わず1つのコマンドで対応できるようになった。

### 懸念

「こんにちは」のような雑談がNoneと判定されるのは適切だが、
IntentDetectorの機械的な限界（8章参照）により、意図と異なる
Intentに振り分けられることがありうる。Ownerが実際に使ってみて、
誤判定が多いと感じる場合は、次のVersionで語彙表の拡充を検討する
必要がある。

### 次Versionで最も価値が高い改善

ARCが`POST /conversation/context`を自分の判断で呼び出せるように
なる接続経路（MCP等）の検討。現状はOwnerが手動で呼び出し、結果を
コピペする運用が残っており、「日常会話の中で自然に使える」という
Version13のゴールの最後の一歩がまだ埋まっていない。

## 14. 10年後のProject ARCへの貢献

Version13で10年後も効いてくるのは、「複数の既存UseCaseを、新しい
判断ロジックを追加せずに束ねる」という統合パターン（ADR 0026・
0028）を確立したことだと考える。ConversationGatewayは、
Retrieve/Decisionという中身を一切変えずに「どちらを呼ぶか」だけを
決める薄い層として設計されており、これはBridge Layer（ADR 0010、
Version9）が確立した「既存UseCaseへの委譲」というパターンの
自然な延長である。Project ARCが新しい機能を追加するたびに、
「統合する新しい入口」が必要になった場合、この設計パターンが
繰り返し再利用できる。

「人生OS」というVisionから逆算すると、Version13はPhase 2
（External Brain）の集大成であり、Phase 3（Continuous
Management）への橋渡しに位置する石である。ここで「Systemは
判断しない」という境界を、単一の質問に対してだけでなく「複数の
ツールをまたぐ統合」という新しい次元でも維持できたことは、
今後Systemがより多くの機能を束ねるようになっても、この境界線が
壊れない設計の土台になる。

機能の見た目（新しいコマンド1つ、新しいエンドポイント1つ）は
小さいが、「Version10〜12の3つの独立した機能を、判断ロジックを
一切増やさずに1つの入口へ統合できた」という事実そのものが、
これまでの設計判断（Clean Architecture、UseCase単位の責務分離、
「Systemは判断しない」という一貫した境界線）が正しく機能して
いたことの証明になっている。
