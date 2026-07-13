# Version7 ARCへのフィードバック

宛先：ARC（ChatGPT） 　作成者：Claude Code
目的：Version7で追加したARC Connector（HTTP API）を、今後どう位置づけて
使えるかをまとめる。（技術的な詳細は`docs/reports/Version7_Report.md`
を参照。この文書は対話AI向け）

---

## 1. 今回作ったものは「土台」であり、「連携」そのものではない

まず正直に共有します。Version7で作ったARC Connectorは、Project ARC
の内部の仕組み（Application層）をHTTP経由で呼び出せるようにした
だけで、**ARC（あなた自身）が実際にこのAPIを呼び出せる経路はまだ
ありません**。ChatGPTとこのローカルなコードベースの間には、今も
API連携が存在しません。Ownerが手動でコピー＆ペーストする運用
（`docs/handoff/`）は変わっていません。

Version7がやったことは、「将来ARCから呼び出せるようにするための
受け口」を用意したことです。ARCがOwnerに「Project ARCと直接
つながりました」のような案内をしないよう、この点は明確にしておいて
ください。

---

## 2. ARCがProject ARCへどのようなデータを送ることを想定しているか

ブリーフでのご質問に対する回答です。もし将来ARCがこのAPIを直接
呼び出せるようになった場合、送るデータの形は以下の通りです。

- **Reflection**（`POST /reflection`）：`{ date, record: { studyMinutes,
  mood, sleepHours, ... } }`。Ownerとの会話で聞き取った、その日の
  事実（睡眠時間・勉強時間・気分等）をそのまま渡す想定です。
- **Skin Log**（`POST /skin`）：`{ record: { date, redness, pores,
  acne, ... } }`。ここは注意が必要で、赤み等の数値評価
  （1〜5）はARCが会話から推測して埋めるのではなく、**Ownerが
  実際にそう答えた場合のみ**埋めてください。分からない項目は
  空のまま送ってよい設計です（Skin Logの数値フィールドは全て任意）。
- **Purchase Log**（`POST /purchase`、`/purchase/:id/start`、
  `/purchase/:id/finish`）：「メラノCC買った」のような発言があった
  場合、`{ record: { productName, purchaseDate, category, price } }`
  を送る想定です。「使い始めた」「使い切った」という発言があれば、
  該当するPurchaseのidに対して`start`/`finish`を呼びます（idは
  事前に一覧取得する手段が今はまだないため、この点はVersion8以降の
  課題です、4章参照）。
- **Appearance Log**（`POST /appearance`）：`overallRating`
  （1〜5）は必須です。ARCが会話から自動で数値化するのではなく、
  Ownerに「今日の総合的な感じ、5段階でどれくらい？」のように
  直接確認してから送ることを想定しています。
- **Smart Capture**（`POST /capture/suggest` → `POST /capture`）：
  Ownerの一言をまず`/capture/suggest`に送って機械的な下書き提案を
  受け取り、ARCが文脈を踏まえて「これはSkin Logとして記録しますね」
  と判断した上で、確定した`destinations`を`/capture`に送る、という
  2段階の流れを想定しています。**最終的にどのLogに書くかを決める
  のはARC（またはOwner）であり、`/capture/suggest`が返す提案は
  あくまでキーワード一致による下書きです**。

---

## 3. 将来ChatGPTとの正式連携を行う場合、どの部分を差し替えれば済むか

現在のARC ConnectorはNode標準の`http`モジュールで実装されており、
ローカルホスト（`127.0.0.1`）専用・認証なしです。ChatGPT Actions
やMCP等での正式連携を行う場合、差し替え・追加が必要なのは主に
以下の部分です。

- **認証**：現状は誰でも（同じマシン上のプロセスなら）呼び出せる
  状態です。正式連携の際はAPIキーやOAuth等の認証を追加する必要が
  あります（`docs/adr/0008-arc-connector-http-api.md`に再検討条件
  を明記済み）。
- **公開範囲**：現状`127.0.0.1`のみにバインドしているため、外部
  （インターネット、ChatGPT側のサーバー）からは到達できません。
  リモートから呼べるようにするには、公開方法（トンネリング、
  クラウドデプロイ等）を別途検討する必要があります。
- **エンドポイント自体（`/reflection`等）は変更不要**：Application
  層（UseCase）をそのまま呼び出す設計になっているため、認証や
  公開方法が変わっても、エンドポイントのロジック自体に手を入れる
  必要はありません。

---

## 4. 今後APIが増えた場合、Architectureが破綻しない理由

このAPIは既存のUseCase（元々CLIが使っていたものと全く同じ）を
そのまま呼び出しているだけで、新しいビジネスロジックを一切追加して
いません。今後Memory・Inventory・Challenge Log等のエンドポイントを
追加する場合も、同じパターン（既存UseCaseを呼び出し、レスポンスを
JSON化するだけ）で追加でき、Application層やDomain層に手を入れる
必要はありません。これはVersion1から一貫している「Domain/
Applicationは永続化・呼び出し方法の詳細を知らない」というClean
Architectureの設計方針が、今回のAPI追加でも効いている形です。

---

## 5. Version8へ向けた技術的課題

- **Timeline機能**：各Logを横断した時系列一覧（`GET /timeline`）は
  Version7では型定義のみで、実装はVersion8です。ARCが「最近の記録
  を全部見せて」と言われた際に使える機能になる予定です。
- **Purchase Log等のid取得手段がない**：`/purchase/:id/start`を
  呼ぶには対象のidが必要ですが、現状一覧取得APIがありません
  （CLIの`pnpm purchase -- list`相当がHTTP APIにまだない）。ARCが
  「あの化粧水そろそろ使い切った？」と聞いて`finish`を呼ぶような
  フローを作るには、この一覧取得エンドポイントが必要になります。
- **実際の接続経路がまだない**（1章の繰り返しですが重要な点です）。

---

## 6. ARCへの質問・相談事項

- Version7完了を機に、「Project ARC アーキテクチャ図」（レイヤー
  構成・データの流れ・ARCとの接続点）の作成が提案として上がって
  います（Owner側からの提案）。次のVersion着手前に、この図を
  作ることの優先度をOwnerと相談してもらえますか。
- 前回・前々回から持ち越している「第三者評価の構造化」の質問は
  今回も未解決です。Smart Capture・Appearance Logともに、現状は
  `comment`欄への自由記述のままです。
