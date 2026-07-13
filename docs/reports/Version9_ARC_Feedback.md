# Version9 ARCへのフィードバック

宛先：ARC（ChatGPT） 　作成者：Claude Code
目的：Version9で追加したBridge LayerとThird Person Evaluationを、
日々の対話でどう使えるかをまとめる。ブリーフで指定された3点の質問
にも回答する。（技術的な詳細は`docs/reports/Version9_Report.md`を
参照。この文書は対話AI向け）

---

## 1. 今回実装した内容を、日々の会話でどう使えるか

### Bridge Layer（`pnpm bridge -- import/export`）

Ownerとの会話で複数の記録すべき出来事が決まった場合、それぞれを
`{ type, data }`の形にまとめてOwnerに渡せます。例えば「今日は
肌のケアもして、メラノCC買って、赤福も初めて食べた」という会話なら：

```json
{
  "logs": [
    { "type": "SkinLog", "data": { "record": { "date": "2026-07-13", "note": "..." } } },
    { "type": "PurchaseLog", "data": { "record": { "productName": "メラノCC", "purchaseDate": "2026-07-13" } } },
    { "type": "ChallengeLog", "data": { "record": { "date": "2026-07-13", "title": "赤福" } } }
  ]
}
```

Ownerはこれをファイルに保存して`pnpm bridge -- import <ファイル>`
を実行するだけで、3件まとめて記録できます。1件のtypeやフィールドを
間違えても、他の2件はちゃんと記録されます（部分成功）。

### Third Person Evaluation（`pnpm evaluation`）

「いとこにガタイ良くなったと言われた」のような他者からの評価は、
Owner自身の評価（Appearance Log）とは別に記録できます。**重要**：
「誰が言ったか」（`person`）は必ずOwnerに確認してください。ARCが
文脈から推測して埋めることは想定していません（例：「いとこに」と
明示的に言われていない限り、勝手に「いとこ」と埋めない）。

---

## 2. ブリーフでのご質問への回答

### ①Bridge LayerはMCPへ移行しやすいか

はい、しやすい設計にしました。Bridge Layerの実体は
`ImportLogsUseCase`/`ExportLogsUseCase`というApplication層の
UseCaseで、現在はCLIとHTTP APIという2つの薄いアダプタから呼ばれて
います。MCPサーバーを追加する場合も、同じUseCaseを呼ぶMCPツール
定義を1つ追加するだけで済みます。Application層・Domain層への変更は
不要です。

### ②将来ChatGPT連携を追加したとき、差し替える箇所

差し替えが必要なのは主に2箇所です。

- **認証**：現状ARC Connectorはローカルホスト（`127.0.0.1`）のみで
  待ち受けており、誰でも（同じマシン上のプロセスなら）呼び出せます。
  ChatGPT側から実際にリクエストが来るようになったら、APIキーや
  OAuth等の認証を追加する必要があります。
- **公開範囲**：`127.0.0.1`のみのバインドを、外部から到達可能な形
  （トンネリング、クラウドデプロイ等）に変更する必要があります。

エンドポイントのロジック自体（`/bridge/import`等）は変更不要です。

### ③Version10「Health Integration」への準備は整ったか

部分的に整っています。新しい外部データソース（Apple Health等）を
取り込む場合、`BridgeLogType`に新しい種別を1つ追加し、対応する
Entity・UseCaseを作れば、Import/Exportの仕組みにそのまま乗せられ
ます。ただし2点、Version10で追加の検討が必要です。

- **データ量**：Apple Health等は記録件数が非常に多くなりがちです。
  現在のExportは全件をメモリに読み込んで返す設計のため、大量データ
  では性能面の見直しが必要になる可能性があります。
- **認証**：外部サービス（Apple Health等）からのデータ取得自体に
  OAuth等の認証が必要になるはずで、これはBridge Layerとは別に
  検討が必要です。

---

## 3. 次Versionで優先的に提案してほしいこと

Version7〜9で「ARCが利用できるデータ基盤」の土台（ARC Connector、
Timeline、Bridge Layer）は一通り揃いました。次に最も価値が高いのは、
完全自動でなくとも、Bridge Layerを実際に使ってみることです。ARCが
Ownerとの会話をまとめてJSON化し、Ownerがそれを`pnpm bridge --
import`する、という一連の流れが実用的かどうかを試してみることを
提案します。もし「ファイルに保存して実行する」という手間が大きい
ようなら、次のVersionでその摩擦を減らす工夫を検討する価値があります。

---

## 4. 設計上の制約（誤案内を避けるために知っておいてほしいこと）

- **Bridge Layerも「Systemは判断しない」原則の範囲内です**。
  `type`はARC/Ownerが確定済みの値として渡す必要があり、Systemが
  データの中身から`type`を推測することはありません。
- **Captureは Bridge Layerの対象外**です。Import/Exportで
  Capture（Smart Captureの監査記録）を扱うことはできません。
- **Third Person Evaluationの`person`は必須で、テキストから断定
  しません**（1章参照）。

---

## 5. 今後の改善案

- Bridge Layerのエラーメッセージ（例：「Cannot read properties of
  undefined」）はやや技術的です。Ownerが実際に使ってみて分かり
  にくいようなら、次のVersionでより丁寧なメッセージへの変換を検討
  する価値があります。
- Export結果のサイズ制限がまだありません。Version10でHealth
  Integrationのような大量データを扱う場合、この点の見直しが必要に
  なります（2章③と同じ指摘）。

---

## 6. ARCへの質問・相談事項

- 特になし。今回、Version5から持ち越されていた「第三者評価の
  構造化」の課題が正式に決着しました。他に長期未解決の課題があれば、
  次の指示書で教えてください。
