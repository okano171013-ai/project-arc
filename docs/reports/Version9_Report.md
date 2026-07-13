# Project ARC — Version9 Report

作成者：Claude Code（CTO） 　宛先：Owner / ARC（ARCレビュー用正式記録）
日付：2026年7月

---

## 1. Version9概要

テーマは「ARC Bridge」。ARCとProject ARCの最初の接続点を作ることが
ゴールで、ブリーフは明確に「完全自動は目指さない」と釘を刺している。
目指すのは「Ownerが、ARCの提案をProject ARCへ簡単に渡せる状態」。

Version7（ARC Connector）・Version8（Timeline）で整えた土台の上に、
(1) Bridge Layer（Import/Export、複数Logの一括登録・出力）、
(2) Third Person Evaluation（Version5から4回にわたり持ち越されていた
未解決課題の正式決着）を実装した。Owner指示により、本Reportから
14章「10年後のProject ARCへの貢献」が加わっている。

---

## 2. 今回実装した機能

### Bridge Layer（`pnpm bridge -- import/export`、`POST /bridge/import`、`GET /bridge/export`）

`{ type, data }`形式のJSON配列を受け取り、`type`ごとに既存の
Add系・Record系UseCaseへ`data`をそのまま委譲する`ImportLogsUseCase`
と、各Repositoryの`findAll()`をプレーンなJSONとして返す
`ExportLogsUseCase`を追加した。対象は8種別（Reflection/Memory/
InventoryItem/AppearanceLog/SkinLog/PurchaseLog/ChallengeLog/
ThirdPersonEvaluation）。Captureは対象外とした（3章、ADR 0010）。

Importは1件ずつ独立して処理し、部分成功を許容する（1件の失敗が
他の項目に波及しない）。

### Third Person Evaluation（`pnpm evaluation`、`POST /evaluation`）

他者からの評価・コメントを`date`/`person`/`evaluation`/`category`
で構造化して記録する新Entity。Appearance Log（Owner自身の月次
総合評価）とは意図的に別Entityとした（ADR 0011）。Smart Captureの
キーワード「言われた」「ガタイ」も、Version6でAppearanceLogへ
振り分けていたものをこちらへ再割当てした。

### Timelineへの統合

`ThirdPersonEvaluation`を7番目のTimelineソースとして追加した
（ADR 0009の基準に合致する「瞬間の出来事」のため）。

### シリアライズ関数の共通化

`src/infrastructure/http/serializers.ts`（HTTP専用）を
`src/application/serializers.ts`（Application層共有）へ統合し、
Memory・InventoryItem・ThirdPersonEvaluation用の関数を追加した。
CLIとHTTP APIの両方がBridge Layerの出力を通じて同じシリアライズ
結果を得られるようにした（Bridge Layerの一部と位置づけ、ADR 0010）。

---

## 3. Bridge Layerの設計判断（なぜUseCaseとして実装したか）

ブリーフの「同じUseCaseをCLI/REST API/MCP/SDKから利用できるように
する」という要求を素直に読み、Bridge Layer自体を新しい抽象化層
（独自プロトコル等）としてではなく、**Application層に置かれた2つの
UseCase**として実装した。CLIもHTTP APIも、今まで通り薄いアダプタ
としてこのUseCaseを呼ぶだけでよい。これは以下の理由による。

- 既存のCLI/HTTP APIは、いずれも「薄いアダプタ→UseCase」という
  Clean Architectureの型を一貫して守ってきた（Version1から）。
  Bridge Layerだけ違う型にする理由がない。
- 将来MCPサーバーやSDKを追加する場合も、同じUseCaseを呼ぶアダプタを
  追加するだけで済む（ARCフィードバック質問①への回答そのもの、
  12章参照）。

Import側では、`RecordCaptureUseCase`（Version6）が`fields`
（部分的な情報）を各UseCaseの`record`型へマッピングする変換ロジック
を持っていたのに対し、`ImportLogsUseCase`の`data`は各UseCaseの
入力型とそのまま一致する契約にした。理由：Smart Captureの`fields`は
機械的な下書き提案から作られる不完全な情報だが、Bridge Layerの
`data`はOwner/ARCが確定させた完全な情報である前提のため、変換
ロジックを持たせる必要がない。これにより「Import JSONのスキーマ＝
各UseCaseの入力契約」という自己文書化された設計になった。

---

## 4. Architecture Review

### 追加したEntity

| Entity | 追加理由 |
|---|---|
| `ThirdPersonEvaluation` | 他者からの評価を構造化するための新Entity（ADR 0011） |

### 追加したUseCase

| UseCase | 内容 |
|---|---|
| `ImportLogsUseCase` | `{type, data}`配列を既存UseCaseへ委譲する薄いディスパッチャ |
| `ExportLogsUseCase` | 各Repositoryの`findAll()`をプレーンJSONとして返す |
| `AddThirdPersonEvaluation`/`ListThirdPersonEvaluations` | 他者評価の追加・一覧 |

### 変更したUseCase

| UseCase | 変更内容 |
|---|---|
| `RecordCaptureUseCase` | `ThirdPersonEvaluation`への書き込み分岐を追加、コンストラクタに`ThirdPersonEvaluationRepository`を追加 |
| `GetTimelineUseCase` | `ThirdPersonEvaluation`を7番目のソースとして追加 |

### 追加したPort/Adapter

| ファイル | 内容 |
|---|---|
| `ThirdPersonEvaluationRepository`（ポート）+ `JsonFileThirdPersonEvaluationRepository` | |

### 追加したInfrastructure

| ファイル | 内容 |
|---|---|
| `src/infrastructure/cli/evaluation.ts` | `pnpm evaluation -- add/list` |
| `src/infrastructure/cli/bridge.ts` | `pnpm bridge -- import/export` |
| `POST /evaluation` `/bridge/import`、`GET /bridge/export`（server.ts） | |

### 移動したファイル

| 変更前 | 変更後 | 理由 |
|---|---|---|
| `src/infrastructure/http/serializers.ts` | `src/application/serializers.ts` | CLIとHTTP APIがBridge Layer経由で同じシリアライズ結果を共有する必要が生じたため（3章） |

---

## 5. ADR

### 追加したADR

- **ADR 0010: Bridge Layer（Import/Export）**
  （`docs/adr/0010-bridge-layer.md`）
  3章の設計判断を正式に記録。ARCフィードバックへの回答（12章）の
  技術的根拠にもなっている。
- **ADR 0011: Third Person Evaluationを独立したEntityにする**
  （`docs/adr/0011-third-person-evaluation.md`）
  Appearance Logとの境界、`person`を必須にした理由（Principle 5）、
  Smart Captureのキーワード再割当てを記録。

### ADRを追加しなかった判断とその理由

- **`docs/reports/TEMPLATE.md`への14章追加**：Owner指示による
  ドキュメント運用の変更であり、アーキテクチャ上の決定ではないため
  ADRではなく本Report・TEMPLATE.md自体に記録した。

---

## 6. テスト

| 項目 | 結果 |
|---|---|
| テストファイル数 | 20ファイル（新規2） |
| テストケース数 | 107件（Version8の90件 + 新規17件） |
| typecheck | エラーゼロ |
| lint | エラーゼロ |
| 実機確認 | 完了（後述） |

**内訳（新規追加分）**：
- `ThirdPersonEvaluation.test.ts`（4件）：追加・バリデーション
  （person/evaluation必須）・日付降順一覧
- `Bridge.test.ts`（6件）：複数type一括登録、部分成功（1件失敗が
  他に影響しない）、Memoryのインポート、type指定エクスポート、
  全種別エクスポート、エクスポート結果に`_id`等の内部フィールド名が
  漏れないことの確認
- `Capture.test.ts`に2件追加：ThirdPersonEvaluationへの書き込み、
  personが欠けている場合に捏造せずエラーになることの確認
- `GetTimeline.test.ts`に1件追加：ThirdPersonEvaluationがTimelineに
  含まれることの確認
- `RuleBasedCaptureClassifier.test.ts`に1件追加：「言われた」
  「ガタイ」がThirdPersonEvaluationを提案し、personを含まないことの
  確認
- `server.test.ts`に3件追加：`POST /evaluation`、`POST
  /bridge/import`の部分成功、`GET /bridge/export?type=`

**実機確認**：`pnpm run api`を実際に起動し、Node `fetch`経由で
`/evaluation`・`/capture`（ThirdPersonEvaluation destinations）・
`/bridge/import`・`/bridge/export`・`/timeline`を日本語データで
確認した。`pnpm bridge -- export`（`--type=`含む）と`pnpm bridge --
import <file>`もCLIから直接確認し、`pnpm evaluation -- add/list`は
擬似expectドライバ（Version6で確立した手法）で駆動して確認した。

実機確認の過程で、`bridge.ts`の`runImport()`にargv解析バグ
（サブコマンド名"import"自体をファイルパスと誤認識する）を発見し、
その場で修正した（7章参照）。

---

## 7. 修正したバグ

| # | 検出方法 | 原因 | 対応 | 再発防止 |
|---|---|---|---|---|
| 1 | 実機確認（`pnpm bridge -- import <file>`の実行） | `argv.slice(3)`という固定インデックスで、pnpm経由の実行時の`argv`配列レイアウト（`[node, script, "--", "import", "<path>"]`）を仮定していたが、`.find(a => !a.startsWith('--'))`が"import"という文字列自体を「フラグでない最初の引数」として拾ってしまい、実際のファイルパスではなくサブコマンド名を読み込もうとしていた | `argv.slice(2)`から`"--"`を除去したうえで`args.slice(1)`（サブコマンド自体を除く）から検索するよう修正 | 固定インデックスでargvを解析するのではなく、常に`"--"`除去＋サブコマンド除去という共通パターンで解析する（既存の`main()`の解析ロジックと揃える） |

このバグはコードレビューでは発見できず、実際に`pnpm bridge --
import`をファイル指定で実行して初めて顕在化した。対話式CLIの
readline問題（Version6）と同様、「実際に動かしてみないと分からない
argv周りの不具合」がこのプロジェクトで繰り返し発生している。

---

## 8. 技術的負債

- **Bridge LayerのImport JSONスキーマは各UseCaseの入力契約に強く
  依存する**：各UseCaseの`execute()`のパラメータ名・構造が変わると、
  Import側のスキーマも暗黙に変わる。契約が変わったことをOwner/ARCへ
  明示的に伝える仕組み（バージョニング等）はまだない。
- **Export結果のサイズ制限がない**：全件を一度にメモリへ読み込んで
  返すため、データ量が増えた場合のパフォーマンスは未検証。
- **`/evaluation`エンドポイントの一覧取得（`GET`）がない**：CLIには
  `list`があるが、HTTP APIには`POST`のみ追加した（他のLogと同様の
  制約、Version7から持ち越し）。
- **Bridge Layerの`type`文字列に対する事前バリデーションが薄い**：
  不正な`type`はswitch文の`default`節でエラーになるが、HTTPレイヤー
  側でより丁寧な400エラーメッセージを返す余地がある（Version7の
  技術的負債と同じ指摘）。

---

## 9. Version10への申し送り

- **ARCフィードバック③への回答（12章）で述べた通り、Health
  Integrationに向けた技術的準備はBridgeLogTypeへの追加という形で
  対応可能**。ただし、Apple Health等は件数が多く、Import/Exportの
  性能・データ量制限を事前に検討する必要がある。
- **ARCとの実接続**：Version7〜9を通じて「土台」は整った
  （ARC Connector、Timeline、Bridge Layer）。次に価値が高いのは、
  完全自動でなくとも「Ownerが手動でARCの回答をBridge Layer経由で
  渡すだけで記録できる」という運用を実際に試してみること（Version7・
  Version8のReportと同じ結論だが、Version9でImportという具体的な
  手段が揃った）。
- **アーキテクチャ図の継続更新**：Version9で`docs/architecture-
  diagram.md`を更新したが、Version10以降も新しい接続点・Log境界が
  増えるたびに更新すること。

---

## 10. POへの提案

### UX改善案

- `pnpm bridge -- import`のエラーメッセージ（例：「Cannot read
  properties of undefined (reading 'trim')」）はDomain層の生の
  エラーがそのまま出るため、技術的すぎる可能性がある。実際に
  Ownerが使ってみて分かりにくければ、Bridge Layer側でより丁寧な
  メッセージへ変換する改善余地がある（現時点ではYAGNIの観点から
  未実装）。

### 設計改善案

- 特になし。Bridge LayerはVersion6〜8で確立したパターンの組み合わせ
  であり、新しい設計判断はADR 0010・0011に記載した範囲に収まって
  いる。

---

## 11. CEOへのコメント

Version9は、「機能を作る」というより「これまで作ってきたものを
つなぎ直す」Versionでした。Bridge Layer自体に新しいビジネス
ロジックは一切なく、既存のUseCaseへの委譲のみで実装できたことは、
Version1から積み重ねてきたClean Architectureの層構造が正しく
機能している証拠だと感じています。

もう一つの成果は、Version5から4回のVersionにわたって「未解決」の
まま持ち越されていたThird Person Evaluationを、ようやく正式に
設計・実装できたことです。ARCフィードバックで繰り返し「今回も
未解決です」と書き続けることに、正直居心地の悪さがありました。
今回ブリーフで明示的に要求されたことで、ADR 0005・0006と同じ
判断の型（無理に統合せず、性質の違いで分離する）を適用して
決着させることができました。

実機確認では、`bridge.ts`のargv解析バグを発見しました（7章）。
これは「実際にファイルパスを渡して動かしてみて初めて分かる」種類の
不具合で、Version6で発見したreadlineの問題と同様、コードレビューや
型チェックだけでは見つけられないものでした。実機確認を省略しない
ことの価値を、このプロジェクトは繰り返し実証していると思います。

---

## 12. ARCへの引き継ぎ

### 新しい資産

- **Bridge Layer**（`pnpm bridge -- import/export`、`POST
  /bridge/import`、`GET /bridge/export`）：ARCとの会話で決まった
  複数の記録内容を、Ownerがまとめて一度にProject ARCへ登録できる
  ようになった。「今日は肌のケアもして、メラノCC買って、赤福も
  初めて食べた」のような複数の出来事を、ARCが`{type, data}`の配列
  として整理し、Ownerがそれをファイルに保存して`pnpm bridge --
  import`するだけで、3件まとめて記録できる。
- **Third Person Evaluation**：「いとこにガタイ良くなったと
  言われた」のような他者からの評価を、Owner自身の評価
  （Appearance Log）とは区別して記録できるようになった。

### 新しいルール

- **Bridge LayerもSystemは判断しない**：`pnpm bridge -- import`が
  受け取る`type`は、呼び出し側（Owner/ARC）が確定済みの値である
  ことが前提。ARCが「このデータはたぶんSkinLogだろう」と曖昧な
  まま渡すのではなく、会話の中で確定させてから`type`を指定する
  よう案内してほしい。
- **Third Person EvaluationのpersonはARCが推測してはいけない**：
  「ガタイ良くなったと言われた」という文だけでは「誰が言ったか」は
  分からない。ARCは必ずOwnerに「誰から言われたんですか？」と確認
  してから記録するよう案内してほしい（Principle 5）。

### 新しい思想

Version9は、「ARCとProject ARCの接続」という抽象的なゴールを、
「新しい判断ロジックを一切追加しない、既存UseCaseへの委譲のみで
実現する」という具体的な設計判断に落とし込んだ回だった。接続を
作ることと、判断能力を追加することは別物である——この区別を
保ち続けることが、Project ARCが「勝手に判断し始めない」システムで
あり続けるための一貫した実装方針になっている（Version6〜9で4回
連続して確認された原則）。

### Ownerについて分かったこと

- Version9の指示書は、Version1〜8のブリーフと比べて技術的な詳細
  （Import Interfaceの具体的なJSON例、Third Person Evaluationの
  フィールド例）まで踏み込んでいた。これはARC・Owner側で
  Project ARCの技術構造への理解が深まっていることの表れだと思われる。
- 「10年後のProject ARCへの貢献」という新しい章の追加要求は、
  短期的な機能実装だけでなく、長期的な一貫性を重視する視点が
  Owner側で明確になっていることを示している。

---

## 13. Product Review

### ユーザー体験で改善されたこと

- **Before**：複数の出来事を記録したい場合、Ownerは`pnpm skin --
  add`、`pnpm purchase -- add`、`pnpm challenge -- add`を個別に
  対話式で実行する必要があった。
- **After**：ARCとの会話で複数の出来事が決まった場合、それを
  1つのJSONファイルにまとめて`pnpm bridge -- import`一発で記録
  できるようになった。

### 毎日使う理由

Bridge Layerは「毎日必ず使う」機能というより、「ARCとの会話が
終わった後にまとめて記録する」場面で使う機能。Third Person
Evaluationは、他者からのコメントがあった瞬間に使う、頻度は低いが
価値の高い記録機能。

### 懸念

- Bridge Layerの`import`は、ARCが生成したJSONをOwnerが手動でファイル
  に保存し、パスを指定して実行する必要がある。この「ファイルに
  保存する」という一手間が、体験としてどれだけ許容できるかは
  実際に使ってみないと分からない。

### 次Versionで最も価値が高い改善

11章・9章で述べた通り、次に最も価値が高いのは、Bridge Layerを
実際にOwnerが試してみて、「ARCの回答をコピーしてファイルに保存し、
importする」という一連の流れが実用的かどうかを確認することである。
もし手間が大きいようなら、Version10以降でこの手間を減らす工夫
（例：クリップボードからの直接読み込み等）を検討する価値がある。

---

## 14. 10年後のProject ARCへの貢献

Bridge Layerが10年後も効いてくるとしたら、それは「新しいLog種別を
追加するたびに、CLIとAPIの両方に書き込み・読み出し経路を個別実装
する」という将来の作業を、`BridgeLogType`への追加とswitch文への
1分岐追加だけに圧縮したことだと思う。Version9時点で8種別、10年後
にはおそらく20〜30種別のLogが存在しているはずだが、その全てが
同じ薄いディスパッチャパターンに従っていれば、Bridge Layer自体の
複雑さはほとんど増えない。

「人生OS」というVisionから逆算すると、Version9は「複数の異なる
データソースを、1つの一貫した方法で出し入れできる」という、
OSの中核的な性質（ファイルシステムやAPIの統一性）を最初に手に
入れた回だと位置づけられる。今はProject ARC自身のCLIとHTTP APIが
唯一の入出力経路だが、10年後にApple Health・GitHub・株価等の外部
データソースが繋がるとき（Version9のロードマップで示唆されている
Version10「Health Integration」）、今回作ったBridge Layerの
パターンがそのまま入り口になるはずである。

一方で、見直しを要するとすれば、Bridge LayerのImportスキーマが
各UseCaseの入力契約にそのまま依存している点（8章）だろう。10年間で
UseCaseのインターフェースが変わることは十分あり得るが、その変更が
Import JSONのスキーマに無警告で波及する設計は、長期的には
バージョニングの仕組みを必要とするかもしれない。今はYAGNIの観点で
先送りしているが、外部（ARC以外の主体）が本格的にこのスキーマに
依存し始めた時点で、この負債は現実の問題になる。
