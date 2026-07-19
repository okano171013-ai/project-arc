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
| 3 | Supabase CLIによるローカルPostgres環境構築 |
| 4 | Domain層：`Reflection`, `StudyLog`, `Task` エンティティ定義 |
| 5 | Application層：`RecordDailyReflection`など1〜2ユースケース（テスト駆動） |
| 6 | Adapters層：Supabase Repository実装 |
| 7 | Infrastructure：簡易CLI（例：`pnpm reflect`で日次振り返りを記録） |
| 8 | Docker化・CI設定・README整備 |

---

## Version2｜外部接続（現在地）

- 認証・RLS設計（複数クライアント対応の前提づくり） — ADR 0003で確定
- Supabaseをローカル→クラウドプロジェクトへ切り替え（ADR 0001の想定通り）
- Google Calendar / Google Tasks / Google Sheets / Notion / Gmail 接続設計

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
