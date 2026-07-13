# Project ARC — Version3 Report

作成者：Claude Code（CTO） 　宛先：Owner / ARC（ARCレビュー用正式記録）
日付：2026年7月

---

## 1. Version3概要

テーマは「**Connected Life**」。Version2で確立した「毎日使う」ループ
（Morning Brief / Evening Reflection / Life Inventory）を、外部の
実データと接続することで「生活と繋がるシステム」へ進化させた。

MVPの優先順位に従い、以下4点を実装した。

1. Google Calendarと連携したMorning Brief（データソース差し替えのみ）
2. Google Tasksと連携したMorning Brief（todos統合）
3. Life Inventoryの拡張（購入情報・状態・用途・交換目安・メンテナンス履歴）
4. Evening Reflectionの前日比較（自分自身との比較のみ）

Version2のUseCase・CLI表示ロジックは意図的に変更せず、Repositoryパターン
と同じ考え方でProvider（データソース）だけを差し替えた。

---

## 2. 今回実装した機能（理由を含む）

### ① Google Calendar連携

`GoogleCalendarProvider`を新設し、既存の`DailyPlanProvider`ポートを
実装する`GoogleDailyPlanProvider`が、Calendar/Tasksの実データを
Version2と同じ`DailyPlan`形状（schedule/todos/focus/message）に
変換する。**Application層の`GenerateMorningBriefUseCase`・
`morning.ts`の表示ロジックは1行も変更していない**。これは「UIを
変えずデータソースだけ差し替える」というOwnerの要件と、ADR
0003で確立した「Adapters層の追加だけで永続化を差し替えられる」
という設計方針を、Providerに対しても同様に適用した結果である。

対象カレンダーはプライマリカレンダーのみとした（複数カレンダー統合は
Owner未回答のため、CTO判断でスコープ外とし、Version4申し送り事項に
記載）。

### ② Google Tasks連携

`GoogleTaskProvider`を新設し、`GoogleDailyPlanProvider`内で
Calendarと合成して「今日やること」に表示する。対象タスクリストは
デフォルトリスト（`@default`）のみとした（複数リスト対応は同様に
Owner未回答のためCTO判断でスコープ外）。

### ③ Life Inventory拡張

`InventoryItem`エンティティに購入日・購入価格・状態（新品/良好/普通/
要注意/交換推奨）・用途・交換目安を追加した。交換目安は
Owner回答通り「期間（月数）」で保持し、表示時に「n年nヶ月ごと」形式に
変換する`formatReplacementInterval()`をDomain層に実装した。

メンテナンス履歴はOwner回答通り「複数保存（追記式）」とし、`update()`
とは別に`addMaintenanceRecord()`という専用メソッド・専用UseCase
（`AddMaintenanceRecordUseCase`）を用意した。単純な`update()`の
上書きにしなかったのは、履歴は「置き換えるデータ」ではなく
「積み上がるデータ」であり、意味的に別の操作だと判断したため
（Principle 4: 記録は資産である）。

詳細確認用に`GetInventoryItemUseCase`と`pnpm inventory -- show`
サブコマンドを新設した。

### ④ Reflection改善（前日比較）

`RecordDailyReflectionUseCase`が、記録時に前日の`Reflection`を
`ReflectionRepository`から取得し、スコアの差分（`scoreDelta`）を
算出して返すようにした。比較対象は常に「自分の前日」のみであり、
他人のスコアとの比較は行わない（Owner要件通り、そもそも他人の
データを扱う設計にもなっていない）。

---

## 3. 実装しなかった機能（延期理由）

| 機能 | 延期先 | 理由 |
|---|---|---|
| Gemini / OpenAI API連携 | Version4以降 | Version3のMVP優先順位に含まれず、Owner指示通り明示的にスコープ外 |
| Decision Engine | Version4以降 | 同上。判断はまだ人間（Owner）に委ねる方針（Principle 1）を維持 |
| 画像解析（Life Inventory写真） | Version4 | Owner要件で明示的に延期。データモデル上、後から`imageUrl`等を追加しても既存フィールドと独立するため、今追加しなくても後方互換上の問題は生じない |
| 通知機能 | Version4以降 | 同上、明示的にスコープ外 |
| 複数カレンダー対応 | Version4（申し送り） | Owner未回答のためCTO判断でスコープ外。プライマリカレンダーのみなら`GoogleCalendarProvider`のシンプルな実装で足りるため（YAGNI） |
| 複数タスクリスト対応 | Version4（申し送り） | 同上 |
| Supabaseクラウド同期 | Version4（申し送り、Version2から継続） | ADR 0003の通り、まだセットアップ未完了のため |

---

## 4. Architecture Review

### 追加・変更したEntity

| Entity/Value Object | 変更内容 |
|---|---|
| `InventoryItem`（変更） | purchaseDate/purchasePrice/condition/usage/replacementIntervalMonths/maintenanceHistoryを追加。`addMaintenanceRecord()`メソッド新設。`restore()`の引数にmaintenanceHistoryを追加 |
| `CalendarEvent`（新規） | Calendar APIレスポンスを正規化するvalue object |
| `TaskItem`（新規） | Tasks APIレスポンスを正規化するvalue object |
| `MaintenanceRecord`（新規） | メンテナンス履歴1件を表すvalue object（date, content） |
| `Reflection`（変更なし） | `score()`メソッドは既存のものをそのまま利用 |

### 追加・変更したUseCase

| UseCase | 種別 | 内容 |
|---|---|---|
| `RecordDailyReflectionUseCase` | 変更 | 前日Reflectionを取得しscoreDelta/previousScoreを出力に追加 |
| `UpdateInventoryItemUseCase` | 変更 | Version3の新フィールドをchangesに追加 |
| `AddMaintenanceRecordUseCase` | 新規 | メンテナンス履歴の追記専用 |
| `GetInventoryItemUseCase` | 新規 | 1件詳細取得（show用） |
| `GenerateMorningBriefUseCase` | **変更なし** | Version3要件「UIを変更しない」を最も強く体現している箇所 |

### 追加・変更したPort（Repository/Provider インターフェース）

| Port | 内容 |
|---|---|
| `CalendarProvider`（新規） | `getEventsForDate(date)` |
| `TaskProvider`（新規） | `getTodayTasks()` |
| `DailyPlanProvider`（変更なし） | Version2のインターフェースをそのまま維持 |

### 追加したAdapters/Infrastructure

| クラス/モジュール | 層 | 内容 |
|---|---|---|
| `GoogleCalendarProvider` | Adapters | CalendarProviderの実装 |
| `GoogleTaskProvider` | Adapters | TaskProviderの実装 |
| `GoogleDailyPlanProvider` | Adapters | Calendar+TasksをDailyPlan形状に合成（DailyPlanProviderの実装） |
| `JsonFileInventoryRepository`（変更） | Adapters | maintenanceHistory・新フィールドの永続化に対応 |
| `googleAuthClient.ts` | Infrastructure | OAuth 2.0認証フロー（初回ブラウザ認証＋以降は自動リフレッシュ） |
| `tokenStore.ts` | Infrastructure | リフレッシュトークンのAES-256-GCM暗号化保存 |
| `shared/date.ts` | Shared | `previousDate()`共通ユーティリティ |

---

## 5. ADR

### 追加したADR

- **ADR 0004: Google OAuth認証とリフレッシュトークンの暗号化保存**
  （`docs/adr/0004-google-oauth-and-token-encryption.md`）
  認証方式、トークンの保存方式、keytar等を採用しなかった理由を記録。
  新しい外部依存とセキュリティに関わる持続的な設計判断のため、
  ADR化が必要と判断した。

### ADRを追加しなかった判断とその理由

- **Life Inventoryのフィールド拡張**：データモデルの拡張であり、
  Repositoryパターンや層構造への影響がないため、ADRの対象ではなく
  通常の実装変更として扱った。
- **Reflectionの前日比較**：既存UseCase内でのロジック追加であり、
  新しい抽象化やアーキテクチャ上の判断を伴わないため、ADR化不要と
  判断した。
- **Google API未設定時のダミーデータへのフォールバック**：これは
  ADR相当か迷った点である。最終的に「実装の堅牢性に関する判断」で
  あり、「アーキテクチャ上の構造を変える判断」ではないと整理し、
  ADRにはせず本レポート（3章・8章）に記録するに留めた。ただし、
  この判断はUXに与える影響が大きいため、Owner確認が必要な項目として
  後述の「10. POへの提案」にも記載する。

---

## 6. テスト

| 項目 | 結果 |
|---|---|
| テストファイル数 | 5ファイル（新規3、既存拡張2） |
| テストケース数 | 29件（Owner実機で確認済み） |
| typecheck | エラーゼロ（Owner実機で確認済み） |
| lint | エラーゼロ（Owner実機で確認済み） |
| 実機確認 | 完了。Morning Brief（Google Calendar/Tasks実連携含む）、Evening Reflection（新規記録・上書き・前日比較）、Life Inventory（add/list/update/maintain/show）すべて確認済み |

**テストの内訳**：
- `RecordDailyReflection.test.ts`（8件）：スコア計算・前日比較（新規4件追加）
- `Inventory.test.ts`（13件）：追加・一覧・更新・異常系に加え、購入情報、
  メンテナンス履歴の複数追加、`GetInventoryItemUseCase`、
  `formatReplacementInterval`（新規9件追加）
- `GenerateMorningBrief.test.ts`（2件）：Version2から変更なし
- `GoogleDailyPlanProvider.test.ts`（3件、新規）：Fake Provider経由で
  Calendar/Tasksの合成ロジックをテスト（実際のGoogle APIは呼ばない）

**重要な制約**：Claude Codeの実行環境（サンドボックス）はネットワークに
接続できないため、`pnpm install`で`googleapis`等の新規パッケージを
実際に取得することができない。そのため、今回のVersion3実装は：

- 型チェックは、パッケージ未取得の状態でも検出できる範囲（ロジック上の
  型不整合）のみ確認済み。パッケージ取得後に初めて確定する型情報
  （`googleapis`の型定義等）は未検証。
- `pnpm test` / `pnpm lint` / 実機での`pnpm morning`（Google連携）は、
  **Owner環境での実行が必須**。特にOAuth認証フローは実際のブラウザ・
  実際のGoogle Cloud Consoleでの設定が前提のため、Claude Code側では
  一切検証できていない。

この制約は次章「7. 修正したバグ」の検出方法にも影響している。

---

## 7. 修正したバグ

サンドボックス環境の制約上、実機テストによる検出はできなかった。
以下は**コードレビュー（目視 + 部分的な型チェック）で検出・修正**した
不具合であり、Owner環境での実機確認はこれから行う必要がある。

| # | 検出方法 | 原因 | 対応 | 再発防止 |
|---|---|---|---|---|
| 1 | 実装中の設計レビュー | `SUPABASE_ANON_KEY`が必須スキーマのままだと、Google連携チェックのために`loadEnv()`をmorning.tsから呼ぶと無関係な理由で例外が飛ぶ | `SUPABASE_ANON_KEY`をスキーマ上optionalにし、Supabase実利用箇所（reflect.ts）で個別に必須チェック | 環境変数を「複数機能が共有するグローバル必須」にしない。機能ごとに使用箇所で検証する設計を今後も踏襲 |
| 2 | ロジック確認 | メンテナンス履歴を`update()`で扱うと、複数保存の意図と反して上書きが起きうる設計になっていた | `addMaintenanceRecord()`という追記専用メソッド・専用UseCaseとして分離 | 「置き換え」と「追記」が混在しうるフィールドは、設計時点でメソッドを分ける |

Version1〜2で発生したような実機起因のバグ（全角スペース、pnpmの`--`引数
処理等）は、今回はOwner環境での実行がまだ行われていないため、**この
Reportの時点ではまだ発見されていない可能性が高い**。実機確認後、
追加のバグが見つかることを想定しておいてほしい。

### 追記：Owner実機確認により判明したバグ（2件）

本Report作成後、Owner環境での実機確認で以下2件が判明し、修正済み。

| # | 検出方法 | 原因 | 対応 | 再発防止 |
|---|---|---|---|---|
| 3 | 実機での`pnpm reflect`実行 | `RecordDailyReflectionUseCase`は「既存の記録がある場合はupdate use caseを使え」とエラーメッセージで案内していたが、そのUpdate use case自体が実装されていなかった。同じ日に2回`pnpm reflect`を実行すると使えなくなっていた | `UpdateDailyReflectionUseCase`を新規実装。`reflect.ts`が実行前に当日の記録有無を確認し、存在すれば自動的にUpdateへ切り替えるよう修正 | エラーメッセージが「別の手段がある」と案内する場合、その手段が実際に実装されているかをレビュー時にチェックする |
| 4 | 実機でのLife Inventory `maintain`実行 | メンテナンス履歴の日付入力（`2026-1-1`）がゼロ埋めされずそのまま保存され、`YYYY-MM-DD`形式を前提とする将来のソート・比較処理と不整合を起こす可能性があった | CLI側で日付を正規化する`normalizeDateInput()`を追加。Domain層の`addMaintenanceRecord()`にも形式バリデーションを追加（防御的多重チェック） | 日付を扱うフィールドは、Reflectionと同様に「入力の正規化」と「Domain層でのフォーマット検証」の両方を最初から実装する |
| 5（重大） | 実機でのGoogle認証テスト（`pnpm morning`） | `.env`ファイルを実際にプロセスへ読み込む処理（`dotenv`等）がVersion1から一度も実装されておらず、`env.ts`は`process.env`を検証するだけで、`.env`ファイルの中身をそこに読み込む処理が欠落していた。Supabase・Google連携とも、`.env`に値を書いても常に「未設定」として扱われる状態だった | `dotenv`パッケージを追加し、`env.ts`のモジュール読み込み時に`.env`を`process.env`へ読み込むよう修正 | 環境変数を使う機能を最初に実装する時点で、「`.env`ファイルが実際に読み込まれるか」を空でも良いので一度実機で確認するテスト観点を持つ。今回はVersion3でGoogle連携を実装するまで、Supabase連携も含めて誰も`.env`の実読み込みを検証していなかった |

---

## 8. 技術的負債

- **Google API未設定時のフォールバック挙動**：CTO判断で「ダミー
  データに自動フォールバック」としたが、これはOwnerの明示的な合意を
  得ていない（5章参照）。実際に使ってみて「エラーで止めてほしい」
  等の意見があれば、次回以降で挙動を変更する必要がある。
- **トークン暗号化キーの保存場所**（ADR 0004）：鍵と暗号文が同じ
  `data/`配下にあるため、同一マシン内の別プロセスからの完全な防御には
  なっていない。OSキーチェーン連携（keytar等）への移行はVersion4以降の
  検討課題。
- **Life Inventoryの`show`コマンドのUX**：番号選択方式のままなので、
  持ち物の数が増えてくると選びにくくなる可能性がある。検索・
  絞り込み機能はVersion4以降で検討の余地がある。
- **サンドボックス環境でのテスト未実施**：本Versionの`pnpm test`
  ・`pnpm lint`・実機確認はすべてOwner環境での実施待ちであり、
  現時点のReportは「実装完了」であって「動作確認完了」ではない
  （6章参照）。

---

## 9. Version4への申し送り（技術的観点）

- **複数カレンダー・複数タスクリスト対応**：Owner未回答のまま
  Version3ではプライマリカレンダー・デフォルトリストのみに限定した。
  必要であれば設計を拡張する（`CalendarProvider`のインターフェースは
  複数カレンダーを返せるよう改修が必要）。
- **Supabaseクラウド同期**：ADR 0003の申し送り事項を継続。Google
  APIのリフレッシュトークンもSupabase移行時にどう扱うか、合わせて
  設計する必要がある。
- **画像解析・写真保存**：Life Inventoryのデータモデルに
  `imageUrl`等を追加する形で対応可能。既存フィールドとは独立して
  追加できるため、後方互換性の懸念は小さい。
- **トークン保存のセキュリティ強化**：OSキーチェーン連携を検討する
  場合、keytar等のネイティブモジュールがWindows環境でのビルド
  トラブル（Version1〜2で発生した`esbuild`のケース）を再発させる
  リスクがある。導入する場合は、Owner環境での事前検証を必須にすべき。

---

## 10. POへの提案

- **提案**：Google API未設定時のフォールバック挙動（ダミーデータに
  自動的に切り替わる）について、実際に使ってみた上で「気づきにくい」
  と感じるようであれば、CLI起動時に一度だけ目立つ警告を出す、
  もしくは`--strict`フラグでエラー終了を選べるようにする、といった
  改善を検討したい。
- **懸念点**：Version3でCLIの操作項目（特に`inventory update`）が
  かなり長くなった。プロンプトの数が増えると、Version1〜2で発生した
  「入力待ち中に次のコマンドを打ってしまい、誤った値が入る」という
  事故が起きやすくなる。Version4で機能を増やす前に、一度UXの
  見直し（例：全項目を毎回聞くのではなく、変更したい項目だけ選べる
  ようにする）を検討する価値があると考える。
- **改善案**：現在Reportは`docs/reports/`に手動生成のMarkdownとして
  蓄積される設計になっている。Version数が増えるとARCレビューの際に
  過去Reportを横断的に参照しづらくなる可能性があるため、Version4以降で
  「Reportの一覧・要約を自動生成する」ミニマルな仕組み（Project ARC
  自身のRepositoryパターンで`data/reports-index.json`のようなものを
  持つ）を検討してもよいかもしれない。ただしこれはYAGNIの観点から、
  実際に「過去Reportを探すのが大変」という具体的な困りごとが出てから
  でも遅くないと考える。

---

## 11. CEOへのコメント

Version3は、Version1〜2で作った「土台」と「習慣ループ」の上に、
初めて外部世界（Google Calendar/Tasks）との接続を実装した回でした。
Repositoryパターンを一貫して使ってきたことで、Morning BriefのUIを
一切変更せずにデータソースだけを差し替えられたのは、これまでの
設計判断（ADR 0001〜0003）が正しく積み上がっていたことの証明だと
考えています。

実機確認では、想定通りいくつかの不具合が見つかりました。中でも
5章の#5（`.env`ファイルが実際には一度も読み込まれていなかった
バグ）は、Version1から潜んでいた見落としで、今回Google連携を
実装して初めて表面化しました。逆に言えば、Version1〜2で
Supabase連携やGoogle連携を誰も実際に試していなかったからこそ
見過ごされていた問題です。これは「実機で動かして初めて分かる
ことがある」という、このプロジェクトを通じて繰り返し確認してきた
教訓を改めて裏付けるものでした。

最終的に、Google Calendar/Tasksとの実連携（OAuth認証・実データ取得・
2回目以降の自動再認証）まで含めて、Owner環境で動作確認が完了して
います。次のVersionへの期待としては、「Connected Life」という
テーマが本当に生活の役に立つかどうかは、機能が動くかどうかより
**毎日使い続けられるかどうか**で決まると思っています。Version4に
進む前に、まずVersion3を実際に1〜2週間使ってみて、Morning Briefが
本当に朝の行動を変えているか、Reflectionの前日比較がモチベーションに
なっているかを確認してから、次の機能追加を判断することをお勧めします。

---

## 12. ARCへの引き継ぎ

Project ARC（ARC自身）が、次にOwnerと対話する際に踏まえておくべき
内容を引き継ぎます。

### 新しい資産

- **Google Calendarの実データ**：今日の予定がリアルタイムで取得できる
  ようになった。ARCは「今日の予定を踏まえたアドバイス」を、Morning
  Briefの表示内容と矛盾しない形で行える。
- **Google Tasksの実データ**：「今日やること」が実際のタスクリストと
  連動している。振り返り相談の際、記録された`proudOf`（今日頑張った
  こと）と実際のタスクを突き合わせて会話できる。
- **Life Inventoryの拡張データ**：購入日・価格・状態・交換目安・
  メンテナンス履歴が蓄積され始めた。「そろそろ靴の交換時期では」
  といった、記録に基づいた気づきの提供がARCの役割として可能になる
  （ただし判断は常にOwnerに委ねる、Principle 1）。
- **前日比較スコア**：Reflectionの記録に「前日比」が付くようになった。
  数日分のスコア推移を踏まえた振り返り会話がしやすくなる。

### 新しいルール

- **「UIを変えずデータソースだけ差し替える」パターンが確立した**：
  Morning BriefはVersion2からUseCase・表示ロジックを一切変更せず、
  Providerだけを差し替えてGoogle連携を実現した。今後Gemini等の
  外部AI連携を検討する際も、同じ考え方（既存のインターフェースを
  壊さず実装だけ差し替える）が適用できる。
- **環境変数は「グローバル必須」にしない**：ある機能（Supabase）の
  必須項目が、無関係な機能（Google連携）の実行をブロックしないよう、
  環境変数の検証は機能ごとの利用箇所で行う設計にした。
- **未設定・未接続時は落ちずにダミーデータへフォールバックする**：
  Google API未設定でも`pnpm morning`は動く。ARCはOwnerに「動いて
  いるが実データではない」状態がありうることを念頭に置く。

### 新しい思想

Version3のテーマ「Connected Life」は、`docs/vision.md`のCore
Mission（「今日、自分は何をするべきか」をより良く判断するため）を
一歩進めるものだった。これまでは記録（Reflection・Inventory）が
中心だったが、今回初めて「外部の現実（カレンダー・タスク）」と
「記録」が同じ画面上で並ぶようになった。ARCが担う「判断材料の
提供」（Principle 2）は、これによって扱える材料の幅が広がった
——ただし決定権が人間にある（Principle 1）ことは変わらない。

### Ownerについて分かったこと

以下は今回のやり取りで観察された事実であり、断定的な性格評価では
ない（Principle 5）。

- 一度に複数の手順を提示するより、**1ステップずつ確認しながら進める
  方が、実行漏れや勘違いが少ない**傾向が見られた（Google Cloud
  Consoleのセットアップを1手順ずつ案内した回は、大きな迷いなく
  完走できた）。
- **対話式CLI（`pnpm reflect`等）の入力待ち中に、次に打つつもりの
  コマンドを先に入力してしまう**という事象が複数回発生した。これは
  ミスというより、テンポよく作業を進めたいスタイルの表れと考えられる。
  今後CLIを設計する際は、入力待ちであることがより明確に伝わる
  表示（プロンプトの強調等）を検討する価値があるかもしれない。
- エラーが起きても手順を止めず、**求められた確認コマンドを素直に
  実行して結果を返す**姿勢が一貫していた。トラブルシューティングが
  スムーズに進んだ一因と考えられる。
- セキュリティ・プライバシーに関わる判断（トークンの暗号化等）に
  ついては、選択肢を示すと**明確に意思決定**していた（「許容できないから暗号化」）。
