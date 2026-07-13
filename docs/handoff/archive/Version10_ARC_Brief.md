# Version10 ARC指示書（原文アーカイブ）

Owner経由で2026年7月に届いた、ARC（ChatGPT）からのVersion10「External
Brain」実装指示書の原文（PDF: `Project ARC Version10 実装指示書.pdf`
として提供された）。処理結果は`docs/reports/Version10_Report.md`を
参照（Principle 4: 記録は資産である）。

これまでの指示書と異なり、docs/handoff/ARC_INBOX.mdへの直接貼り付け
ではなくPDFファイルとして提供された。内容は24節にわたる非常に詳細な
実装仕様であり、Entity定義・UseCase一覧・CLI/API/Bridge仕様・
テスト観点・完成の定義・ADR候補まで具体的に指定されていた。

---

# Project ARC Version10 実装指示書

## Version10｜External Brain

### 0. この文書の位置付け

本書は、Project ARC Version10「External Brain」の実装指示書である。

Claude Codeは、着手前に以下の文書を必ず確認すること。

- docs/constitution.md
- docs/vision.md
- docs/principles.md
- docs/ai-roles.md
- docs/architecture.md
- docs/architecture-diagram.md
- docs/roadmap.md
- docs/dod.md
- docs/reports/Version9_Report.md
- docs/adr/0005-*
- docs/adr/0007-*
- docs/adr/0008-*
- docs/adr/0009-*
- docs/adr/0010-*
- docs/adr/0011-*
- CLAUDE.md

既存文書と本指示書が衝突する場合、上位のガバナンス文書を優先すること。

優先順位は以下のとおり。

1. docs/constitution.md
2. docs/vision.md
3. docs/principles.md
4. docs/ai-roles.md
5. ADR
6. 本指示書
7. 実装上の都合

---

## 1. Version10の目的

Version10の目的は、Project ARCに「外部情報を、出典と文脈を失わず保存し、後から再利用できる仕組み」を追加することである。

ここでいうExternal Brainとは、単なるブックマーク管理、ファイル置き場、全文検索システムではない。

Project ARCにおけるExternal Brainは、Ownerが外部から得た情報を、

- どこから得た情報か
- いつ取得したか
- 何についての情報か
- なぜ保存したのか
- どの程度信頼できるか
- Ownerが何を考えたか

という文脈とともに蓄積し、将来のARCとの対話、意思決定、学習、振り返りに再利用するための知識基盤である。

Version10では、外部情報の自動収集やAIによる自動要約を完成させることを目指さない。

まずは、External Brainの中心となるEntity、UseCase、永続化、CLI、API、Bridge、検索・一覧の境界を確立する。

---

## 2. Version10の中心原則

### 2.1 Systemは情報の正しさを断定しない

Systemは、保存された外部情報が真実であると保証してはならない。

Systemが保持するのは、「この出典に、このような情報が記載されていた」という記録である。

Systemは、外部情報をOwner自身の確定的な知識や事実と混同してはならない。

### 2.2 出典を失った情報を原則として作らない

External Brainに登録する情報には、可能な限り出典を保持する。

出典はURLに限らない。以下を出典として扱える設計とする：Webページ、新聞記事、書籍、論文、動画、SNS投稿、講義、会話、PDF、メール、Ownerが直接観察した事実、その他の情報源。

出典が不明な場合も登録を禁止する必要はないが、出典不明であることを明示できなければならない。

### 2.3 原文とOwnerの解釈を分離する

外部情報そのものと、Ownerによる解釈・感想・評価を同一のフィールドに混在させない。

最低限、以下を区別すること：外部情報の内容、Ownerによる要約、Ownerによるコメント、ARC等による提案または分析。

ARCやSystemによって生成された内容を、出典の原文やOwner自身の意見として保存してはならない。

### 2.4 自動取得より、確実に保存・検索できることを優先する

Version10では、外部サイトのクロール、ブラウザ拡張、RSS連携、メール自動取得等を必須としない。

入力経路を増やすことよりも、登録された情報が以下を満たすことを優先する：出典が分かる、後から探せる、重複や更新関係を判断できる、Ownerの関心や利用目的が分かる、Bridge/APIから扱える。

### 2.5 External BrainはMemoryEntryと分離する

External Brainの情報は、既存のMemoryEntryとは別Entityとする。

理由：MemoryEntryは時間に紐づかない長期知識である／External Brainは外部出典に基づく情報である／外部情報は後日訂正・更新・反証される可能性がある／出典、取得日時、信頼性等のメタデータが必要である／Owner自身についての長期知識と、外部世界についての資料は性質が異なる。

External BrainからMemoryEntryへ内容を移す、または昇格させる機能は、Version10では実装しない。将来Versionの検討事項とする。

---

## 3. Version10で実装するもの

### 3.1 ExternalSource Entity

外部情報の出典を表すEntityを追加する。名称は既存コードとの整合を確認した上で決定してよいが、本指示書では仮にExternalSourceと呼ぶ。

```
type ExternalSourceType =
  | "web" | "book" | "paper" | "video" | "social" | "news"
  | "lecture" | "conversation" | "document" | "email"
  | "observation" | "other";

interface ExternalSource {
  id: string;
  sourceType: ExternalSourceType;
  title: string;
  author?: string;
  publisher?: string;
  url?: string;
  publishedAt?: string;
  accessedAt?: string;
  identifier?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

注意事項：urlは任意とする／URLがない情報源を排除しない／publishedAtとaccessedAtを区別する／書籍のISBN、論文のDOI等をidentifierに保存できるようにする／sourceTypeは表示上の利便性のための分類であり、情報の信頼性を自動決定するものではない／titleが不明な出典について、空文字を許容するか「Untitled」等を用いるかは、Domain上の不変条件として検討しADRに記録する。

### 3.2 ExternalKnowledge Entity

外部出典から得た、再利用対象となる知識・情報を表すEntityを追加する。本指示書では仮にExternalKnowledgeと呼ぶ。

```
type ExternalKnowledgeStatus = "inbox" | "reviewed" | "archived";
type ExternalKnowledgeConfidence = "unassessed" | "low" | "medium" | "high";

interface ExternalKnowledge {
  id: string;
  sourceId?: string;
  title: string;
  content: string;
  ownerSummary?: string;
  ownerComment?: string;
  topics: string[];
  tags: string[];
  purpose?: string;
  confidence: ExternalKnowledgeConfidence;
  status: ExternalKnowledgeStatus;
  capturedAt: string;
  occurredAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

各フィールドの意味：sourceId（ExternalSourceとの関連、出典不明の場合は任意）／title（後から識別するための短い題名）／content（保存対象となる外部情報、原文引用・Ownerによる手入力・事実のメモ等）／ownerSummary（Owner自身の言葉による要約）／ownerComment（Ownerの感想、評価、疑問、今後の使い道）／topics（法律、学習、健康、経済等の比較的広い主題）／tags（自由度の高い検索用ラベル）／purpose（なぜ保存したのか）／confidence（Ownerが付ける暫定的な信頼度、Systemが自動決定してはならない）／status（inbox: 未整理、reviewed: Ownerが確認済み、archived: 通常の一覧から外したいもの）／capturedAt（Project ARCに取り込んだ日時）／occurredAt（情報が対象とする出来事の日時、ニュース等で取得日と出来事の日が異なる場合に使用する）。

### 3.3 ExternalSource Repository

save / findById / findAll / update / delete。必要に応じてfindByUrl / findByIdentifier / findRecentを追加してよい。将来を予測した過剰な抽象化は避けること。

### 3.4 ExternalKnowledge Repository

save / findById / findAll / update / delete / findRecent。検索機能の設計に応じてsearch / findBySourceId / findByStatus / findByTopic / findByTagを追加してよい。JSONファイルの全件読み込みをRepositoryの外側で繰り返す設計にならないよう注意すること。

### 3.5 UseCase

ExternalSource: AddExternalSourceUseCase / ListExternalSourcesUseCase / GetExternalSourceUseCase / UpdateExternalSourceUseCase / DeleteExternalSourceUseCase

ExternalKnowledge: AddExternalKnowledgeUseCase / ListExternalKnowledgeUseCase / GetExternalKnowledgeUseCase / UpdateExternalKnowledgeUseCase / DeleteExternalKnowledgeUseCase / SearchExternalKnowledgeUseCase

既存の命名規則と異なる場合は、既存規則を優先する。

---

## 4. 検索機能

### 4.1 Version10での検索対象

External Brain専用の検索を実装する。検索対象：ExternalKnowledge.title / content / ownerSummary / ownerComment / topics / tags / purpose、関連するExternalSource.title / author / publisher / url / identifier。

### 4.2 既存pnpm findとの関係

既存のpnpm findはADR 0005に基づき、MemoryとLife Inventoryを対象としている。Version10では次のいずれかを選択しADRに記録すること。

案A：External Brain専用コマンドを作る（例：`pnpm external -- search "検索語"`）
案B：既存pnpm findを拡張する（既存ADR 0005との整合を明示的に検討）

本指示書としては、責務境界を保つため、Version10では案Aを推奨する。将来、統合Query Layerを設ける場合に、Memory・Inventory・External Brain等を横断する検索を別途実装する。

### 4.3 検索の範囲

高度な意味検索、ベクトル検索、埋め込み生成は実装しない。大文字・小文字を区別しない／日本語を検索できる／複数フィールドを横断する／検索結果に一致理由を表示できることが望ましい／空の検索語を全件表示として扱うかエラーにするかを決める／statusによる絞り込みができることが望ましい。検索アルゴリズムは単純な文字列一致でよい。

---

## 5. CLI

### 5.1 CLIコマンド

コマンド名は既存pnpmコマンドとの衝突を確認すること。

仮の構成：`pnpm external -- add / list / show <id> / update <id> / delete <id> / search <query> / review <id> / archive <id>`

出典管理：一体型（ExternalKnowledge追加時に出典を同時入力）または分離型（pnpm source -- add/list/show/update/delete、その後ExternalKnowledge作成時にsourceIdを指定）。

Version10では、Ownerが日常利用しやすいことを優先し、一体型の入力UXを用意することを推奨する。ただしDomain/Application層ではExternalSourceとExternalKnowledgeを分離する。

### 5.2 対話式入力

日本語IMEによる全角数字／非TTY標準入力／readline/promisesによる入力取りこぼし／pnpm組み込みコマンドとの名前衝突／optional入力の空文字処理／配列入力の区切り文字／日付フォーマット／URL未入力／長文入力、を考慮すること。Version6以降で確立した擬似expectドライバ等の方法を使用し、実機または実機相当の対話テストを行うこと。

### 5.3 一覧表示

最低限、ID（または短縮ID）、title、status、sourceType、source title、topicsまたはtags、capturedAtを表示する。長文のcontentを一覧ですべて表示しない。showで詳細を表示する。

---

## 6. ARC Connector

最低限、以下のHTTP APIを追加する。

```
GET    /external-knowledge
GET    /external-knowledge/:id
POST   /external-knowledge
PATCH  /external-knowledge/:id
DELETE /external-knowledge/:id
GET    /external-knowledge/search?q=...

GET    /external-sources
GET    /external-sources/:id
POST   /external-sources
PATCH  /external-sources/:id
DELETE /external-sources/:id
```

既存APIの設計規則と異なる場合は既存規則を優先する。

APIに関する制約：Node標準httpのみというADR 0008の方針を維持する／Version10では認証を必須としない／引き続き127.0.0.1のみで待ち受ける／リモート公開しない／入力値検証を行う／不正なJSON、存在しないID、必須項目不足等に適切なエラーを返す／Domain/Application層を経由せずRepositoryを直接操作しない。

---

## 7. Bridge Layer

既存Bridge Layerに以下のtypeを追加する（仮のtype名）：`externalSource` / `externalKnowledge`

Import：ExternalSource単体を登録できる／ExternalKnowledge単体を登録できる／ExternalKnowledgeとExternalSourceを一括で渡せる形式を検討する／一括形式を採用する場合も、内部では既存UseCaseへ委譲する／部分成功を許容するADR 0010の方針を維持する／ExternalKnowledgeが参照するsourceIdが存在しない場合の挙動を決める／一括登録時のID解決方法をADRに記録する。

Export：External Brainの情報をBridge経由で出力できるようにする。最低限、status／capturedAtの期間／topic／tag／sourceType／件数上限の絞り込みを検討する。Version9で指摘されたExportサイズ無制限の技術的負債を悪化させないこと。Version10では全件Exportを禁止する必要はないが、件数上限または明示的な--all等の安全策を設けることを検討する。

---

## 8. Timelineとの関係

ExternalKnowledgeを既存Timelineに含めるかを検討し、ADRに記録すること。

本指示書では、以下の理由からTimelineへ含めることを推奨する：ExternalKnowledgeにはcapturedAtがある／「いつその情報を知ったか」は人生の時系列として意味がある／学習・ニュース・意思決定の過程を振り返れる／既存Timelineは時間に紐づくLogを横断する機能である。

ただし、Timeline上では長文を表示せず、title / sourceType / source title / topics / capturedAt / statusの要約表示にする。ExternalSource単体はTimelineに含めない（情報源の管理Entityであり、Ownerの行動・認識を直接表す記録ではないため）。

---

## 9. Smart Captureとの関係

Version10では、Smart CaptureからExternalKnowledgeへの提案を追加してよいが必須ではない。実装する場合、Systemが文章を読んで「これはExternalKnowledgeである」と確定して自動登録してはならない。許されるのは、入力受け取り→提案→下書き表示→Owner確認→Owner確定時のみ保存、の流れのみ。Version10の中心目的はExternal Brain本体の確立であるため、Smart Capture対応によってスコープが膨らむ場合は実装を見送ること。

---

## 10. 重複管理

完全な重複排除システムは作らない。ただし最低限、同一URL／同一identifierのExternalSource、同一タイトル・同一出典のExternalKnowledge、ほぼ同一のcontentの重複候補を検出または警告できる設計を検討する。

必須とするのは、同一URLまたは同一identifierのSource登録時の警告である。Systemが自動で統合・上書きしてはならない。重複候補を提示し、Ownerが既存Sourceを利用する／新規Sourceとして登録する／登録を中止する、を選べるようにすることが望ましい。

---

## 11. 更新・訂正・反証への対応

最低限、ExternalKnowledgeを編集・archiveできること。可能であればsupersedesId?/supersededById?、またはrelatedKnowledgeIds?: string[]のフィールド追加も検討する。ただし複雑な知識グラフを作らない。古い情報を無言で上書きして履歴を失う設計は避ける。更新履歴全体の保存はVersion10の必須要件ではないが、将来対応しやすい設計にする。

---

## 12. 信頼性の扱い

confidenceはOwnerが設定する補助的な属性であり、客観的な真偽判定ではない。表示上はunassessed:未評価、low:慎重に扱う、medium:一定の根拠がある、high:Ownerが比較的信頼している、という説明を付けることが望ましい。

Systemは、sourceTypeだけでconfidenceを自動設定する／SNSだからlow論文だからhighと自動断定する／confidenceを「真実である確率」として扱う／confidenceがhighの情報を無条件で正しい事実として出力する、をしてはならない。

---

## 13. データ保存

既定の永続化は既存方針どおりローカルJSONファイル（想定：data/external-sources.json、data/external-knowledge.json）。

必須事項：JSONファイルが存在しない初回起動に対応する／空ファイル・不正JSONへの対応を検討する／書き込み途中の破損をできる限り避ける／ID衝突を防ぐ／日付のシリアライズ形式を統一する／optionalフィールドのundefinedと空文字の扱いを統一する／配列フィールドの重複値を整理する。Supabase版のRepositoryはVersion10の必須要件としない。

---

## 14. Migration

既存データ形式を壊さないこと。Version10追加によって既存JSONファイルのmigrationが不要であることが望ましい。既存Entity、CLI、API、Bridge、Timelineの形式を変更する場合は、既存データとの互換性を確認し、必要ならmigration手順を用意する。特にBridge Exportの既存形式を破壊しないこと。

---

## 15. テスト

Domain（必須項目、不正なstatus/confidence/sourceType、日付形式、空のtitle、tags/topicsの正規化）、Repository（新規保存、一覧取得、ID取得、更新、削除、初回ファイル未作成、空データ、複数件、sourceId関連）、UseCase（Source登録、Knowledge登録、出典なし登録、存在しないsourceId、更新、archive、検索、削除、重複URL警告または検出）、CLI（add/list/show/update/delete/search、日本語入力、optional入力、非TTY入力、長文、全角数字、日付入力、URLなし、存在しないID）、API（正常系、不正JSON、必須項目不足、存在しないID、検索、status絞り込み、Sourceとの関連）、Bridge（Import、Export、複数件、部分成功、不正type、sourceId不整合、件数上限）、Timeline（対象に追加する場合：日付降順、ExternalKnowledgeの表示、archiveの扱い、長文省略、他Logとの混在）を最低限テストする。

---

## 16. 実機確認

以下は自動テストだけでなく、実機または実機相当の環境で確認すること：日本語の記事をExternal Brainへ登録／URLのない書籍情報を登録／出典不明のメモを登録／Owner SummaryとOwner Commentを分けて入力／日本語キーワードで検索／tag、topic、statusで絞り込み／登録内容を更新／archive／Bridge Import／Bridge Export／APIから登録・取得／Timelineへ表示する場合は他Logとの混在確認／同一URLを再登録した場合の挙動確認／pnpmコマンド名の衝突確認／非TTY標準入力での対話処理確認。確認結果はVersion Reportへ記録すること。

---

## 17. ADR

最低限以下の判断についてADRを作成する：

ADR候補1: External BrainをMemoryEntryから分離する理由（記録主体、出典、更新可能性、信頼性、時間性の違いを整理する）
ADR候補2: ExternalSourceとExternalKnowledgeを分離する理由（一つのSourceから複数のKnowledgeを作れること、Source情報の重複を避けること、出典管理と知識管理の責務差を整理する）
ADR候補3: External Brain検索を既存findと分離するか（ADR 0005との関係、将来のQuery Layerの可能性を整理する）
ADR候補4: ExternalKnowledgeをTimelineへ含めるか（Timelineの目的と、取得日時を人生の時系列として扱う意味を整理する）
ADR候補5: Bridge ImportにおけるSourceとKnowledgeの関連解決方法（外部ID、一時ID、登録順序、部分成功時の扱いを整理する）

番号は既存ADRの連番に従うこと。

---

## 18. Version10で実装しないもの

Webサイトの自動クロール、RSS自動取得、Gmail自動取り込み、Google Drive自動取り込み、Notion連携、ブラウザ拡張、PDF本文の自動抽出、OCR、音声文字起こし、AIによる自動要約、AIによる信頼性判定、AIによる自動タグ付け、ベクトル検索、Embedding、RAG、ナレッジグラフ、外部情報からMemoryEntryへの自動昇格、バックグラウンド同期、リモートAPI公開、ARC Connectorの認証、複数ユーザー対応、全更新履歴の保存、著作権判断の自動化。

必要性を発見した場合は、Version Reportの「技術的負債」または「次Version以降の候補」に記録する。

---

## 19. UI・UX上の判断基準

推奨必須項目：title、content。推奨任意項目：source、ownerSummary、ownerComment、topics、tags、purpose、confidence、occurredAt。登録後に更新できることを重視する。入力時にすべてのメタデータを埋めることをOwnerへ強制しない。statusの初期値はinboxとし、後から整理できる設計を推奨する。これにより「まず保存する→後で整理する」という利用フローを成立させる。

---

## 20. 完成の定義

（機能・品質・ドキュメント・確定の4カテゴリ、詳細は本文参照。要約：Entity/Repository/UseCase/CLI/API/Bridge/Timeline/重複検出が揃い、test/typecheck/lint成功・既存機能の回帰なし・実機確認完了・日本語/非TTY確認済み、必要なADR・Version10_Report.md・roadmap.md・dod.md・README.md更新済み、変更がコミットされコミットハッシュが記録されている。）

---

## 21. Version Reportに必ず記録する事項

既存の恒久章に加え：External Brainをどのように定義したか／MemoryEntryと分離した理由／ExternalSourceとExternalKnowledgeを分離した理由／検索対象と検索方式／Timelineとの関係／Bridge/APIとの関係／重複管理の方針／信頼性をどのように扱ったか／実機確認で発見した問題／Version10で意図的に実装しなかったもの／技術的負債／Version11以降への引き継ぎ／10年後のProject ARCへの貢献。

---

## 22. Version11以降への想定引き継ぎ

Web Clip、Document Ingestion、PDF取り込み、Gmail/Google Drive連携、RSS・ニュース取り込み、AIによる要約案の提示、AIによるタグ案の提示、External Knowledge Review、情報の陳腐化チェック、MemoryEntryへの昇格提案、External Knowledge間の関連付け、全Entity横断Query Layer、ベクトル検索、RAG、ARCがExternal Brainを直接参照する接続経路、ARC Connector認証、リモート接続、データ量増加に伴うRepository移行。ただしVersion10実装中に先行実装しないこと。

---

## 23. Claude Codeへの進行指示

Claude Codeは、Ownerへの細かな確認を必要以上に求めず、既存ガバナンス文書・ADR・コードベースを根拠として自律的に実装を進めること。

ただし、以下に該当する場合はOwnerへ確認すること：ARC Constitutionの解釈を変更する場合／既存の最上位原則を修正する場合／既存データを破壊する可能性がある場合／Project ARCの責務範囲を大きく変更する場合／External Brainの意味を本指示書から根本的に変更する場合／Owner自身の情報と外部情報を自動統合する場合／Systemへ自律的な判断権限を与える場合。

技術的な細部については、既存コードとの整合性を優先して判断し、その根拠をADRまたはVersion Reportへ記録すること。

---

## 24. Version10の成功状態

Version10完了時、Ownerは`pnpm external -- add`で記事のタイトル・URL・記事の内容・自分なりの要約・自分の考え・保存した理由・topic・tagを登録できる。後日`pnpm external -- search "会社法 株主総会"`と入力すれば、過去に保存した外部情報と、その出典、Ownerの要約・コメントを見つけられる。またARCは、Bridge LayerまたはARC Connectorを通じて、Ownerが明示的に保存したExternal Brainの情報を取得できる。

これによりProject ARCは、「Ownerの生活を記録するシステム」から、「Ownerが外部世界から得た知識を、出典と文脈を保ったまま蓄積し、将来の判断に再利用できるシステム」へ進化する。これがVersion10「External Brain」の完成状態である。
