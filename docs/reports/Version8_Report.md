# Project ARC — Version8 Report

作成者：Claude Code（CTO） 　宛先：Owner / ARC（ARCレビュー用正式記録）
日付：2026年7月

---

## 1. Version8概要

テーマは「Timeline」。Version7の`docs/reports/Version7_Report.md`
9章「Version8への申し送り」で明記した通り、Version7で型のみ設計した
`TimelineEntry`を実装し、各Logを横断した時系列一覧を提供する。加えて、
Version7完了時にOwnerから提案された「Project ARC アーキテクチャ図」
も本Versionで作成した。ARCからの新しい指示書は本Version着手時点では
届いていなかったため（`docs/handoff/ARC_INBOX.md`確認済み）、
Version7の申し送り内容とOwner提案に基づき、Claude Code側の判断で
着手した（Owner指示：確認を減らし自律的に進める）。

---

## 2. 今回実装した機能

### Timeline（`pnpm timeline`、`GET /timeline`）

Reflection/AppearanceLog/SkinLog/PurchaseLog/ChallengeLog/Captureの
6Logを横断し、日付降順で一覧表示する。`--since=`（日付以降に絞込）・
`--source=`（ソース種別に絞込）・`--limit=`（件数上限）に対応した。
CLI・HTTP APIの両方から利用できる（`GetTimelineUseCase`を共通で
呼び出す）。

Memory・Life Inventoryは対象外とした（3章、ADR 0009）。

### Project ARC アーキテクチャ図

`docs/architecture-diagram.md`にMermaid図を4種類作成した：レイヤー
構成、データの流れ（Owner/ARC/Systemの責務境界）、Logの境界
（Timeline/検索それぞれの対象範囲）、ARCとの接続点（現状と将来）。
GitHub上でMermaidがそのままレンダリングされるため、追加のツール
なしで参照できる。

---

## 3. Timelineの対象範囲（なぜMemory/Inventoryを含めないか）

Version7で設計した`TimelineEntry`型は8ソース（Reflection/Memory/
AppearanceLog/SkinLog/PurchaseLog/ChallengeLog/InventoryItem/
Capture）を想定していたが、実際の集約UseCaseでは6ソースのみを
対象とした。

判断基準はADR 0005・ADR 0006と同じ「性質の異なる記録を無理に統合
しない」という原則である。Memoryは「時間に紐づかない知識」、
Life Inventoryは「継続的な状態」であり、いずれも「ある瞬間に何が
起きたか」を表すTimelineの趣旨に合わない。詳細はADR 0009を参照。

またReflectionの全件取得には`findRecent(3650)`（約10年分）を使い、
`ReflectionRepository`への`findAll()`追加は見送った。3つの実装
（InMemory/JsonFile/Supabase）全てに手を入れる必要があり、特に
Supabase実装はこのサンドボックス環境で実接続検証ができないため、
検証できない変更を加えるリスクを避けた（ADR 0009参照）。

---

## 4. Architecture Review

### 追加したファイル

| ファイル | 内容 |
|---|---|
| `src/application/use-cases/timeline/GetTimeline.ts` | 6つのRepositoryを横断してTimelineEntryへ射影し、`since`/`source`/`limit`でフィルタするUseCase |
| `src/infrastructure/cli/timeline.ts` | `pnpm timeline`（`find`と同様、対話式ではない引数ベースCLI） |
| `docs/architecture-diagram.md` | アーキテクチャ図（Mermaid） |

### 変更したファイル

| ファイル | 変更内容 |
|---|---|
| `src/infrastructure/http/server.ts` | `GET /timeline`ルートと`getTimeline`UseCaseの組み立てを追加 |

新規のRepository/Portは追加していない（Timelineは既存の6
Repositoryの`findAll()`/`findRecent()`を組み合わせるだけの射影UseCase
のため）。

---

## 5. ADR

### 追加したADR

- **ADR 0009: Timelineの対象範囲とデータ取得方法**
  （`docs/adr/0009-timeline-scope.md`）
  3章の判断（対象6ソースへの限定、`findRecent`による全件代用）を
  正式に記録した。

### ADRを追加しなかった判断とその理由

- **アーキテクチャ図をMermaid＋Markdownで作成した判断**：ツール
  選定の実装判断であり、アーキテクチャレベルの決定ではないため
  本Report（2章）に記録するに留めた。GitHub上でネイティブに
  レンダリングされ追加ツール不要という理由で選定した。

---

## 6. テスト

| 項目 | 結果 |
|---|---|
| テストファイル数 | 16ファイル（新規1） |
| テストケース数 | 90件（Version7の83件 + 新規7件） |
| typecheck | エラーゼロ |
| lint | エラーゼロ |
| 実機確認 | 完了（後述） |

**内訳（新規追加分）**：
- `GetTimeline.test.ts`（5件）：複数ソースの日付降順マージ、
  `source`フィルタ、`since`フィルタ（境界値含む）、`limit`、
  PurchaseLog/AppearanceLog/Captureを含む全ソースの集約確認
- `server.test.ts`に2件追加：`GET /timeline`の複数ログ横断・
  日付降順ソート確認、`?source=`によるフィルタ確認

実装中に自作テストの誤り（Captureが実行する`/capture`呼び出しは
Capture自体の監査記録とChallengeLogへの書き込みの2件を生むため、
同日に2件のTimelineEntryが現れる）を発見し、テストのアサーションを
修正した（詳細は後述7章）。

**実機確認**：Timeline CLIは`find`と同じく対話式ではないため、実際に
`pnpm run api`でサーバーを起動し、HTTP経由でSkinLog・AppearanceLog・
PurchaseLog・Capture（ChallengeLog経由）・Reflectionへ実データを
投入した上で、`pnpm run timeline`（引数なし・`--since=`・
`--source=`の3パターン）と`GET /timeline`（`fetch`経由）の両方で、
日本語を含む実データが正しく日付降順で表示されることを確認した。
検証用データは確認後に削除済み。

---

## 7. 修正したバグ

| # | 検出方法 | 原因 | 対応 | 再発防止 |
|---|---|---|---|---|
| 1 | 自動テスト実行時 | `server.test.ts`の新規テストで、`/capture`が「Capture自体の監査記録」と「確定したdestination（ChallengeLog）への書き込み」の2件を生むことを見落とし、Timelineの結果が1件少ないと誤ってアサーションしていた | 実際の挙動（同日に2件のTimelineEntryが現れるのが正しい）に合わせてテストのアサーションを修正 | 複数のRepositoryにまたがる書き込みを行うUseCase（RecordCapture等）をテストする際は、副作用として生成される全てのレコード種別を洗い出してからアサーションを書く |

このバグはテストコード側の誤りであり、`GetTimelineUseCase`や
`RecordCaptureUseCase`自体の実装に問題はなかった。

---

## 8. 技術的負債

- **Reflectionの`findRecent(3650)`は将来不正確になりうる**
  （ADR 0009参照）。10年を超える記録が蓄積した時点で`findAll()`の
  追加を検討する必要がある。
- **Timelineの`limit`はソート・フィルタ後に適用される**ため、
  記録件数が非常に多くなった場合、全件をメモリ上に読み込んでから
  絞り込む設計になっている。現状のデータ量（個人利用、JSONファイル
  ベース）では問題にならないが、将来的にページネーションが必要に
  なる可能性がある。
- **`TimelineEntry`のmetadataの形がsourceごとに異なる**（型安全性が
  弱い）。呼び出し側（CLIやAPI利用者）が`source`を見てmetadataの
  形を推測する必要がある。件数が増えてきたら、sourceごとの
  metadata型を判別可能なUnion型にする改善余地がある。

---

## 9. Version9への申し送り

- **ARCとの実連携**：Version7・Version8を通じて、ARC Connectorと
  Timelineという「土台」は整った。次に価値が高いのは、実際にARCが
  これらを呼び出せる経路を1つでも通すこと（Version7 Reportでも
  同じ指摘）。
- **Timelineの表示UX**：現状はCLI上のプレーンテキスト一覧のみ。
  Ownerが日常的に「最近の記録を振り返る」ために使うなら、
  週次・月次のようなまとまった単位での表示（例：`--group-by=week`）
  があると使いやすくなる可能性がある。
- **ARCブリーフのロードマップ**：Version7のブリーフに記載されていた
  将来ロードマップ（Version9「Knowledge」→Version10「Health
  Integration」→Version11〜「Life OS」）が現時点での最新の構想
  である。次のARCからの指示書、または`docs/roadmap.md`の記述と
  照らし合わせて優先順位を確認すること。

---

## 10. POへの提案

### UX改善案

- Timelineの`--source=`は現状`SkinLog`のような内部の型名をそのまま
  指定する必要がある。日本語のエイリアス（例：`--source=肌`）が
  あると入力しやすくなるかもしれない（現時点ではYAGNIの観点から
  未実装）。

### 設計改善案

- 特になし。Timeline自体は既存パターンの組み合わせであり、新しい
  設計判断はADR 0009に記載した範囲に収まっている。

---

## 11. CEOへのコメント

Version8は、新しいARCからの指示書が届いていない状態で、Version7の
申し送りとOwnerの提案だけを根拠に着手したVersionでした。「確認を
減らして自律的に進める」というOwner指示に従い、Timeline機能の実装
（Version7の申し送り通り）とアーキテクチャ図の作成（Owner提案通り）
の両方を、都度の確認なしに進めました。

技術的には、Version6・Version7で確立した「Systemは判断しない」設計
方針を壊さずにTimelineを実装できたことが収穫でした。Timelineは
単に既存Repositoryの`findAll()`を集めて並べ替えるだけの機能であり、
「どの記録が重要か」を判断するロジックは一切持っていません。これは
`docs/ai-roles.md`の原則がVersion6以降、実装の隅々まで一貫して
守られていることの証左だと考えています。

正直にお伝えすると、テスト実装中に自分自身が書いたテストの誤り
（7章参照）を見つけました。RecordCaptureUseCaseが1回の呼び出しで
2つのRepositoryに書き込むという、Version6で自分が設計した仕様を、
Version8のテストを書く際に一時的に見落としていました。実装自体に
影響はありませんでしたが、複数Repositoryにまたがる副作用を持つ
UseCaseをテストする際は注意が必要だという教訓を得ました。

---

## 12. ARCへの引き継ぎ

### 新しい資産

- **Timeline**（`pnpm timeline`、`GET /timeline`）：Reflection・
  Appearance Log・Skin Log・Purchase Log・Challenge Log・Captureを
  横断した時系列一覧。ARCが「最近どうだった？」と聞かれた際、
  複数のLogを個別に確認しなくても、この1つの一覧から会話の材料を
  拾える。`since`/`source`で絞り込めるため、「今月のSkin Logだけ
  見せて」のような使い方もできる。
- **Project ARC アーキテクチャ図**（`docs/architecture-diagram.md`）：
  ARCがOwnerに技術的な仕組みを説明する際、あるいはARC自身がこの
  プロジェクトの構造を理解する際の参照資料として使える。

### 新しいルール

- **Timelineの対象はMemory・Life Inventoryを含まない**（ADR 0009）。
  「あれ何使ってた？」のような知識・モノの検索は`pnpm find`
  （横断検索）、「最近何があった？」のような出来事の振り返りは
  `pnpm timeline`、と使い分けを案内してほしい。
- **Timelineも判断・要約はしない**：日付順に並べて表示するだけで、
  「今週は充実していた」のような評価はTimeline自体には含まれない。
  評価・解釈はARCまたはOwnerが行う（Version6・Version7から一貫する
  原則）。

### 新しい思想

Version8は、Version6・Version7で確立した「Systemは判断しない」と
いう制約を、新しい機能（複数Logの横断表示）でも一切緩めずに実装
できることを示した。Timelineは一見「複数の記録から重要なものを
選んで見せる」機能に見えるかもしれないが、実際には「全ての記録を
日付順に並べるだけ」であり、選別・要約はしていない。この違いを
維持し続けることが、Project ARCが「勝手に判断し始めない」システム
であり続けるための実装上の要点だと考えている。

### Ownerについて分かったこと

- 新しいARCの指示書がない状態でも、Version7の申し送りとOwner自身の
  提案（アーキテクチャ図）を根拠に、Claude Codeが次に何をすべきか
  を自分で判断して進めることを問題視されなかった（今回の指示
  「go」のみで着手）。指示書がない期間の作業継続についても、
  Version Report・ADR・ドキュメント更新という形で判断根拠を残す
  運用が機能している。

---

## 13. Product Review

### ユーザー体験で改善されたこと

- **Before**：「最近どうだったか」を振り返るには、`pnpm skin --
  list`、`pnpm purchase -- list`、`pnpm challenge -- list`等を
  個別に実行する必要があった。
- **After**：`pnpm timeline`一つで、複数のLogを横断した時系列を
  一度に確認できる。

### 毎日使う理由

Morning Brief・Reflectionのような「毎日必ず使う」機能ではないが、
週末の振り返りや「そういえば最近何してたっけ」という場面で使える
機能として位置づけられる。

### 懸念

- Timelineは現状プレーンテキストの一覧のみで、件数が増えてくると
  読みにくくなる可能性がある（8章の技術的負債参照）。

### 次Versionで最も価値が高い改善

Version7・Version8を通じて「ARCが利用できるデータ基盤」の土台
（ARC Connector、Timeline）は整った。次に最も価値が高いのは、
これらを実際にARCが使える経路を1つでも通すこと——たとえ完全自動
でなくとも、Ownerが手動でARCの回答をAPIに渡すだけで記録できる
という中間的な体験でも、CLIより明らかに摩擦が減る（Version7
Reportと同じ結論）。
