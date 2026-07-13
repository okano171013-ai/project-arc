# Project ARC — 全履歴まとめ

Version1〜9（2026年7月時点）の開発経緯を1つの文書にまとめたもの。
各Versionの詳細は`docs/reports/VersionN_Report.md`、個別の設計判断は
`docs/adr/`を参照。本文書は「今までの流れをざっと掴む」ための
サマリーであり、正式な記録（一次資料）は各Report・ADR・コミット
履歴側にある。

---

## 0. 要約（1分で分かるProject ARC）

Project ARCは、Owner（おと）専用の「人生OS」を目指す個人プロジェクト。
ARC（ChatGPT）が思考パートナー・PO・CEO、Claude Codeが実装担当
（CTO）という役割分担で、Version1から段階的に機能を積み上げてきた
（`docs/ai-roles.md`）。

Version1〜3で「毎日使えるツール」の土台（Reflection・Morning Brief・
Google連携）を作り、Version4〜5で「記録を思い出せる・比較できる」
仕組み（Memory・Appearance Log・Skin Log・Purchase Log・Challenge
Log）を、Version6〜9で「ARCがこのシステムを実際に使える」土台
（Smart Capture・ARC Connector・Timeline・Bridge Layer・Third
Person Evaluation）を作った。2026年7月、Version9完了を機に
`docs/constitution.md`（ARC Constitution、7条文）を正式採択し、
Project ARCの最上位の指針とした。

現在地：Version9完了、Version10「External Brain」の具体的な実装
指示待ち（`docs/handoff/ARC_INBOX.md`参照）。

---

## 1. Versionごとの流れ

### Version1｜土台（完了）

**目的**：機能を作ることより、後続Versionで壊れない骨格と判断基準を
作ること。

- 思想ドキュメント確定（vision / principles / ai-roles / architecture / roadmap）
- Clean Architecture（Domain/Application/Adapters/Infrastructure）の
  骨格、TypeScript/pnpm/ESLint/Vitestのセットアップ
- `Reflection`/`StudyLog`/`Task` Entityの初期定義
- `RecordDailyReflectionUseCase`（最初のユースケース）
- CLI（`pnpm reflect`）
- 永続化はSupabase CLI（ローカルPostgres）を採用する計画だったが、
  実際のセットアップは行わずVersion2で方針転換（ADR 0001→0003）

### Version2｜「ARCと一日を始め、ARCと一日を終える」（完了）

**目的**：機能数よりUXを優先し、毎日使うプロダクトにする。

- Morning Brief（`pnpm morning`）：今日の予定・やること・フォーカス
  （当時はダミー）、前日の勉強時間・支出（実データ）
- Evening Reflection（`pnpm reflect`）：記録項目拡張＋100点満点の
  参考スコア算出
- Life Inventory（`pnpm inventory`）：持ち物の追加・一覧・更新MVP
- **永続化をSupabase（ADR 0001）からローカルJSONファイルへ変更**
  （ADR 0003）——環境構築の重さが「毎日使う」という目的と衝突した
  ため。Supabase実装は`--db=supabase`オプションとして温存。

### Version3｜「Connected Life」（完了）

**目的**：自分の情報を管理するツールから、生活と繋がるシステムへ。

- Google Calendar / Google Tasks連携（Morning BriefのProviderを
  差し替えるのみ、UseCase/CLI表示ロジックは無変更）
- Life Inventory拡張（購入日・価格・状態・用途・交換目安・
  メンテナンス履歴）
- Evening Reflectionの前日比較（自分自身との比較のみ）
- Google OAuth認証＋リフレッシュトークンの暗号化保存（ADR 0004）

### Version4｜「Memory」（完了、Version9セッションで確定・コミット）

**目的**：生活と繋がるシステムから、人生を記憶するシステムへ。

- ARC Memory（`pnpm memory`）：10カテゴリの長期知識を追加・一覧・
  更新・削除。Reflectionとは意図的に分離（ADR 0005）
- Appearance Log（`pnpm appearance`）：月次の外見記録（写真ファイル
  管理のみ、画像解析なし）
- Life Inventory写真紐付け（`pnpm inventory -- photo`）
- 横断検索（`pnpm find`）：MemoryとLife Inventoryのみが対象
  （Reflection/Appearance Logは対象外、ADR 0005）

> **注記**：Version4の実装自体はこの時点で完了していたが、
> git上は未コミットのまま複数Versionにわたり放置されていた。
> Version9セッション開始時にこれを発見し、test/typecheck/lint
> 確認の上で確定・コミットした（2章「教訓」参照）。

### Version5｜Skin Log / Purchase Log / Challenge Log（完了）

**目的**：より粒度の細かい記録先を追加する。

- Skin Log（`pnpm skin`）：肌の状態（赤み・毛穴・ニキビ・ニキビ跡・
  皮脂を1〜5で評価）を頻繁に記録・比較。Appearance Logとは別Entity
  （ADR 0006）
- Purchase Log（`pnpm purchase`）：消耗品の「購入→使い始め→使い
  切り」管理。Life Inventoryとは別Entity（ADR 0006）
- Challenge Log（`pnpm challenge`）：人生で初めて挑戦したことを記録

### Version6｜Smart Capture（完了）

**目的**：「記録して」と言わなくても、写真・文章からどのLogを
更新すべきかの下書き提案が得られる仕組み。

- 設計着手時に`docs/ai-roles.md`を確認した結果、「Systemは判断
  しない」という根幹原則とブリーフの字面（「AIが自動判断」）が
  衝突することが判明。**Systemは提案の提示と確定済み内容の書き込み
  のみ**、という方針で設計し直した（ADR 0007）。
- Smart Capture（`pnpm capture`）：`RuleBasedCaptureClassifier`
  （キーワード一致のみ、AI・画像解析なし）による下書き提案 →
  Owner確認 → SkinLog/PurchaseLog/ChallengeLog/AppearanceLogへ書き込み

### Version7｜ARC Connector（完了）

**目的**：CLI専用ツールから「ARCが利用できるデータ基盤」へ。

- ARC Connector（`pnpm api`）：Application層をHTTP経由で呼び出せる
  API。新規外部依存なし（Node標準`http`のみ）。ローカル専用
  （`127.0.0.1`）・認証未実装（ADR 0008、将来の課題として明記）
- `TimelineEntry`型のみ設計（実装はVersion8）

### Version8｜Timeline（完了）

**目的**：各Logを横断した時系列一覧。

- Timeline（`pnpm timeline`、`GET /timeline`）：6Log（当時）を
  横断して日付降順表示。Memory/Life Inventoryは対象外（ADR 0009）
- Owner提案によるアーキテクチャ図（`docs/architecture-diagram.md`）
  を作成

### Version9｜ARC Bridge（完了）

**目的**：ARCとProject ARCの最初の接続点。完全自動は目指さず、
Ownerが「ARCの提案を簡単に渡せる状態」を作る。

- Bridge Layer（`pnpm bridge -- import/export`）：`{type, data}`
  形式のJSONで8種別を一括登録・出力。既存UseCaseへ委譲する薄い
  ディスパッチャ、部分成功を許容（ADR 0010）
- Third Person Evaluation（`pnpm evaluation`）：Version5から4回
  持ち越されていた「他者からの評価」を正式決着。Appearance Logとは
  別Entity、personはテキストから断定しない（ADR 0011）
- Version Reportに14章「10年後のProject ARCへの貢献」を追加
  （以降恒久ルール）

### Version9完了後｜ARC Constitution採択（ドキュメントのみ、Versionなし）

- ARCから「長期ロードマップ2.0」（Phase1完了〜Phase6 Life OS）と
  「ARC Constitution」（7条文）の提案が届く
- 長期ロードマップは方向性として`docs/roadmap.md`に記録
- 「ARC Constitution」はガバナンス文書のためOwnerに採否を確認 →
  **そのまま採用**。`docs/constitution.md`として新設し、
  vision/principles/ai-roles/READMEから相互参照するよう更新
  （第6条「マネジメントは遠慮しない」はPrinciple 3・6との適用範囲の
  違いとして整理）

---

## 2. 繰り返し起きた教訓・パターン

### 「実装完了」と「確定（コミット）」は別物

Version9セッション開始時、Version2〜4の実装がすべて未コミットの
まま複数Versionにわたり放置されていることが判明した（原因：
Claude Code側がVersionの節目で必ずしもコミットまで完了させて
いなかった）。以後、Version完了時の標準フローに「コミット」を
明示的に組み込んでいる（`CLAUDE.md`参照）。

### 実機確認でしか見つからない不具合が繰り返し発生する

- Version3〜4：日本語IME全角数字入力、CLIコマンド名とpnpm組み込み
  コマンドの衝突（`search`→`find`）
- Version6：Node.js `readline/promises`が非TTY標準入力で複数質問を
  取りこぼす（サンドボックスでの対話式CLI検証が不可能だった根本
  原因を特定。以後、擬似expectドライバで駆動する手法を確立）
- Version9：`pnpm bridge -- import`のargv解析バグ（サブコマンド名を
  ファイルパスと誤認識）を実機確認中に発見・修正
- 教訓：コードレビュー・型チェックだけでは見つからない不具合が
  一貫して存在する。実機確認（またはそれに準ずる実データでの検証）
  を省略しないことがこのプロジェクトで繰り返し価値を証明している。

### 「Systemは判断しない」という原則が繰り返し試される

Version6（Smart Capture）・Version7（ARC Connector）・Version9
（Bridge Layer）のいずれも、ブリーフを字面通り実装すると
「Systemが自動で判断する」設計になりかねなかった。その都度
`docs/ai-roles.md`・Principle 1/2/10に立ち返り、「Systemは提案の
提示・確定済み内容の実行のみ」という設計に修正してきた。この
一貫性がVersion9の「ARC Constitution」第2条・第4条として明文化
された。

### 「性質の異なる記録を無理に統合しない」という境界の型

ADR 0005（Memory vs Reflection/Inventory）、ADR 0006（Skin/
Purchase Log vs Appearance Log/Inventory）、ADR 0009（Timeline
対象範囲）、ADR 0011（Third Person Evaluation vs Appearance Log）
は、いずれも同じ判断の型（記録の粒度・性質・主体が異なるものは
別Entityにする）を異なる場面に適用したもの。

### ARCとClaude Codeの引き継ぎ運用の進化

当初は会話の都度Ownerが手動でブリーフ全文を貼っていたが、
Version6完了後に`docs/handoff/`（受信箱`ARC_INBOX.md`・送信箱
`VersionN_ARC_Feedback.md`）という運用を確立。Version9完了後は
Owner指示により「確認を減らして自律的に進める」方針に転換し、
ARC相談が必要な場面（責務境界の判断等）もClaude Codeが判断して
進め、根拠をReport/ADRに記録する運用に変わった。ただしガバナンス
文書の採否（ARC Constitution等）のような「前提を左右する判断」は
引き続きOwnerに確認している。

---

## 3. アーキテクチャの現在地（Version9時点）

```
Infrastructure層：CLI（memory/appearance/skin/purchase/challenge/
  capture/timeline/evaluation/bridge/reflect/morning/...）、
  ARC Connector（HTTP API、127.0.0.1のみ）
        ↓
Application層：UseCases（Add*/Record*/List*/Get*/Suggest*/Import*/Export*）、
  Bridge Layer、共有serializers、Ports（Repository/Provider interfaces）
        ↓
Domain層：Entities（Reflection/MemoryEntry/InventoryItem/
  AppearanceLog/SkinLog/PurchaseLog/ChallengeLog/Capture/
  ThirdPersonEvaluation）、Value Objects（TimelineEntry等）
        ↓
Adapters層：JsonFile*Repository（既定）、SupabaseReflectionRepository
  （任意）、GoogleCalendarProvider、RuleBasedCaptureClassifier
```

詳細な図は`docs/architecture-diagram.md`（Mermaid、4種類の図）を
参照。

### 現存する主なLog（記録先）と境界

| Log | 性質 | 境界の根拠 |
|---|---|---|
| Reflection | その日単位で閉じる日次記録 | ADR 0005 |
| MemoryEntry | 時間に紐づかない知識 | ADR 0005 |
| InventoryItem | 耐久品の状態管理 | ADR 0006 |
| AppearanceLog | Owner自身による月次総合評価 | ADR 0006・0011 |
| SkinLog | 肌の構造化記録（頻繁） | ADR 0006 |
| PurchaseLog | 消耗品の購入〜使い切り | ADR 0006 |
| ChallengeLog | 人生初挑戦 | — |
| ThirdPersonEvaluation | 他者からの評価 | ADR 0011 |
| Capture | Smart Captureの監査記録 | ADR 0007 |

Timeline（ADR 0009）はReflection/AppearanceLog/SkinLog/
PurchaseLog/ChallengeLog/Capture/ThirdPersonEvaluationの7つを、
横断検索（`pnpm find`、ADR 0005）はMemoryとInventoryのみを、
Bridge Layer（`pnpm bridge`、ADR 0010）はCaptureを除く8種別を、
それぞれ対象とする——3つの横断機能が目的ごとに異なる対象範囲を
持って併存している。

---

## 4. ガバナンス文書の階層（2026年7月時点）

```
docs/constitution.md   ← 最上位（7条文、Version9完了後にOwner承認）
        ↓
docs/vision.md         ← Core Mission（記録→気づき→判断）
        ↓
docs/principles.md     ← Principle 1〜10（設計判断の基準）
        ↓
docs/ai-roles.md       ← 責務分担（Owner/ARC/Gemini/Claude Code/System）
        ↓
docs/architecture.md   ← 技術設計
        ↓
docs/adr/              ← 個別の設計判断（0001〜0011）
```

---

## 5. 未解決・今後の課題

- **Version10「External Brain」の具体的な実装指示はまだ届いていない**
  （ARCからの「長期ロードマップ2.0」は方向性の提案のみ、
  `docs/roadmap.md`参照）。
- ARC ConnectorはVersion7〜9を通じて認証未実装のまま
  （ローカル専用のため実害はないが、リモート接続時は必須）。
- ARCが実際にこのAPI/Bridge Layerを呼び出す経路はまだ存在しない
  （Owner経由の手動コピー＆ペーストが現在の唯一の橋）。
- Reflectionの`findAll()`が存在せず、`findRecent(3650)`で代用して
  いる（ADR 0009、10年分を超えると漏れる可能性）。
- Bridge LayerのExportにサイズ制限がなく、Version10でHealth
  Integration相当の大量データを扱う場合は見直しが必要
  （Version9 ARC Feedback参照）。
- 各Versionの技術的負債の詳細は、それぞれの`VersionN_Report.md`の
  「8. 技術的負債」を参照。

---

## 6. どこに何が書いてあるか（索引）

| 知りたいこと | 参照先 |
|---|---|
| Project ARCの目的・最上位の指針 | `docs/constitution.md` |
| なぜこの機能を作るのか | `docs/vision.md` |
| 設計判断の基準 | `docs/principles.md` |
| 誰が何を決めるか | `docs/ai-roles.md` |
| 技術構成・レイヤー | `docs/architecture.md`、`docs/architecture-diagram.md` |
| VersionごとのVersion番号と概要 | `docs/roadmap.md` |
| 各Versionの詳細（実装内容・バグ・負債・引き継ぎ） | `docs/reports/VersionN_Report.md` |
| 個別の設計判断とその理由 | `docs/adr/000N-*.md` |
| ARCとのやり取りの運用 | `docs/handoff/README.md` |
| ARCからの過去の指示書原文 | `docs/handoff/archive/` |
| 完成の定義・各Versionの達成状況 | `docs/dod.md` |
| コマンド一覧・セットアップ | `README.md` |
