# Version11 Report: Knowledge Retrieval

`docs/reports/TEMPLATE.md`の14章構成に準拠。

**コミットハッシュ**：`c49ae64`（`feature/v4-v6-smart-capture`ブランチ）

## 1. Version概要

**テーマ**：Knowledge Retrieval — Version10で「蓄積」したExternal
Brainの知識を、ARCが会話の中で実際に「取り出せる」ようにする。
Version10完了報告（`docs/reports/Version10_ARC_Feedback.md`）に
対するARCの応答として、Ownerの会話メッセージ経由で届いたテーマ
提案に基づく（原文は`docs/handoff/archive/Version11_ARC_Brief.md`
に保管）。

**指示書の特徴**：これまでのVersionはPDFまたはARC_INBOX.md経由の
指示書だったが、Version11はチャット上のメッセージとして直接届いた。
「Version10=保存、Version11=利用、Version12=活用、Version13=提案」
という発展の位置づけと、①Query Layer②Retrieval API③Context
Builder④Citation⑤Rankingという5つの追加要素、実装しないものの
明示、完成状態の会話例が示されていた。CLAUDE.mdの自律実装方針に
従い、確認を挟まず設計・実装まで一気に進めた。

## 2. 今回実装した機能（理由も含めて説明）

### RetrieveKnowledgeUseCase（Query Layer / QueryEngine）

`query`/`tags`/`topics`/`limit`を受け取り、ExternalKnowledge/
ExternalSourceをスコア順に取得するUseCase。指示書①が提案した
「QueryRequest→QueryEngine→Repository」という構造をExternal
Brainの範囲で実装した。Memory/Timeline/`pnpm find`との統合は
見送った（ADR 0019、3章参照）。

### Ranking（スコアリング）

タイトル一致・タグ一致・Topic一致・content等の全文一致・
リクエストで指定されたtags/topicsとの重なりを、それぞれ異なる
重みで加点する機械的スコアリング（ADR 0020）。Embedding・ベクトル
検索・AIによる関連度判定は行わない（指示書⑤・18章）。

### Context Builder（`buildRetrievalContext`）

取得結果を「【External Brain】\n出典タイトル\ncapturedAt\n『content』」
という引用ブロックへ整形する純粋関数。複数件は`---`区切りで連結
する。ARCの推論部分（「【ARC】この知識を踏まえると...」）は一切
生成しない（ADR 0021、7章で詳述）。

### CLI（`pnpm external -- retrieve`）

`pnpm external -- retrieve <query> [--tags=] [--topics=] [--limit=]`
で、ランキング済み結果一覧とContext Builder出力の両方を表示する。
既存の`search`（人間向け一覧・一致箇所表示）とは別コマンドとして
併存させた。

### HTTP API（`POST /knowledge/retrieve`）

body `{query?, tags?, topics?, limit?}`を受け取り、
`{results, sources, context}`を返す。`results`は
`{knowledge, source, score, matchedIn}`の配列、`sources`は
参照されたExternalSourceの重複なし一覧（Citation表示用、指示書④）、
`context`はContext Builderが組んだ引用ブロック文字列。

## 3. 実装しなかった機能（延期理由も記載）

- **Memory/Timeline/`pnpm find`とのQuery Layer統合**：指示書①は
  全面統合を提案していたが、指示書の他の節・完成の定義は一貫して
  ExternalKnowledge/ExternalSourceのみを対象にしていたため、
  Version11ではExternal Brainに限定した（ADR 0019）。Repository
  自体は変更していないため、将来必要になれば同じ構造を他の
  Repositoryにも適用できる。
- **ベクトル検索・Embedding・RAG**：指示書18章で明示的に対象外。
- **OpenAI/Claude/Gemini API呼び出し、自動要約・自動タグ・自動分類**：
  指示書18章で明示的に対象外。Context Builderも「【ARC】」部分は
  生成しない（ADR 0021）。
- **relatedKnowledgeIdsを使った関連知識の横断取得**（例：「この
  論文と講義は矛盾しているか」の直接的な比較機能）：指示書の完成
  状態の会話例に近い操作だが、Version11では単純な取得＋ランキング
  のみを実装し、複数のRetrieve結果を比較・矛盾検出する機能は
  ARC自身が取得結果を見て行う想定とした（Systemが「矛盾している」
  と判断すること自体がConstitution第2条に抵触するため、ADR 0021の
  境界と整合）。

## 4. Architecture Review

### 新規UseCase（Application層、`knowledge-retrieval/`フォルダ新設）

- `src/application/use-cases/knowledge-retrieval/RetrieveKnowledge.ts`
- `src/application/use-cases/knowledge-retrieval/BuildRetrievalContext.ts`
- `src/application/use-cases/knowledge-retrieval/RetrieveKnowledge.test.ts`

新規Entity・新規Port・新規Adapterはなし——既存の
`ExternalKnowledgeRepository`/`ExternalSourceRepository`
（Version10）をそのまま利用した（指示書①「Repositoryはそのまま」）。

### 変更したファイル

- `src/infrastructure/cli/external.ts`：`retrieve`サブコマンド追加
- `src/infrastructure/http/server.ts`：`retrieveKnowledge`UseCaseの
  配線、`POST /knowledge/retrieve`ルート追加
- `src/infrastructure/http/server.test.ts`：HTTPエンドポイントテスト
  追加

## 5. ADR（追加・変更したADR、追加しなかった理由）

- **ADR 0019**: Version11 Query Layerのスコープ（指示書①の全面統合
  提案と、実際の完成の定義・他節との整合性を検討し、External Brain
  限定に決定した理由）
- **ADR 0020**: Knowledge Retrievalのランキング方式（重み付けの
  具体的数値と、これが「Systemの判断」に該当しない理由）
- **ADR 0021**: Context Builderの責務境界（「【ARC】」部分を生成
  しない理由、Constitution第2条との関係）

Citation（指示書④）自体は独立したADRを作らなかった——ExternalSource
のtitle/url/capturedAtを表示するだけであり、Version10のADR 0013
（Source/Knowledge分離）の帰結にすぎず、新しいアーキテクチャ判断
ではないため。

## 6. テスト（件数、カバレッジ、typecheck、lint、実機確認）

- `pnpm test`：**153件**全て緑（Version10完了時点144件から9件増加。
  RetrieveKnowledge 6件、buildRetrievalContext 2件、HTTP server 1件）
- `pnpm typecheck`：エラーゼロ
- `pnpm lint`：エラーゼロ（実装中に全角スペースによる
  `no-irregular-whitespace`エラーを1件発見・修正）
- **実機確認**：
  - Bridge Import経由で実データ（行政法演習の講義出典＋「行政法の
    処分性」「会社法改正メモ」「料理レシピ」の3件のKnowledge）を
    投入し、`pnpm external -- retrieve 処分性`を実行。指示書の
    会話例と同じ出力形式（【External Brain】ブロック、出典・日付・
    原文）を確認
  - `pnpm external -- retrieve --tags=司法試験`で、タグ一致による
    絞り込みが「料理レシピ」（タグ:趣味）を正しく除外し、
    「行政法の処分性」「会社法改正メモ」の2件のみヒットすることを
    確認
  - `pnpm run api`を起動し、Node `fetch`経由で`POST
    /knowledge/retrieve`をquery指定・tags+limit指定の両方で実行、
    日本語データの往復とスコア・ランキング結果を確認
  - 検証に使ったデータは全て確認後に`data/external-*.json`から
    削除済み

## 7. 修正したバグ（検出方法、原因、対応方法、再発防止）

今回は実装時にlintで検出したスタイル上の問題が1件あったのみで、
Version9・Version10のような実データ特有のロジックバグは発見されな
かった。

- **検出方法**：`pnpm lint`実行時に`no-irregular-whitespace`エラー。
- **原因**：CLIの出力文字列に全角スペース（U+3000）をレイアウト
  目的で使っていた（`external.ts`の`runRetrieve`内）。
- **対応方法**：半角スペース2つに置き換え。
- **再発防止**：特になし（単純なスタイル問題であり、Version10までの
  ような設計判断に起因するバグではない）。

Version9・10で見つかったバグ（argv解析の固定インデックス依存、
`update()`のundefinedスプレッド問題）と同種の問題が再発していないか
は、`external.ts`の新規コード（`runRetrieve`）が既存の
`positionalArgs()`ヘルパーをそのまま再利用する形で書かれているため、
構造的に再発しないことを確認済み。

## 8. 技術的負債（今後改善したい点）

- **`search`と`retrieve`という似た機能の2コマンド併存**
  （ADR 0019で意図的な判断として記録済みだが、CLIのヘルプ表示等で
  使い分けをより明確にする余地がある）。
- **ランキングの重み（5/3/3/1/2/2）は初期値**であり、実際にARCが
  使ってみて「思ったのと違う順で出てくる」というフィードバックが
  出た場合、次のVersionで調整する必要があるかもしれない。
- **Query Layerの全面統合（Memory/Timeline/find）は未着手**
  （ADR 0019で意図的に先送り）。具体的なニーズが出るまで着手しない。
- **`POST /knowledge/retrieve`は認証なし**（既存のARC Connector全体
  の制約、ADR 0008から継続）。ARCが直接呼べるようになるには認証の
  実装が前提。

## 9. 次Versionへの申し送り（技術的観点から推奨する事項）

- Version12「Decision Support」に進む場合、`RetrieveKnowledgeUseCase`
  ＋`buildRetrievalContext`はそのまま「意思決定支援に必要な知識を
  集める」土台として再利用できる設計にしてある。
- ARCが実際に`pnpm external -- retrieve`または`POST
  /knowledge/retrieve`を使ってみて、ランキングの重み・limitの既定値
  （現在10件）が適切かのフィードバックを次の指示書で受けたい。

## 10. POへの提案（提案・懸念点・改善案を自由に記載）

- 現状`POST /knowledge/retrieve`はOwnerが手動で呼び出す前提であり、
  ARCが会話中に自動的に叩けるわけではない。「ARCが自分で判断して
  Retrieveを呼ぶ」体験を実現するには、ChatGPT Actions・MCP等の
  接続経路の検討が次に必要になる（指示書22章の「Version11以降への
  想定引き継ぎ」にも明記されている）。
- Context Builderの引用ブロック形式（【External Brain】〜）が
  ARCにとって実際に使いやすい形式かどうかは、実際にARCとの会話で
  試してみないと分からない。次のVersionまでに、Owner自身が手動で
  contextフィールドをARCとの会話にコピペしてみて、使用感を
  フィードバックしてもらうことを提案する。

## 11. CEOへのコメント（今回の成果、次Versionへの期待）

Version11は、Version10完了直後にARCから届いた提案をそのまま受けて
着手した、初めての「ARCが自らVersionテーマを定義した」ケースだった。
提案の技術的な粒度（Query Layer・Retrieval API・Context Builder・
Citation・Ranking）がこれまでのARCブリーフより実装に近い形で
示されていたこともあり、設計判断の多くは「指示書のどこまでを
文字通り実装し、どこを既存の判断基準（Principle 9・Constitution
第2条）で絞るか」という調整作業だった。特にQuery Layerの
全面統合を見送った判断（ADR 0019）は、指示書の理想と実際の完成
基準の間にあったギャップを埋めるための、このVersionで最も重要な
判断だったと考える。

## 12. ARCへの引き継ぎ

### 新しい資産

- **Knowledge Retrieval**（`pnpm external -- retrieve`、`POST
  /knowledge/retrieve`）— ARCが必要な知識だけをスコア順に取得でき、
  そのまま会話に引用できる「【External Brain】」ブロックも一緒に
  返ってくる。

### 新しいルール

- Retrievalのランキングは機械的なキーワード一致のみで、AIによる
  意味理解は行われていない（ADR 0020）。ARCが「関連性が高そうな
  はずなのに出てこない」と感じた場合、それは意味的な理解ではなく
  文字列一致でスコアリングされているためである。
- Context Builderが返す`context`フィールドには、ARC自身の推論・
  結論は一切含まれていない。「【ARC】この知識を踏まえると...」の
  部分はARC自身が会話の中で書く必要がある（ADR 0021）。

### 新しい思想

Version11は「External Brainは保存するだけでは使われない」という
ARC自身の指摘から始まった、初めてARCが技術的な実装構造まで具体的に
提案したVersionである。Project ARCの開発プロセス自体が、
Owner→ARC→Claude Codeという役割分担（`docs/ai-roles.md`）の中で、
ARCがより具体的な設計提案を行う方向に進化していることを示している。

### Ownerについて分かったこと

Version11のテーマ提案はARCから直接チャット上で届き、Ownerはそれを
そのまま転送する形でClaude Codeに伝えた。介入や修正を加えずに
ARCの提案をそのまま渡す、という受け渡し方が定着してきていると
見える（事実ベースの観察）。

## 13. Product Review

### ユーザー体験で改善されたこと

Before：Version10でExternal Brainに知識を保存できるようになったが、
ARCとの会話でその知識を活用するには、Ownerが`pnpm external --
search`または`pnpm external -- show`で手動確認し、内容をコピペして
ARCに伝える必要があった。

After：`pnpm external -- retrieve <キーワード>`一発で、関連度順に
ランキングされた知識と、そのままARCとの会話に貼り付けられる
引用ブロックが得られる。

### 毎日使う理由

Version10同様、独立機能ではあるが、「あの知識、なんだっけ」という
場面での摩擦が大きく減った。特に複数件ヒットする場合にスコア順で
上位から確認できる点は、`search`（capturedAt順のみ）より実用的。

### 懸念

Retrievalの結果をARCとの会話に実際に貼り付けて使う、という
ワークフロー自体はまだOwnerの手動コピペに依存している。この
「取得はできるが受け渡しは手動」という状態は、次のVersionで
改善が必要な体験上のギャップとして残る。

### 次Versionで最も価値が高い改善

`POST /knowledge/retrieve`をARCが直接呼び出せるようにする接続経路
（ChatGPT Actions・MCP等）の検討。これが実現すれば、Ownerの
手動コピペという最後の摩擦がなくなる。

## 14. 10年後のProject ARCへの貢献

Version11で10年後も効いてくるのは、「ランキングは機械的な処理に
留め、解釈・結論の生成はSystemの外に置く」という境界線
（ADR 0021）を、初めて「取得した情報をどう提示するか」という
レイヤーで明文化したことだと考える。Version6（Smart Capture）・
Version9（Bridge）・Version10（External Brain）は「何を記録するか」
の境界だったが、Version11は「記録した情報をどう取り出し、どこまで
Systemが加工してよいか」という新しい種類の境界を扱った最初の
Versionである。

「人生OS」というVisionから逆算すると、Version11はPhase 2
（External Brain）の中で「保存」から「利用」への転換点に位置する
石である。ここでContext Builderの責務を厳密に「引用のみ」に
留めたことは、将来Version12「Decision Support」でSystemがより
踏み込んだ支援を行うようになった際にも、「どこまでがSystemの
仕事で、どこからがARCの仕事か」を判断する際の参照点になる。

機能数よりも、「取得したデータをそのままAIに渡さず、Context
Builderという明示的な変換層を挟む」という構造判断（指示書③）を
そのまま採用したことが、将来Retrievalの対象がExternal Brain以外
（Memory等）に広がった場合にも同じパターンを再利用できる土台に
なっている。
