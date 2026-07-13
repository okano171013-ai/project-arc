# ADR 0011: Third Person Evaluationを独立したEntityにする

## ステータス

承認済み

## 関連Principle

- Principle 9（段階的拡張／YAGNI）
- Principle 10（責務は交換可能ではなく分担する）

## コンテキスト

「いとこにガタイ良くなったと言われた」という他者からの評価・
コメントの扱いは、Version5のARCブリーフで初めて例示されて以来、
Version6〜8で「Appearance Logの`comment`欄に自由記述として書く」
という暫定運用のまま未解決だった（各VersionのARC Feedbackで
繰り返し積み残しとして記録）。ARCのVersion9ブリーフで正式な設計
（Appearanceとは分離、Entity化も検討、最低限date/person/evaluation/
categoryで構造化）が改めて要求された。

## 決定

`ThirdPersonEvaluation`を独立したEntityとして新設する
（`SkinLog`/`PurchaseLog`/`ChallengeLog`と同じ、Entity→Port→
UseCase→JsonFileRepository→CLIの型を踏襲）。

### Appearance Logとの境界

- **Appearance Log**：Owner自身による月次の総合的な自己評価
  （総合評価1〜5、肌・髪・髭・服装・体型の自由記述コメント）。
  評価の主体は常にOwner自身。
- **Third Person Evaluation**：他者（`person`）からの評価・コメント。
  評価の主体はOwner以外の第三者。

この境界は「誰が評価したか」という主体の違いであり、ADR 0005
（Reflection/Memory）やADR 0006（Skin Log/Purchase Log）の
「記録の粒度・性質の違い」とは異なる新しい判断軸である。しかし
判断の型（「無理に統合せず、別Entityとして分離する」）は一貫して
踏襲した。

### フィールド設計

`date`（YYYY-MM-DD、必須）、`person`（誰から、必須）、`evaluation`
（何を言われたか、必須）、`category`（体格/肌/服装/雰囲気等、任意）
の4フィールドとした。ARCブリーフの例示（date/person/evaluation/
category）をそのまま採用した。

`person`を必須とした理由：Smart Captureのキーワード提案（「言われた」
「ガタイ」）はテキスト全体を`evaluation`に入れることはできても、
「誰が言ったか」をテキストから断定することはできない（Principle 5:
推測は推測として扱う）。そのため`RuleBasedCaptureClassifier`の
提案には`person`を含めず、`pnpm capture -- add`実行時に必ずOwnerへ
確認する設計とした（`RecordCaptureUseCase`の`requireString`で強制）。

### Smart Captureのキーワード再割当て

Version6で「言われた」「ガタイ」はAppearanceLogの`comment`へ振り分け
られていたが、Version9でこの2キーワードをThirdPersonEvaluationへ
移した。AppearanceLogに残したキーワード（「髪」「髭」「服」
「体型」）は、Owner自身の外見に関する言及として区別できるため
残している。

### Timelineへの追加

`ThirdPersonEvaluation`は「ある瞬間の出来事」（他者からそう言われた
瞬間）であるため、ADR 0009の基準に従いTimelineの対象に含めた
（Reflection/AppearanceLog/SkinLog/PurchaseLog/ChallengeLog/Capture
に次ぐ7番目のソース）。

## 根拠

- Version5〜8で3回にわたり積み残されていた設計課題を、ARCブリーフの
  明示的な要求を機に正式決着させた。先延ばしにし続けることは
  Principle 9（段階的拡張）の趣旨に反する——「具体的な必要性が
  明確になった時点で対応する」の「明確になった時点」が今回だった。
- `person`を必須にしテキストからの断定を避けた判断は、Principle 5
  とADR 0007の「Systemは判断しない」原則の具体的な適用例である。

## 影響

- `CaptureLogType`に`ThirdPersonEvaluation`が追加され、
  `RecordCaptureUseCase`のコンストラクタに新しい依存
  （`ThirdPersonEvaluationRepository`）が増えた。既存の呼び出し箇所
  （CLI・HTTP API・テスト）は全てこの新しい引数を渡すよう更新済み。
- `BridgeLogType`（ADR 0010）にも含まれ、Import/Exportの対象となる。
