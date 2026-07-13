# Roadmap

Principle 9（段階的拡張）に基づき、一度に全てを作らない。
各Versionは前段の土台の上にのみ積み上げる。

---

## Version1｜土台（完了）

**ゴール**：機能を作ることではなく、後続バージョンでDomain層を
壊さずに機能追加できる骨格と、判断基準となる思想文書を作ること。

| ステップ | 内容 |
|---|---|
| 1 | 思想ドキュメント確定（vision / principles / ai-roles / architecture / roadmap / ADR） |
| 2 | リポジトリ初期化・tsconfig・ESLint/Prettier・Vitest設定 |
| 3 | ~~Supabase CLIによるローカルPostgres環境構築~~ → Version2でJSON永続化に変更（ADR 0003） |
| 4 | Domain層：`Reflection`, `StudyLog`, `Task` エンティティ定義 |
| 5 | Application層：`RecordDailyReflection`など1〜2ユースケース（テスト駆動） |
| 6 | Adapters層：Repository実装（InMemory / Supabase） |
| 7 | Infrastructure：簡易CLI（`pnpm reflect`で日次振り返りを記録） |
| 8 | Docker化・CI設定・README整備 |

## Version2｜「ARCと一日を始め、ARCと一日を終える」（進行中）

**ゴール**：機能数よりUXを重視し、毎日使うプロダクトにする。

| 機能 | 内容 |
|---|---|
| Morning Brief（`pnpm morning`） | 今日の予定・やること・フォーカス（ダミー）、前日の勉強時間・支出（実データ） |
| Evening Reflection（`pnpm reflect`） | 今日の振り返り記録 + 100点満点の参考スコア |
| Life Inventory（`pnpm inventory`） | 持ち物の追加・一覧・更新（MVP） |
| 永続化 | ローカルJSONファイル（ADR 0003） |

Version2では以下を意図的に実装しない：Google Calendar/Tasks、
Supabaseクラウド同期、Gemini/OpenAI連携、画像解析、Decision Engine、
通知機能（すべてVersion3以降）。

## Version3｜「Connected Life」（進行中）

**ゴール**：自分の情報を管理するツールから、生活と繋がるシステムへ。

| 機能 | 内容 |
|---|---|
| Morning Brief（データソース差替） | Google Calendar/Tasksの実データを表示（UIは無変更） |
| Life Inventory拡張 | 購入日・価格・状態・用途・交換目安・メンテナンス履歴（複数）を追加 |
| Reflection改善 | 前日比較（自分自身との比較のみ、他人比較なし）を追加 |
| 認証 | Google OAuth（初回のみ）+ リフレッシュトークン暗号化保存（ADR 0004） |

Version3では以下を意図的に実装しない：Gemini/OpenAI連携、
Decision Engine、画像解析、通知機能（すべてVersion4以降）。
詳細は `docs/reports/Version3_Report.md` を参照。

## Version4｜「Memory」（進行中）

**ゴール**：生活と繋がるシステムから、人生を記憶するシステムへ。

| 機能 | 内容 |
|---|---|
| ARC Memory | 長期間保持する知識（Assets/Appearance/Goals等10カテゴリ）の追加・一覧・更新・削除 |
| Appearance Log | 月次の外見記録（写真ファイル管理のみ、画像解析なし） |
| Life Inventory写真紐付け | 持ち物に写真を紐付け |
| 横断検索 | MemoryとInventoryを横断検索（Reflection/Appearanceは対象外、ADR 0005） |

Version4では以下を意図的に実装しない：Gemini/OpenAI連携、
Decision Engine、通知機能、画像解析AI（すべてVersion5以降）。
詳細は `docs/reports/Version4_Report.md` を参照。

## Version5｜Skin Log / Purchase Log / Challenge Log（完了）

**ゴール**：Memoryで「知識」を、Appearance Logで「月次の総合的な
外見」を記録できるようになった土台の上に、より粒度の細かい記録先
（肌の状態・消耗品の購入サイクル・人生初挑戦）を追加する。

| 機能 | 内容 |
|---|---|
| Skin Log（`pnpm skin`） | 肌の状態（赤み・毛穴・ニキビ・ニキビ跡・皮脂）を数値で記録・比較。Appearance Logとは別Entity（ADR 0006） |
| Purchase Log（`pnpm purchase`） | 消耗品の「購入→使い始め→使い切り」を管理。Life Inventoryとは別Entity（ADR 0006） |
| Challenge Log（`pnpm challenge`） | 人生で初めて挑戦したこと（初めて食べたもの・体験）を記録 |

Version5では以下を意図的に実装しない：Gemini/OpenAI連携、
Decision Engine、通知機能、画像解析AI（Version6以降）。
詳細は `docs/reports/Version5_Report.md` を参照。

## Version6｜Smart Capture（次のVersion）

**ゴール**：「記録して」と言わなくても、ARCが写真・文章から
どのLogを更新すべきか自動で判断できる仕組みを作る（Owner・ARC
合意のテーマ）。OCRや画像認識の高度な実装より、判断ロジックの
Architecture（Entity/UseCase/Repository設計）を優先する。

---

> 以降のVersion番号は、Version1着手時点で構想していた旧ロードマップ
> （下記）であり、実際の開発順序（上記）とは一致しなくなっている。
> 「Version5｜司法試験管理」等の記述は現時点では未着手であり、
> 実施順は今後Owner/ARCと都度合意する（Principle 9: 段階的拡張）。

## Version2｜外部接続

- Google Calendar / Google Tasks / Google Sheets / Notion / Gmail 接続設計
- Supabaseをローカル→クラウドプロジェクトへ切り替え（ADR 0001の想定通り）
- 認証・RLS設計（複数クライアント対応の前提づくり）

## Version3｜企業研究システム

- 毎週土曜：企業選定 → Gemini調査 → Markdown化 → ARC要約 → 企業図鑑へ保存
- ai-roles.mdの責務分担（Gemini=一次情報、ARC=解釈）をそのまま実装に反映

## Version4｜家計管理

- Google Sheets連携 → 支出分析 → 月次レポート → 改善提案
- 「記録は資産である」（Principle 4）に基づき、過去データの再分析が
  可能なスキーマ設計を優先

## Version5｜司法試験管理

- 科目・進捗・学習時間・復習・苦手分野の管理
- 既存の学習ログ（刑訴法・民訴法・不法行為法など）との統合を想定

## Version6｜毎日の振り返り

- 睡眠・勉強時間・少林寺拳法・英会話・気分・支出・食事・肌・筋トレ・
  今日の出来事・明日の目標を記録
- Version1で作るReflectionエンティティの拡張として実装

## Version7｜ニュース

- 日経・NHK・BBC・CNN等から重要ニュースを取得
- 取得（System/Gemini）と解説（ARC）の責務分離を厳守

## Version8｜企業図鑑

- 50社分、事業内容・利益の出し方・競合・強み・課題・IR・
  株価材料・法律との関係を蓄積

## Version9｜将来拡張

- Apple Health（睡眠・歩数・体重）、GitHub、株価、天気、位置情報等
- 外部データソースが増えるため、この段階で改めてAIService抽象化の
  要否を判断する（Principle 9, ADR 0002）

---

## 進め方の原則

各Versionの着手前に、そのVersionが対応するdocsを先に更新・
確認する。コードが思想より先行しないようにする
（Principle 8: 長期保守性、Principle 3: 継続性）。
