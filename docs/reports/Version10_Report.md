# Version10 Report: External Brain

`docs/reports/TEMPLATE.md`の14章構成に準拠。

**コミットハッシュ**：`9c4d546`（`feature/v4-v6-smart-capture`ブランチ）

## 1. Version概要

**テーマ**：External Brain — 外部情報（記事・書籍・会話・動画等から
得た知識）をProject ARCに保存し、後から再利用できるようにする。
長期ロードマップ2.0（Version9完了時にARCが提案）の「Phase 2
External Brain」の最初のVersion。

**指示書の入手経路**：これまでのVersionはARCがテキストで
`docs/handoff/ARC_INBOX.md`に指示を貼る形だったが、Version10は初めて
PDFファイル（`Project ARC Version10 実装指示書.pdf`、24節構成）として
届いた。原文は`docs/handoff/archive/Version10_ARC_Brief.md`に保管。

**指示書23章の指示**：「Claude Codeは、Ownerへの細かな確認を必要
以上に求めず、CLAUDE.mdおよびこれまでの運用方針に従って自律的に
実装を進めること」——これはOwnerが2026年7月に確立した「確認を減らし
自律的に進める」方針（`CLAUDE.md`）と一致しており、本Versionは
細部の設計判断（5つの公式論点＋実装上の追加判断）を全てClaude Code
の判断で決定し、ADR 0012〜0018として記録した。

## 2. 今回実装した機能（理由も含めて説明）

### ExternalSource（出典）とExternalKnowledge（知識）

外部情報の「出典（書誌情報）」と「そこから得た知識（内容）」を
別Entityとして分離した（ADR 0013）。1つのSourceを複数のKnowledgeが
参照できる。この分離により、「出典の書誌情報を直したいだけで
知識のレビュー状態は触りたくない」「同じ出典から得た知識のうち
1つを消しても出典情報は残したい」という操作が自然に行える。

さらに`ExternalKnowledge`は、既存の`MemoryEntry`（ADR 0005、Owner
自身の恒久的な知識）とも統合せず、別Entityとした（ADR 0018）。
記録主体（Owner自身か外部由来か）・出典の有無・更新モデル
（単純上書きかレビューサイクルか）・信頼性という概念の有無・
時間性（Timeline対象かどうか）の5点全てで性質が異なるため。

- `ExternalSource`：`sourceType`（web/book/paper/video/social/news/
  lecture/conversation/document/email/observation/other）、title、
  author、publisher、url、publishedAt、accessedAt、identifier
  （ISBN/DOI等）、notes
- `ExternalKnowledge`：sourceId（任意）、title、content（原文）、
  ownerSummary（自分なりの要約）、ownerComment（自分の考え）、
  topics/tags、purpose（保存した理由）、confidence（Owner設定の
  信頼度）、status（inbox/reviewed/archived）、capturedAt/occurredAt、
  relatedKnowledgeIds

### CLI（`pnpm external`）

`add`/`list`/`show`/`update`/`delete`/`search`/`review`/`archive`の
8サブコマンド。`add`は知識と出典を一体型のフローで入力できる
（Domain層は分離しているが、CLI UXは日常利用のしやすさを優先、
ADR 0013）。出典入力時、URL/identifierが既存と重複していれば
警告するが登録は止めない（ADR 0012）。

### HTTP API拡張

`/external-sources`・`/external-knowledge`のCRUD、
`/external-knowledge/search`を追加。既存のARC Connector
（ADR 0008）の設計方針をそのまま踏襲（ローカル専用・認証なし）。

### Bridge Layer拡張

`ImportLogsUseCase`/`ExportLogsUseCase`に`ExternalSource`/
`ExternalKnowledge`を追加（ADR 0015: 命名規則、ADR 0016: 同一
バッチ内forward reference非対応）。Export側は今回新たに`limit`/
`all`/`truncated`によるサイズ上限機能も追加した（Version9 Report
で技術的負債として指摘されていた「Exportの出力サイズが無制限」への
対応、既定上限500件）。

### Timeline拡張

`ExternalKnowledge`をTimelineの8ソース目として追加。`capturedAt`を
日付として使い、`summary`に`"[sourceType] 出典タイトル"`を表示する
が、`content`（本文）はTimelineエントリに含めない（ADR 0017）。
`ExternalSource`自体はTimeline対象外。

## 3. 実装しなかった機能（延期理由も記載）

- **外部情報の自動信頼度評価**：`confidence`はOwnerが手動設定する
  属性のまま。sourceTypeやcontentの内容から自動推定するロジックは
  実装しない（Constitution第2条・ADR 0012、Systemは判断しない）。
- **重複の自動統合**：`FindDuplicateExternalSourceUseCase`は警告の
  み。マージ・ブロック機能は実装しない（ADR 0012）。
- **Bridge Import時の同一バッチ内forward reference解決**：Source
  を新規作成しつつ同じバッチでKnowledgeがそれを参照する、という
  ユースケースは2段階のImport呼び出しで対応する運用とし、バッチ内
  でのID追跡機構は実装しない（ADR 0016、ImportLogsUseCaseの「薄い
  ディスパッチャ」という性質を守るため）。
- **`pnpm find`との検索統合**：`pnpm external -- search`は独立した
  コマンドのまま。既存の`SearchEverything`（Memory/Inventory対象）
  には統合しない（ADR 0014）。
- **Apple Health等の実データ連携**：長期ロードマップ2.0のPhase 2
  で構想されている項目だが、Version10はExternal Brainの「保存・
  検索・横断連携」の土台を作ることに専念し、実データソースの接続は
  Version11以降に持ち越す。
- **relatedKnowledgeIdsの双方向自動維持**：知識同士の関連付け配列
  自体は用意したが（指示書11章）、「AがBを関連付けたらBからも
  Aが見える」という自動的な双方向同期は実装していない。片方向で
  追加した場合、もう片方は手動で追加する必要がある（Version10の
  CLIには関連付けを編集するUIすら未実装——`relatedKnowledgeIds`は
  Bridge経由でのみ設定可能）。

## 4. Architecture Review

### 新規Entity（Domain層）

- `src/domain/entities/ExternalSource.ts`
- `src/domain/entities/ExternalKnowledge.ts`

### 新規Port（Application層）

- `src/application/ports/ExternalSourceRepository.ts`
- `src/application/ports/ExternalKnowledgeRepository.ts`

### 新規UseCase（Application層、計13ファイル）

- `external-source/`：`AddExternalSource` `ListExternalSources`
  `GetExternalSource` `UpdateExternalSource` `DeleteExternalSource`
  `FindDuplicateExternalSource`
- `external-knowledge/`：`AddExternalKnowledge` `ListExternalKnowledge`
  `GetExternalKnowledge` `UpdateExternalKnowledge`
  `DeleteExternalKnowledge` `SearchExternalKnowledge`

### 新規Adapter

- `src/adapters/repositories/JsonFileExternalSourceRepository.ts`
- `src/adapters/repositories/JsonFileExternalKnowledgeRepository.ts`

### 新規Infrastructure

- `src/infrastructure/cli/external.ts`（新規CLI、8サブコマンド）

### 変更したファイル

- `src/application/serializers.ts`：`serializeExternalSource`/
  `serializeExternalKnowledge`を追加
- `src/application/use-cases/bridge/{BridgeLogType,ImportLogs,
  ExportLogs}.ts`：ExternalSource/ExternalKnowledgeの追加、Export
  のlimit/truncated機能
- `src/domain/value-objects/TimelineEntry.ts`・
  `src/application/use-cases/timeline/GetTimeline.ts`：
  ExternalKnowledgeソースの追加
- `src/infrastructure/cli/{bridge,timeline}.ts`：新しいRepository
  依存関係の配線
- `src/infrastructure/http/server.ts`：11新規ルート
  （`/external-sources`・`/external-knowledge`のCRUD+search）

## 5. ADR（追加・変更したADR、追加しなかった理由）

指示書が明示した5つの公式論点＋実装上追加で必要になった判断を
合わせ、ADR 0012〜0018の7件を新規作成した。

- **ADR 0012**: External BrainにおけるSystemの判断範囲（confidence・
  重複検知・出典なし記録の3論点をまとめて1つのADRにした——いずれも
  「Systemは判断しない」という同一の原則から導かれる決定であり、
  別々のADRに分けるとConstitution第2条との関係が読み手に伝わり
  にくくなると判断したため）
- **ADR 0013**: ExternalSource/ExternalKnowledgeの分離
- **ADR 0014**: 検索の分離（`pnpm external -- search`）
- **ADR 0015**: Bridgeにおける命名規則（PascalCase、指示書の命名
  例と異なる判断をした理由の記録）
- **ADR 0016**: BridgeにおけるsourceId解決方針（forward reference
  非対応の理由）
- **ADR 0017**: TimelineへのExternalKnowledge組み込みと
  ExternalSource除外
- **ADR 0018**: ExternalKnowledgeをMemoryEntryから分離する理由
  （指示書ADR候補1。記録主体・出典・更新可能性・信頼性・時間性の
  5観点で比較し、統合しないと決定）

Bridgeのexport limit/truncated機能は独立したADRを作らなかった
（Version9 Reportで指摘した技術的負債への対応であり、ADR 0010の
「1件の失敗が他に影響しない」という既存方針の延長にすぎず、新しい
アーキテクチャ判断ではないため）。

## 6. テスト（件数、カバレッジ、typecheck、lint、実機確認）

- `pnpm test`：**144件**全て緑（Version9完了時点107件から37件増加。
  内訳：ExternalSource 9件、ExternalKnowledge 12件、Timeline 1件
  追加、Bridge 5件追加、HTTP server 10件追加）
- `pnpm typecheck`：エラーゼロ
- `pnpm lint`：エラーゼロ
- **実機確認**：
  - `pnpm external -- add/update/delete`（対話式）を擬似expect
    ドライバで駆動し、実際のJSONファイルへの書き込み・上書き・
    削除を確認
  - `pnpm external -- list/show/search/review/archive`（非対話式）
    を実データで直接実行し確認
  - `pnpm run api`を実際に起動し、Node `fetch`経由で
    `/external-sources`・`/external-knowledge`・
    `/external-knowledge/search`の全CRUD操作を日本語データ（会社法
    改正のニュース記事の例）で確認。`/timeline?source=ExternalKnowledge`
    ・`/bridge/export?type=ExternalKnowledge`との連携も確認
  - `pnpm bridge -- import/export`をExternalSource/ExternalKnowledge
    両方を含む実ファイルで確認
  - 検証に使ったデータは全て確認後に`data/external-*.json`から削除
    済み（検証用スクリプトも一時ディレクトリから削除済み）

## 7. 修正したバグ（検出方法、原因、対応方法、再発防止）

実機確認の過程で、いずれもテストのFakeリポジトリでは再現しない
実データ特有のバグを2件発見した。

### バグ1: `pnpm external -- show/update/delete/search/review/archive`のID取り違え

- **検出方法**：`pnpm external -- show <実ID>`を実行したところ
  「見つかりません: show」と表示され、`<実ID>`ではなくサブコマンド
  名の`"show"`自体がIDとして扱われていることが判明。
- **原因**：`argv.slice(3).find(a => !a.startsWith('--'))`という
  固定インデックス依存の解析。`pnpm run external -- show <id>`実行
  時、Node側の実際の`process.argv`は`[node, script, "--", "show",
  "<id>"]`となり、`slice(3)`は`["show", "<id>"]`を返す。`show`は
  `--`で始まらないため`find`が最初に`"show"`自体を拾ってしまう。
  Version9で発見・修正した`bridge.ts`のバグ（サブコマンド名を
  ファイルパスと誤認識）と全く同じ原因パターン。
- **対応方法**：`positionalArgs()`という共通ヘルパーを新設し、
  `argv.slice(2)`から`"--"`を除去した後、先頭のサブコマンド自体を
  `.slice(1)`でスキップしてから残りのフラグ以外の引数を返すように
  した。`runShow`/`runUpdate`/`runDelete`/`runSearch`/
  `updateStatus`の5箇所全てをこのヘルパー経由に統一。
- **再発防止**：同じ「pnpmが挟む`--`とサブコマンド名の位置」に
  依存する解析ロジックが今後別のCLIに追加された場合、`bridge.ts`
  ・`external.ts`双方のコメントに教訓を明記した。今後CLIを新設する
  際は、位置引数の解析を最初から共通ヘルパー化することを検討する
  （8章「技術的負債」参照）。

### バグ2: `ExternalKnowledge.update()`/`ExternalSource.update()`が「変更なし」で既存値を消す

- **検出方法**：擬似expectドライバで`pnpm external -- update <id>`
  を実行し、タイトルだけ変更して他は空Enter（変更なしのつもり）で
  進めたところ、`TypeError: Cannot read properties of undefined
  (reading 'trim')`で異常終了した。
- **原因**：`update(changes)`の実装が`{ ...this.record, ...changes
  }`というスプレッドによるマージだった。CLIは「変更なし」を
  `content: newContent || undefined`のように**明示的な`undefined`
  **として`changes`に渡すが、JavaScriptのオブジェクトスプレッドは
  値が`undefined`のキーも上書きする（キーが存在しない場合とは
  異なる）。結果、「変更なし」のつもりが既存の`content`等を
  `undefined`で消してしまい、直後のバリデーションでクラッシュして
  いた。
- **対応方法**：`changes`から値が`undefined`のキーを除去する
  `withoutUndefined()`ヘルパーを追加し、`{ ...this.record,
  ...withoutUndefined(changes) }`に変更。これは既存の
  `MemoryEntry.update()`/`InventoryItem.update()`が採用している
  「`if (changes.x !== undefined) this._x = changes.x`」という
  per-fieldチェックの規約と実質的に同じ意味を、スプレッドの形の
  ままフィールド追加コストを増やさずに実現したもの。
- **再発防止**：`ExternalKnowledge.test.ts`/`ExternalSource.test.ts`
  に「`changes`が一部フィールドを明示的な`undefined`で渡しても
  既存値が消えないこと」を確認する回帰テストを追加した。今後新しい
  Entityの`update()`を実装する際は、単純なオブジェクトスプレッドで
  はなく`MemoryEntry`と同じ規約（またはこの`withoutUndefined`
  ヘルパー）を使うことを徹底する。

いずれもテストのFakeリポジトリ＋Fakeデータでは表面化せず、
実際のCLIフロー（対話式で一部フィールドを空Enterで飛ばす）を
実機確認したことで発見できた。CLAUDE.mdが要求する「対話式CLIの
実機確認」の実効性を裏付ける結果となった。

## 8. 技術的負債（今後改善したい点）

- **検索の入口が2つに分かれている**：`pnpm find`（Memory/
  Inventory対象）と`pnpm external -- search`（External Brain対象）
  が別コマンドとして併存する（ADR 0014）。利用パターンが安定した
  時点で統合UXを検討する余地がある。
- **Bridge Importの同一バッチ内forward referenceが未対応**
  （ADR 0016）。ARCが「出典＋知識をまとめてJSON化して渡したい」
  という具体的なニーズを持った時点で、バッチ内一時ID解決の実装を
  検討する。
- **`relatedKnowledgeIds`の双方向同期・編集UIが未実装**（3章参照）。
- **CLIの位置引数解析パターンが各CLIファイルに分散**：`bridge.ts`
  と`external.ts`で似た「pnpmの`--`を考慮した位置引数解析」ロジック
  を持っている。今回`external.ts`側は共通ヘルパー化したが、
  `bridge.ts`とは共有していない。CLIが増えるほど同種のバグ
  （バグ1参照）が再発するリスクがあるため、`src/infrastructure/
  cli/`共通の引数解析ユーティリティへの切り出しを検討する。
- **Export の`limit`既定値（500件）が固定値**：将来的にOwnerの
  記録量が増えた場合、CLIオプションから既定値自体を変更できるように
  する余地がある（現状は`--all`で無制限化のみ可能）。

## 9. 次Versionへの申し送り（技術的観点から推奨する事項）

- CLIの位置引数解析を共通化するタイミングとして、次に新しいCLIを
  追加するVersionが良い機会になる。
- `ExternalKnowledge`の`relatedKnowledgeIds`を実際にOwnerが使う
  場面（例：ある知識を読み返して関連する別の知識を思い出した時）
  が出てきたら、CLIへの編集コマンド追加を検討する。
- 長期ロードマップ2.0 Phase 2の残り（Apple Health等の実データ
  連携）に着手する場合、External Brainの`ExternalSource`
  （`sourceType: 'observation'`等）を受け皿として使えるか、
  それとも別の設計が必要かを最初に検討すること。

## 10. POへの提案（提案・懸念点・改善案を自由に記載）

- External Brainは「情報を貯める」機能までは完成したが、「貯めた
  情報をARCとの会話でどう活かすか」という利用体験の設計はまだ
  手つかず。次のテーマ選定では、External Brainのデータを実際に
  ARCが会話中に参照する導線（Bridge Export経由でARCに渡す、等）
  を具体的に検討することを提案する。
- `confidence`（信頼度）は今回CLIで設定できるようにしたが、実際に
  Ownerがどれくらいこの項目を使うかは未知数。数Version運用してみて
  使われていなければ、UIの簡素化（デフォルトのまま使う人が多いなら
  質問自体を省略可能にする等）を検討してよいのではないか。

## 11. CEOへのコメント（今回の成果、次Versionへの期待）

Version10は、初めてPDF形式の指示書という新しい入力経路を経験した
Versionでもあった。24節という過去最大級の指示書量だったが、
「Systemは判断しない」という既存の判断基準（Constitution第2条）を
一貫して適用することで、5つの公式論点はいずれも比較的スムーズに
結論を出せた——これは、Version6〜9で繰り返し同じ基準に立ち返って
きたことの積み重ねが効いている。

一方で、実機確認によって2件のバグ（うち1件はVersion9と全く同じ
原因パターンの再発）を発見できたのは収穫だが、同時に「同じ種類の
バグが2つのCLIファイルで独立に発生した」という事実は、共通化すべき
ロジックがまだ共通化されていないことの表れでもある。次Versionでは
機能追加そのものと同じくらい、このような横断的な整理にも時間を
割く価値があると考える。

## 12. ARCへの引き継ぎ

### 新しい資産

- **External Brain**（`ExternalSource`/`ExternalKnowledge`）—
  外部情報とそこから得た知識を構造化して保存・検索できるように
  なった。ARCが会話の中で「これは記録に値する知識」と判断した
  内容を、Owner経由で`pnpm external -- add`またはBridge Import
  （`{"type":"ExternalKnowledge","data":{...}}`）で渡せる。
- **Bridge Export limit/truncated**：`GET /bridge/export`が返す
  データが既定で500件に制限されるようになった（`truncated: true`
  で切り詰められたことが分かる）。全件が必要な場合は`?all=true`
  （またはCLIの`--all`）を使う。

### 新しいルール

- confidenceや重複検知はSystem側が自動判断しない。ARCが会話の中で
  「これは信頼度が高い情報」と判断しても、実際の`confidence`値は
  Ownerが`pnpm external`で明示的に設定する必要がある（ADR 0012）。
- ExternalKnowledgeの検索は`pnpm external -- search`を使う。
  既存の`pnpm find`はMemory/Inventoryのみが対象で、External Brain
  は含まれない（ADR 0014）。

### 新しい思想

External Brainは「人生OS」というVisionにおいて、これまでの
Version1〜9が「Ownerの人生の事実（行動・状態）」を記録してきたのに
対し、初めて「Ownerが外部から取り込んだ情報」を記録対象にした
Versionである。これは長期ロードマップ2.0が「Phase 1: Data
Foundation」から「Phase 2: External Brain」へ移行する最初の一歩
であり、「ARCがProject ARCを読む」という次の目標に向けた土台になる。

### Ownerについて分かったこと

Version10のPDF指示書は24節という分量だったが、Ownerは特に途中で
介入せず、Claude Codeの自律的な実装完了を待つ姿勢だった（Version9
までに確立した「確認を減らし自律的に進める」運用が定着している
ことの表れと見える、事実ベースの観察）。

## 13. Product Review

### ユーザー体験で改善されたこと

Before：ARCとの会話で得た知識（法律の改正情報、読んだ記事の要点等）
は、Project ARC上には残せず、記憶かChatGPTの会話履歴に頼るしかなかった。

After：`pnpm external -- add`で、出典と一緒に知識を数分で記録できる。
`pnpm external -- search <キーワード>`で「あの記事、なんて書いて
あったっけ」にすぐ答えられるようになった。

### 毎日使う理由

既存の毎日使う機能（Morning Brief・Reflection）とは直接連動しない
独立機能だが、`pnpm timeline`に統合されたことで、他の記録と並べて
「あの日、この記事を読んでこう考えた」という文脈を後から振り返れる
ようになった。

### 懸念

`pnpm external -- add`は質問項目が10個あり、他のCLI（例：
`pnpm challenge -- add`）と比べて入力の手間が大きい。ほとんどの
項目が任意入力とはいえ、記録のハードルがやや高い可能性がある。

### 次Versionで最も価値が高い改善

`pnpm external -- add`の入力フローの簡素化、または「最低限
タイトルとcontentだけ入れれば登録でき、他の項目は後から
`update`で埋められる」ことをCLIのヘルプメッセージ等でもっと
明示すること。

## 14. 10年後のProject ARCへの貢献

External Brainの設計で10年後も効いてくるのは、「Sourceと
Knowledgeを分離した」という構造的判断（ADR 0013）だと考える。
情報を「どこから得たか」と「そこから何を学んだか」を最初から
別々のEntityとして持つことで、将来「同じ出典から得た複数の知識を
まとめて見たい」「ある知識の信頼性を出典の性質から再評価したい」
といったニーズが出てきても、Entityの再設計なしに対応できる。

「人生OS」というVisionから逆算すると、Version10はPhase 1
（人生の事実の記録）とPhase 2（外部情報の取り込み）をつなぐ最初の
接続点に位置する石である。ここで「Systemは信頼度や重複を自動判断
しない」という境界を明確に引いたこと（ADR 0012）は、将来External
Brainが大量の情報を扱うようになった時に、Systemが暴走せず
Constitution第2条を守り続けるための土台になる。

機能の見た目（CLIコマンド数、HTTPエンドポイント数）よりも、
「情報の性質ごとに正しくEntityを分離する」という一貫した設計判断
（ADR 0005・0006・0013で繰り返されているパターン）こそが、
Project ARCが将来複雑化しても壊れない骨格を作っている。
