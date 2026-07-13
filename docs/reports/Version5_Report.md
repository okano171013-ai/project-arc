# Project ARC — Version5 Report

作成者：Claude Code（CTO） 　宛先：Owner / ARC（ARCレビュー用正式記録）
日付：2026年7月

---

## 1. Version5概要

Version5は、ARC（ChatGPT）からの引き継ぎプロンプトをきっかけに開始した。
そのプロンプトは「Version1〜5完了、Skin Log/Purchase Log/Challenge Log
実装済み」を前提にVersion6「Smart Capture」の設計を求めるものだったが、
実際のリポジトリを確認したところ前提が事実と異なっていた。

- gitコミットは`Initial commit`の1つのみで、Version2〜4の作業は
  すべて未コミットのまま残っていた。
- Skin Log / Purchase Log / Challenge Logはコードとして存在せず、
  `docs/roadmap.md`にもVersion5の正式な計画はなかった。

Owner確認のもと、まずVersion4を確定・コミットし（コミット
`1810ac3`）、その上でARCのブリーフが前提としていたVersion5相当の
3機能（Skin Log / Purchase Log / Challenge Log）を実装した。これにより
Version6「Smart Capture」（写真・文章をどのLogへ振り分けるか判断する
仕組み）が、実在する複数のLogを振り分け先として設計できる状態になった。

---

## 2. 今回実装した機能

### Skin Log（`pnpm skin`）

肌の状態（赤み・毛穴・ニキビ・ニキビ跡・皮脂）を1〜5の数値で構造化し、
頻繁に記録・比較する。既存のAppearance Log（月次・自由記述の`skin`
フィールド）とは別Entityとした（3章、ADR 0006）。写真比較機能
（`compare`サブコマンド）は画像解析を行わず、直近2件の写真ファイルパス
を提示するのみに留めている（Version4からの一貫方針：画像解析はしない）。

### Purchase Log（`pnpm purchase`）

化粧水・洗顔料・カミソリ替刃等の消耗品について、「購入日→使い始め→
使い切り」のライフサイクルを管理する。既存のLife Inventory（財布・
シェーバー等の耐久消費財、状態・メンテナンス履歴管理）とは別Entityと
した（3章、ADR 0006）。同じ商品（例：メラノCC）を何度も買い直す
ことを前提に、購入のたびに新しいレコードを作る設計にしている。状態
遷移（未使用→使用中→使い切り）は`startUsing()`/`finish()`という
一方向のメソッドのみで表現し、`InventoryItem.update()`のような自由な
上書きは持たせていない。

### Challenge Log（`pnpm challenge`）

人生で初めて挑戦したこと（初めて食べたもの・体験）を記録する。既存の
どのLogとも重複しない新規領域のため、境界設計の判断は不要だった。

いずれも既存のAppearance Log / Life Inventory / Memoryと同じ
Clean Architectureの型（Domain Entity → Application Port → UseCase →
JsonFile Repository → CLI）を踏襲している。

---

## 3. Skin Log/Purchase LogとAppearance Log/Life Inventoryの境界（なぜ別Entityにしたか）

Version4のMemory/Inventory境界（ADR 0005）と同種の問題が発生した。
Skin Logで記録したい内容はAppearanceLogの`skin`フィールドと、
Purchase Logで記録したい内容はInventoryItemの購入・状態管理と、
それぞれ対象が重複して見える。

判断基準は以下の通り（詳細はADR 0006）。

- **Skin Log vs Appearance Log**：「月次の総合的な振り返り」か
  「肌だけを構造化項目で頻繁に比較する」かの違い。Appearance Logの
  `skin`フィールドは月次コメント欄としてそのまま残し、両者は統合
  しない。
- **Purchase Log vs Life Inventory**：「同じモノを長く使い続け、
  状態が変化していく」ものはLife Inventory、「使い切ったら同じ商品
  を買い直す」消耗品はPurchase Log、という基準で分けた。

この境界定義は、Version6のSmart Captureで「肌の写真 → Skin Log」
「レシート・消耗品購入 → Purchase Log」という自動分類ロジックの
根拠にそのまま使える設計にしている。

---

## 4. Architecture Review

### 追加したEntity

| Entity | 追加理由 |
|---|---|
| `SkinLog` | 肌の状態（赤み/毛穴/ニキビ/ニキビ跡/皮脂）を1〜5の数値でバリデーションしつつ記録する専用Entity |
| `PurchaseLog` | 消耗品の購入〜使い切りという一方向のライフサイクルを`status`ゲッターと`startUsing()`/`finish()`で表現 |
| `ChallengeLog` | 人生で初めての挑戦を記録するシンプルなEntity |

### 追加したPort（Repository interface）

| Port | メソッド |
|---|---|
| `SkinLogRepository` | `save` / `findAll` |
| `PurchaseLogRepository` | `save` / `findAll` / `findById` |
| `ChallengeLogRepository` | `save` / `findAll` |

### 追加したUseCase

| UseCase | 内容 |
|---|---|
| `AddSkinLog` / `ListSkinLogs` | Skin Logの追加・日付降順一覧 |
| `RecordPurchase` / `StartUsingPurchase` / `FinishPurchase` / `ListPurchases` | Purchase Logの状態遷移をUseCaseごとに分離（Entity側のメソッド呼び出しをUseCaseがラップする形はInventoryの`AddMaintenanceRecord`と同型） |
| `AddChallengeLog` / `ListChallengeLogs` | Challenge Logの追加・日付降順一覧 |

### 追加したAdapter / Infrastructure

| ファイル | 内容 |
|---|---|
| `JsonFileSkinLogRepository` → `data/skin-log.json` | |
| `JsonFilePurchaseLogRepository` → `data/purchase-log.json` | |
| `JsonFileChallengeLogRepository` → `data/challenge-log.json` | |
| `src/infrastructure/cli/skin.ts` | `add` / `list` / `compare` |
| `src/infrastructure/cli/purchase.ts` | `add` / `start` / `finish` / `list` |
| `src/infrastructure/cli/challenge.ts` | `add` / `list` |

すべて既存の`readJsonArray`/`writeJsonArray`（`jsonStore.ts`）と
`savePhoto`（`photoStore.ts`）を再利用し、永続化・写真管理のロジック
を重複させていない。

---

## 5. ADR

### 追加したADR

- **ADR 0006: Skin Log / Purchase Log と Appearance Log / Life
  Inventoryの境界**（`docs/adr/0006-skin-purchase-log-boundary.md`）
  3章で説明した境界設計を正式に記録した。

### ADRを追加しなかった判断とその理由

- **PurchaseLogのcategoryを自由記述にした判断**：InventoryCategory
  のような固定enumにするか迷ったが、消耗品のカテゴリは耐久品より
  種類が多く流動的（スキンケア・洗顔・日用品等）なため、Memory
  EntryのcategoryをEnumにした判断とは逆に、あえて自由記述にした。
  これはADR相当ではなく実装判断として本Report（4章）に記録するに
  留めた。将来分類の必要が明確になった時点でEnum化を検討する。

---

## 6. テスト

| 項目 | 結果 |
|---|---|
| テストファイル数 | 12ファイル（新規3） |
| テストケース数 | 64件（Version4の49件 + 新規15件） |
| typecheck | エラーゼロ |
| lint | エラーゼロ |
| 実機確認 | 未実施（後述の制約） |

**内訳（新規追加分）**：
- `SkinLog.test.ts`（5件）：追加・数値範囲バリデーション（1〜5）・
  日付形式バリデーション・同日複数件の許可・日付降順ソート
- `PurchaseLog.test.ts`（6件）：新規購入登録（未使用状態）・
  productName必須バリデーション・未使用→使用中→使い切りの状態遷移・
  未使用のまま使い切ろうとした場合のエラー・
  startedUsingDateがpurchaseDateより前の場合のエラー・
  ステータス別フィルタ
- `ChallengeLog.test.ts`（4件）：追加・title必須バリデーション・
  日付形式バリデーション・日付降順ソート

**重要な制約（Version3・Version4から継続）**：対話式CLI
（`pnpm skin -- add`等、`readline/promises`ベース）は、このサンドボックス
環境では非TTYの標準入力（パイプ・ファイルリダイレクト）に対して
複数回の`rl.question()`呼び出しが正しく解決されず、実機確認ができない
ことを本Versionの作業中に確認した（Version4の`pnpm memory -- add`で
同様の挙動を確認済み）。これはコード側の不具合というより、Windows上の
非対話シェルでのreadline挙動に起因する制約と考えられる。UseCase層の
テストで正常系・異常系を担保しているが、対話式CLIそのものの動作は
Owner環境（通常のターミナルでの対話実行）でしか確認できない。

---

## 7. 修正したバグ

Version5の実装過程では、コードレビューで検出・修正した不具合はなかった。
Version4の未確定作業（未コミット状態だったMemory/Appearance Log等）に
ついては、今回`pnpm test`/`typecheck`/`lint`をすべて再実行して緑を
確認した上でコミットした（詳細は`docs/dod.md`のVersion4完了チェック
リスト参照）。

Version1〜4では実機確認のたびに何かしらのバグが見つかっているため、
Version5についても対話式CLIの実機確認（6章）を経て初めてバグの有無が
判断できる状態であることに留意してほしい。

---

## 8. 技術的負債

- **PurchaseLogの「同一商品の重複購入」検出がない**：同じ`productName`
  で複数の未使用レコードが並存していても警告しない。実運用で
  問題になれば、`add`時に同名の未使用レコードがあれば確認を挟む
  UXを検討する。
- **Skin Logの数値評価の方向性（1が良いか悪いか）がコード上明文化
  されていない**：ドメインコメントで「5が悪い」としているが、CLI上
  ではその前提を毎回説明していない。運用してみてOwnerが混乱するなら
  表示側で補足する。
- **roadmap.mdの新旧2系統のVersion番号**：今回Version5/6の実態を
  roadmap.mdに追記したが、旧ロードマップ（「Version5｜司法試験管理」
  等）の記述はそのまま残しており、完全な整理はできていない（9章）。
- Version4から持ち越しの技術的負債（MemoryEntryの構造化欠如、写真
  ファイルの容量管理なし、Search精度）は本Versionでは対応していない。

---

## 9. Version6への申し送り

- **Smart Captureの分類ロジックは本Versionで定義した境界がそのまま
  根拠になる**：ADR 0005（Memory/Inventory/Reflection）とADR 0006
  （Skin Log/Purchase Log/Appearance Log/Life Inventory）の判断基準
  を、そのまま自動分類のルールセットとして再利用できる設計にしてある。
- **roadmap.mdの整理**：新旧のVersion番号の混在は、Version6着手時に
  Owner/ARCと合意の上で古い記述（Version7以降の「ニュース」「企業
  図鑑」等）の扱いを決めたほうがよい。
- **写真の保存先が機能ごとに分散している**（`appearance-photos/`
  `inventory-photos/`（実装未確認）`skin-photos/`）：Smart Captureで
  「写真を1枚受け取ってどのLogに振り分けるか」を判断する際、保存先
  ディレクトリの一覧を1箇所で管理しておくと実装しやすい。

---

## 10. POへの提案

### UX改善案

- Purchase Logの`start`/`finish`はリストから番号選択する方式だが、
  未使用・使用中の件数が増えてくると選びにくくなる可能性がある。
  商品名の一部入力で絞り込めるようにすると使いやすくなるかもしれない
  （現時点ではYAGNIの観点から実装していない）。

### 設計改善案

- Skin Logの`compare`は現状「直近2件の写真パスを提示するだけ」の
  最小実装。Ownerが実際に使ってみて、もっと過去の特定の日付と比較
  したいニーズが出てくれば、日付を指定して比較できるようにする
  拡張の余地がある。

---

## 11. CEOへのコメント

Version5は、技術的な難しさよりも「前提の確認」に一番時間を使った
Versionでした。ARCからの引き継ぎプロンプトは「Version1〜5完了」を
前提にしていましたが、実際にはVersion2〜4の作業がまるごと未コミット
のまま残っており、Skin Log/Purchase Log/Challenge Logはコードとして
存在していませんでした。これをそのまま鵜呑みにしてVersion6の設計に
進んでいたら、存在しないLogへの書き込みを前提にした設計を作ってしまう
ところでした。

正直にお伝えすると、これは「ARCが嘘をついた」という話ではなく、
Claude Code側（私）がVersion4の作業を実装した後、コミットせずに
セッションを終えていたことが根本原因だと考えています。実装が完了して
いることと、それがgit履歴として確定していることは別物であり、今回
その区別が曖昧になっていました。次回以降、Versionの節目では必ず
コミットまで完了させることを徹底します。

Version5自体（Skin Log/Purchase Log/Challenge Log）の実装は、既存の
Appearance Log/Life Inventoryのパターンを踏襲した堅実な拡張であり、
設計上の悩みどころ（3章の境界判断）もADR 0005の前例があったため
比較的スムーズに判断できました。一方で、Version3〜4と同様、対話式
CLIの実機確認はまだ行えていません（6章）。Skin Log/Purchase Logは
特に日付の前後関係（購入日・使い始め日・使い切り日）のバリデーション
が絡むため、実際の入力フローで違和感がないか確認してほしいです。

---

## 12. ARCへの引き継ぎ

### 新しい資産

- **Skin Log**：肌の状態（赤み・毛穴・ニキビ・ニキビ跡・皮脂、各1〜5）
  と使用中スキンケア・改善メモ・写真パスを、日付を指定して何度でも
  記録できる（`pnpm skin -- add/list/compare`）。ARCが「最近肌の調子
  どう？」と聞かれた際、この構造化データを参照して過去の数値と比較
  した会話ができる。
- **Purchase Log**：消耗品の購入〜使い切りサイクル（`pnpm purchase --
  add/start/finish/list`）。「そろそろ化粧水切れそう？」「メラノCC
  買ってからどれくらい経った？」といった質問に、購入日・使い始め日を
  根拠に答えられるようになった。
- **Challenge Log**：人生で初めて挑戦したこと（`pnpm challenge --
  add/list`）。「今年初めてやったこと」のような振り返り会話の材料に
  使える。

### 新しいルール

- **Skin LogとAppearance Logは別物**：Appearance Logは月次の総合的な
  外見の振り返り、Skin Logは肌だけを頻繁に構造化記録するもの。ARCが
  Ownerに記録を促す際は、月1回の総合チェックはAppearance Log、日々の
  肌の変化はSkin Logと案内を分けてほしい。
- **Purchase LogとLife Inventoryは別物**：財布・シェーバーのような
  長く使う耐久品はLife Inventory、化粧水・洗顔料のように使い切って
  また買う消耗品はPurchase Log。「同じ商品を何度も買い直す」ものは
  すべてPurchase Log側に案内する。
- **画像解析は依然として行っていない**：Skin Logの写真比較機能も、
  ファイルパスを提示するだけでAIによる肌診断はしていない。ARCが
  Ownerとの会話で「写真から自動で肌の変化を判定してくれる」かのような
  案内をしないよう注意してほしい（Version6のSmart Captureも「どの
  Logに保存するか」の判断であり、写真内容の解析ではない）。

### 新しい思想

Version4で「記録するシステム」から「思い出せるシステム」への転換が
あったが、Version5はその先の「記録の粒度を、実際に使う場面に合わせて
分ける」というテーマだった。すべてを1つの汎用的なLogに詰め込むのでは
なく、「月次の総合評価」と「日々の構造化記録」、「長く使うモノ」と
「使い切って買い直すモノ」を別々の仕組みとして用意することで、
それぞれの記録のしやすさ・比較のしやすさを保っている。これは
Project ARC全体の「記録は資産である」（Principle 4）を、記録の
粒度設計というレベルで実践した回でもあった。

また、Version5の始まり方（ARCの前提と実態の食い違いを検出し、
実装前にOwnerへ確認した）は、`docs/ai-roles.md`の責務分担を実地で
確認した回でもあった。ARCが会話の中で持つ「プロジェクトの現状認識」
と、Claude Codeが管理するgit上の実態は、意図的に同期の仕組みを
作らない限りズレうる。今後も、大きな前提（「Versionが完了している」
等）を元に作業を始める際は、Claude Code側で実態を確認する運用を
続ける。

### Ownerについて分かったこと

- 前提のズレを指摘した際、Ownerは「Version4を確定→Version5を実施
  →Version6」という、実装順序を修正する形で即座に意思決定した。
  ARCが用意した計画をそのまま実行するのではなく、実態に合わせて
  柔軟に順序を組み替える判断を好む傾向がうかがえる。
- 過去のVersionレポート（Version3・4）を見る限り、Ownerは実機確認
  を自分の環境で行う運用に慣れており、Claude Code側のサンドボックス
  制約（対話式CLIが確認できない等）を許容している。

---

## 13. Product Review

### ユーザー体験で改善されたこと

- **Before**：肌の調子は月1回のAppearance Logの自由記述コメントでしか
  振り返れず、「先月と比べて赤みが増えたか」を正確に比較する手段が
  なかった。
- **After**：Skin Logで赤み・毛穴・ニキビ等を数値で記録できるように
  なり、`pnpm skin -- list`で時系列の推移を一覧できる。
- **Before**：化粧水や洗顔料をいつ買ったか、いつ使い切ったかを記憶に
  頼るしかなかった。
- **After**：Purchase Logで購入〜使い切りが記録として残り、
  `pnpm purchase -- list`で「今何を使い切りかけているか」を一覧できる。

### 毎日使う理由

Skin Log/Purchase Log/Challenge Logは、Morning Brief/Reflectionのような
「毎日必ず使う」機能ではなく、「気づいたときに記録する」タイプの機能
である。毎日使う理由を強化するというより、Morning BriefやReflectionの
「今日のひとこと」を書く際に参照する材料が増えた、という位置づけが近い。

### 懸念

- Purchase Logの`start`/`finish`は、Ownerが「使い始めた」「使い切った」
  タイミングでその都度CLIを起動する必要があり、記録し忘れが起きやすい
  UXになっている。この点はVersion6のSmart Capture（レシート写真等
  からの自動記録）で改善されることが期待される。

### 次Versionで最も価値が高い改善

Purchase Logの記録し忘れ問題は、Smart Captureが「レシートの写真を
送るだけで自動的にPurchase Logへ記録される」体験を実現できれば
根本的に解消する。Version6の中で最も体験価値が高いのは、この
Purchase Log連携になると考えている。
