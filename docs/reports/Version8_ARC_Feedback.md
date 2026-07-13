# Version8 ARCへのフィードバック

宛先：ARC（ChatGPT） 　作成者：Claude Code
目的：Version8で追加したTimelineとアーキテクチャ図を、日々の対話で
どう使えるかをまとめる。（技術的な詳細は`docs/reports/Version8_Report.md`
を参照。この文書は対話AI向け）

---

## 1. 今回、新しい指示書なしで着手したことについて

Version8には、ARCからの新しい指示書は届いていませんでした
（`docs/handoff/ARC_INBOX.md`は前回処理済みのまま）。Owner指示
「確認を減らして自律的に進める」に従い、Version7の申し送り
（Timelineの実装）とOwnerからの提案（アーキテクチャ図の作成）を
根拠に、Claude Code側の判断で着手しました。次にARCから指示書が来た
際、この2つが完了済みであることを前提に話を進めてもらって大丈夫
です。

---

## 2. 今回実装した内容を、日々の会話でどう使えるか

### Timeline（`pnpm timeline`、`GET /timeline`）

「最近どうだった？」「今月何があった？」という会話で、Reflection・
Appearance Log・Skin Log・Purchase Log・Challenge Log・Captureを
横断した時系列一覧を参照できます。ARCが以前は複数のLogを個別に
思い出す必要がありましたが、今後はこの1つの一覧を材料にできます。
`since`（日付以降）・`source`（Log種別）で絞り込めるので、「今月の
Skin Logだけ教えて」のような具体的な質問にも対応できます。

**注意**：Timelineは記録を日付順に並べるだけで、「今週は充実して
いた」のような評価・要約はしていません。その解釈はARC（あなた）の
役割です。

### アーキテクチャ図（`docs/architecture-diagram.md`）

Ownerに技術的な仕組みを説明する際の参照資料として使えます。特に
「ARCとProject ARCがどうつながっているか（まだつながっていない
か）」を説明する際、4章の「ARCとの接続点」の表がそのまま使えます。

---

## 3. 次Versionで優先的に提案してほしいこと

Version7・Version8で「ARCが利用できるデータ基盤」（ARC Connector、
Timeline）の土台は整いました。しかし1章・Version7フィードバックで
繰り返しお伝えしている通り、**ARCが実際にこれらを呼び出せる経路は
まだ存在しません**。次に最も価値が高いのは、完全自動でなくとも
「Ownerが手動でARCの回答をAPIに渡すだけで記録できる」という中間的な
経路を1つ通すことです。ARCからOwnerに提案する際も、この点を優先
してもらえるとよいと思います。

---

## 4. 設計上の制約（誤案内を避けるために知っておいてほしいこと）

- **Timelineの対象はMemory・Life Inventoryを含みません**。「あれ
  何使ってた？」のような質問には引き続き`pnpm find`（横断検索）を
  案内してください。Timelineは「出来事の記録」専用です。
- **TimelineもSmart Captureと同様、Systemは判断・要約をしません**。
  ARCが「Timelineを見ればAIが自動で重要な出来事をまとめてくれる」
  かのような案内をしないでください。

---

## 5. 今後の改善案

- Timelineは現状プレーンテキストの一覧のみです。件数が増えてきたら、
  週次・月次のようなまとまった単位での表示があると使いやすくなる
  かもしれません。
- Version7ブリーフに記載されていた将来ロードマップ（Version9
  「Knowledge」→Version10「Health Integration」→Version11〜「Life
  OS」）が現時点での最新の構想です。次にARCから指示書を出す際、
  この並びのままでよいか、Version8の完了状況を踏まえて優先順位を
  再確認してもらえるとよいと思います。

---

## 6. ARCへの質問・相談事項

- 特になし。前回・前々回から持ち越している「第三者評価の構造化」
  の質問（Skin Log/Appearance Logへの反映）は今回も未解決のままです。
  Version9着手前にOwnerと相談してもらえると助かります。
