# Version12 Report: Decision Support

`docs/reports/TEMPLATE.md`の14章構成に準拠。

**コミットハッシュ**：`153dfda`（`feature/v4-v6-smart-capture`ブランチ）

## 1. Version概要

**テーマ**：Decision Support — Version11で「取得」できるようになった
External Brainの知識を使い、選択肢の整理・比較材料の提示という形で
Ownerの意思決定を支援する。Version11完了報告に対するARCの応答として
チャット上のメッセージで届いた指示書に基づく（原文は`docs/handoff/
archive/Version12_ARC_Brief.md`に保管）。「知識を持つ」から
「より良い判断を支援する」へ。

**指示書の特徴**：Version11に続き、5つの構成要素（Decision Engine/
Candidate Builder/Evidence Collector/Comparison Builder/Decision
Context）と、明確な「行ってよいこと／行ってはいけないこと」の
リスト（0章・1章）が示されていた。「Project ARCは決定しない」
「ARCの文章は生成しない」という制約が過去のどのVersionよりも
明示的に強調されており、設計の中心的な論点は「比較・整理を行い
つつ、どこからが判断になるかの境界線をどう引くか」だった。

## 2. 今回実装した機能（理由も含めて説明）

### DecisionEngineUseCase

Question→Retrieve→CandidateBuilder→EvidenceCollector→
ComparisonBuilder→DecisionContextという指示書2章の流れを実装した
UseCase。External Brainに登録済みの全topicを取得した上で、各構成
要素を順に呼び出す。

### CandidateBuilder

質問文から選択肢を機械的パターン一致で導く（ADR 0022）。優先順位は
付けない。判定順：①明示的な`candidates`指定②質問文に2つ以上の
topicが部分文字列として含まれる場合はそれらを候補に③「何を」等の
開放的な選択語を含む場合は全topicを候補に④topicが1つだけ含まれる
場合はそれと「その他」⑤いずれにも該当しなければYes/No型
（["実行する","実行しない"]）。

### EvidenceCollector

各候補についてRetrieveKnowledgeUseCase（Version11）をそのまま
呼び出す薄いラッパー。Version12ではExternal Brainのみを対象と
した（指示書4章、Memory/Reflection/TimelineはVersion13以降）。

### ComparisonBuilder

根拠のcontent/ownerSummary/ownerComment/purposeから、固定キーワード
（「おすすめ」「役立つ」等はmerit、「デメリット」「難しい」等は
demerit）に部分一致する記述をそのまま抜き出す。新しい評価文は生成
しない。根拠が0件、または該当キーワードがない場合はmissingInfoに
その旨を明示する（ADR 0023）。

### DecisionContext（Value Object）

`question`/`candidates`/`comparisons`/`evidenceList`/
`missingInformation`/`pointsForOwnerToDecide`を持つ、永続化しない
一時生成物（ADR 0024）。`pointsForOwnerToDecide`はテンプレート的な
指摘（「最終的な判断はOwner自身が」＋confidence低評価の根拠がある
場合の注意喚起）のみで構成する。

### CLI（`pnpm decision`）

引数で質問を渡すか（`pnpm decision -- "質問文"`）、引数なしで対話式
に聞く。DecisionContextを選択肢・候補ごとの比較・全体の不足情報・
Ownerが判断すべき点、の順に整形して表示する。

### HTTP API（`POST /decision/support`）

body `{question, candidates?, tags?, topics?}`を受け取り、
`{decisionContext, retrievedKnowledge, sources}`を返す。

## 3. 実装しなかった機能（延期理由も記載）

- **Memory/Reflection/TimelineをEvidenceの対象にすること**：指示書
  4章で「Version12ではExternal Brainのみでもよい」と明示されていた
  ため、Version13以降に持ち越した。
- **AI API呼び出し・自動要約・自動タグ付け**：指示書16章で明示的に
  対象外。
- **Bridge Import/ExportへのDecisionContext統合**：指示書10章
  「してよい（may）」という許容表現であり必須ではなく、
  DecisionContextがRepositoryを持たない一時生成物であるため
  （ADR 0024）、Bridgeの「保存済みデータの取り出し」という一貫した
  意味と噛み合わないと判断し見送った（ADR 0025）。
- **Timelineへの追加**：指示書11章で明示的に対象外
  （「DecisionContextはログではない」）。
- **`relatedKnowledgeIds`等を使った候補間の高度な関連分析**：
  ComparisonBuilderは各候補を独立に処理するのみで、候補同士の
  関係性分析は行わない（指示書の範囲を超えるため）。

## 4. Architecture Review

### 新規Value Object（Domain層）

- `src/domain/value-objects/DecisionContext.ts`
  （`DecisionContext`/`DecisionCandidateComparison`/
  `DecisionEvidence`）

### 新規UseCase（Application層、`decision-support/`フォルダ新設）

- `src/application/use-cases/decision-support/BuildCandidates.ts`
  （CandidateBuilder）
- `src/application/use-cases/decision-support/CollectEvidence.ts`
  （EvidenceCollector）
- `src/application/use-cases/decision-support/BuildComparison.ts`
  （ComparisonBuilder）
- `src/application/use-cases/decision-support/DecisionEngine.ts`
  （DecisionEngineUseCase、上記3つを orchestrate）
- 対応するテストファイル3件

新規Entity・新規Port・新規Repositoryはなし——既存の
`ExternalKnowledgeRepository`/`ExternalSourceRepository`と
`RetrieveKnowledgeUseCase`（Version11）をそのまま利用した。

### 新規Infrastructure

- `src/infrastructure/cli/decision.ts`（新規CLI、`pnpm decision`）

### 変更したファイル

- `src/application/serializers.ts`：`serializeDecisionContext`追加
- `src/infrastructure/http/server.ts`：`decisionSupport`UseCaseの
  配線、`POST /decision/support`ルート追加
- `src/infrastructure/http/server.test.ts`：HTTPエンドポイントテスト
  追加
- `package.json`：`decision`スクリプト追加

## 5. ADR（追加・変更したADR、追加しなかった理由）

指示書13章が明示的に求めた2件に加え、実装上の重要な判断2件を
合わせ、ADR 0022〜0025の4件を新規作成した。

- **ADR 0022**: CandidateBuilderの機械的パターンマッチング設計
  （指示書が明示要求していないが、AI不使用で候補生成を行う具体的
  ロジックはこのVersionで最も判断が分かれる部分であり、ADR化した）
- **ADR 0023**: Decision Supportが「Systemは判断しない」と矛盾しない
  理由（指示書13章の必須要求）
- **ADR 0024**: DecisionContextをEntityではなくValue Objectにした
  理由（指示書13章の必須要求）
- **ADR 0025**: DecisionContextをBridge Import/Exportに統合しない
  理由（指示書10章の「してよい」という許容表現をどう解釈したかの
  記録）

## 6. テスト（件数、カバレッジ、typecheck、lint、実機確認）

- `pnpm test`：**168件**全て緑（Version11完了時点153件から15件増加。
  CandidateBuilder 5件、ComparisonBuilder 4件、DecisionEngine 5件、
  HTTP server 1件）
- `pnpm typecheck`：エラーゼロ
- `pnpm lint`：エラーゼロ
- **実機確認**：指示書15章が挙げた5つの質問例を、Bridge Import
  経由で実データ（「行政法の処分性はおすすめの論点」「民訴法は
  要件事実が難しい」「会社法は未整理」の3件のExternalKnowledge）を
  投入した上で全て実行した。
  - 「今日は何を勉強する？」→ 候補「行政法・民訴法・会社法」
    （優先順位なし）、行政法にmerit、民訴法にdemerit、会社法に
    missingInfoが正しく分類されることを確認（指示書3章の例と完全
    一致）
  - 「今日は早く寝るべき？」→ 候補「実行する・実行しない」
    （Yes/Noフォールバック）
  - 「この参考書を買うべき？」→ 同上（「参考書」というtopicが
    登録データに存在しないため）
  - 「行政法と民訴法どちらを優先？」→ 候補「行政法・民訴法」
    （topic一致による2択抽出）
  - 「筋トレを休む？」→ 候補「実行する・実行しない」
  - 対話式（`pnpm decision`、引数なし）を擬似expectドライバで駆動
    し、「質問:」プロンプトへの応答から結果表示までを確認
  - `pnpm run api`を起動し、Node `fetch`経由で`POST
    /decision/support`を実行、日本語データの往復とDecisionContext
    構造を確認
  - 検証に使ったデータは全て確認後に`data/external-*.json`から
    削除済み

## 7. 修正したバグ（検出方法、原因、対応方法、再発防止）

今回、実装・実機確認の過程で新規のバグは発見されなかった。
`positionalArgs()`に相当する引数解析（`decision.ts`）は、
サブコマンドを持たないシンプルな構造（`pnpm decision -- "質問"`）
のため、Version10・11で見つかったargv解析バグと同じ原因パターンが
そもそも発生しない設計にした（サブコマンドをスキップする処理が
不要なため）。

## 8. 技術的負債（今後改善したい点）

- **CandidateBuilderの機械的パターン一致には限界がある**
  （ADR 0022）。質問文にtopicとして登録されていない語句が含まれる
  場合、意図と異なりYes/Noにフォールバックすることがある
  （「この参考書を買うべき？」の例）。Owner/ARCが明示的に
  `candidates`を渡すことで回避できるが、この使い分けがCLIの
  ヘルプ等でまだ十分に案内されていない。
- **ComparisonBuilderのキーワード表は初期値**（merit/demerit
  それぞれ8〜9語）。実際にOwnerの記録文体に合わせて調整が必要に
  なる可能性がある。
- **DecisionContextとBridgeの統合は見送った**（ADR 0025）。将来
  具体的なニーズが出れば再検討する。
- **`POST /decision/support`は認証なし**（ARC Connector全体の制約、
  ADR 0008から継続）。

## 9. 次Versionへの申し送り（技術的観点から推奨する事項）

- Version13で「ARCがExternal BrainやDecision Supportを直接利用」
  する場合、`DecisionEngineUseCase`は既にCLI/HTTPの両方から
  同一ロジックで呼び出せる形になっているため、MCP等の新しい
  Infrastructureアダプタを追加するだけで対応できる設計にしてある。
- EvidenceCollectorの対象をMemory/Reflection/Timelineに広げる場合
  （指示書4章で予告されている拡張）、`EvidenceCollector`クラスの
  `collect()`メソッドのシグネチャは変えず、内部で複数のRetrieve系
  UseCaseを呼び分ける形に拡張することを推奨する。

## 10. POへの提案（提案・懸念点・改善案を自由に記載）

- Decision Supportは「比較材料を整理するだけ」という設計上、
  ExternalKnowledgeの記録が少ない・merit/demeritに分類できる記述が
  ない場合、DecisionContextの中身が薄くなる（missingInfoばかりに
  なる）。この機能の価値は、Owner自身がExternal Brainへの記録を
  日常的に続けているかどうかに強く依存する。次のVersionでは
  「External Brainへの記録を促す」導線（例：Reflection時に
  「今日読んだものはExternal Brainに記録しましたか？」と一言
  添える等）を検討する価値があるかもしれない。

## 11. CEOへのコメント（今回の成果、次Versionへの期待）

Version12は、Version10・11で確立した「Systemは判断しない」という
制約を、最も表現の強い形（Decision Support）で試すVersionだった。
指示書自身が「行ってよいこと／行ってはいけないこと」を明示して
いたことは、設計判断のスピードを大きく上げた——境界線があらかじめ
言語化されていたため、実装の各所（CandidateBuilderの優先順位
なし、ComparisonBuilderのキーワード抽出のみ、pointsForOwnerToDecide
のテンプレート文のみ）で、その境界線を機械的に守る設計に落とし
込むだけで済んだ。Version10〜12を通じて、「Systemは判断しない」
という原則がConstitution上の理念に留まらず、実装レベルの具体的な
制約として一貫して機能し続けていることが確認できた。

## 12. ARCへの引き継ぎ

### 新しい資産

- **Decision Support**（`pnpm decision`、`POST /decision/support`）
  — 質問を渡すと、候補・比較・根拠・不足情報を整理した
  DecisionContextが得られる。ARCはこれを受け取って、比較・解釈・
  優先順位の提案（指示書7章の「【ARC】」部分）を会話の中で書く
  想定。

### 新しいルール

- DecisionContextの`candidates`に優先順位はない。配列の順序を
  「Systemのおすすめ順」と解釈しないでください。
- `merits`/`demerits`はOwner自身が過去に書いた記述から機械的に
  抜き出したものであり、Systemが新たに評価を下したものではない。
  該当する記述がなければ空配列になる（存在しない評価を捏造して
  埋めることはしない）。
- `pointsForOwnerToDecide`は固定文＋機械的な条件判定のみで構成
  される。ARCはこれをそのまま読み上げるのではなく、実際の会話文脈
  に応じて自分の言葉で伝えてください。

### 新しい思想

Version12は、External Brain（Version10）・Knowledge Retrieval
（Version11）という「情報を持つ」土台の上に、初めて「情報を
どう使って判断を助けるか」という新しい種類の機能を積んだVersion
である。ここで「Systemは決定しない」という境界を最も具体的な形
（メリット/デメリットの生成方法、候補の優先順位、Ownerへの
指摘文）まで踏み込んで実装したことは、Version13で構想される
「ARCが直接利用する」段階に進んでも揺るがない土台になる。

### Ownerについて分かったこと

Version12の指示書もVersion11同様、ARCから直接チャット上で届き、
Ownerはそのまま転送する形でClaude Codeに伝えた。この受け渡し方が
Version11に続き定着している（事実ベースの観察）。

## 13. Product Review

### ユーザー体験で改善されたこと

Before：Version11でARCへ知識を渡せるようになったが、「今日何を
勉強すべきか」のような選択が必要な場面では、Ownerが自分で
複数のRetrieveを実行し、結果を頭の中で比較する必要があった。

After：`pnpm decision -- "今日は何を勉強するべき？"`一発で、
候補・各候補の根拠・メリット/デメリット・不足情報がまとまって
提示される。

### 毎日使う理由

Reflection・Morning Briefのような毎日の記録機能とは独立している
が、「何を勉強するか」「何を買うか」のような日々の小さな意思決定
の場面で、External Brainに蓄積した記録を無駄にせず活用できる
実用的な入口になった。

### 懸念

10章で述べた通り、External Brainの記録が少ないとDecisionContext
の中身が薄くなる。Version12単体では「使ってみたら空っぽだった」
という体験になりうる——これはVersion10・11の記録習慣と連動する
機能である、という位置づけをOwnerに明確に伝える必要がある。

### 次Versionで最も価値が高い改善

CandidateBuilderが拾えない質問（登録されていないtopicを含む質問）
に対して、Ownerが`candidates`を明示しやすいCLI/UXの改善
（例：`pnpm decision -- "質問" --candidates=A,B`のような直接指定
オプション）。

## 14. 10年後のProject ARCへの貢献

Version12で10年後も効いてくるのは、「比較・整理のロジックを、
新しい評価文の生成ではなく既存データからの機械的抽出として設計
した」という判断（ADR 0023）だと考える。これにより、Decision
Supportは将来AIモデルを組み込む段階（指示書が想定するVersion13
以降）になっても、「Systemが機械的に整理した材料」と「AIが解釈
した結論」を明確に分離した状態を保てる——将来AIの判断が誤って
いた場合にも、どこまでが検証可能な事実整理で、どこからがAIの
解釈だったかを常に切り分けられる。

「人生OS」というVisionから逆算すると、Version12はPhase 2
（External Brain）の中で「利用」から「意思決定支援」への転換点に
位置する石である。ここでDecisionContextを徹底して「材料」に
留めたことは、将来Systemがより大きな役割を持つようになった場合
でも、「どこまでがSystemの責務で、どこからが人間・AIの判断か」を
判断する際の参照点であり続ける。

機能の複雑さよりも、「新しいユースケースが増えるたびに同じ境界線
（Systemは判断しない）を再確認し、その都度具体的な設計判断として
記録する」という開発プロセス自体（ADR 0012→0021→0023という
連続性）が、Project ARCの一貫性を支える最も重要な資産になっている。
