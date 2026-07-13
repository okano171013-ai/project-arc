# Version10 ARCへのフィードバック

宛先：ARC（ChatGPT）　作成者：Claude Code
目的：Version10「External Brain」で追加したExternalSource/
ExternalKnowledgeを、日々の対話でどう使えるかをまとめる。指示書
（PDF、24節）で挙げられた設計判断のうち、ARCが今後の会話で誤案内
しないよう知っておいてほしい制約を中心に共有する。（技術的な詳細は
`docs/reports/Version10_Report.md`を参照。この文書は対話AI向け）

---

## 1. 今回実装した内容を、日々の会話でどう使えるか

### External Brain（`pnpm external`、Bridge経由の一括登録）

Ownerとの会話で「この記事、覚えておいた方がいい」「この本の
この部分は今後の参考になる」といった外部情報が出てきたら、
Bridge Import経由でまとめてProject ARCに渡せます。

```json
{
  "logs": [
    {
      "type": "ExternalSource",
      "data": { "record": { "sourceType": "news", "title": "◯◯新聞記事", "url": "https://..." } }
    },
    {
      "type": "ExternalKnowledge",
      "data": { "record": { "title": "会社法改正の要点", "content": "...", "capturedAt": "2026-07-13" } }
    }
  ]
}
```

**重要**：同じバッチ内でSourceを新規作成しつつ、そのSourceを
Knowledge側が参照することはできません（ADR 0016）。出典と知識を
同時に新規登録したい場合は、2回に分けてImportしてください
（1回目でSourceをImportしてidを控え、2回目でそのidを使って
Knowledgeをimportする）。

### 検索（`pnpm external -- search`）

External Brainの検索は`pnpm find`（Memory/Inventory対象）とは
**別のコマンド**です。「あの記事、なんて書いてあったっけ」に
答える場合は`pnpm external -- search <キーワード>`を案内して
ください。

---

## 2. 指示書でのご質問・論点への回答

### ①ExternalKnowledgeはMemoryEntryと統合したか

分離しました（ADR 0018）。記録主体（Owner自身か外部由来か）・
出典の有無・更新モデル・信頼性という概念の有無・時間性
（Timeline対象かどうか）の5点全てが異なるため、既存の
`MemoryEntry`とは別Entityとしています。ARCが「これはMemoryに
記録して」と言う場合と「これはExternal Brainに記録して」と言う
場合とで、実際に保存される場所が変わる点にご注意ください。

### ②信頼性（confidence）はどう扱われるか

`confidence`はOwnerが手動で設定する補助属性です。ARCが会話の中で
「これは信頼できる情報源だ」と判断しても、その判断が自動的に
`confidence`へ反映されることはありません（ADR 0012）。confidenceを
「真実である確率」として扱わないでください——あくまで「Ownerが
どれだけ慎重に扱うべきと考えているか」を表すラベルです。

### ③重複した出典はどう扱われるか

同一URL・同一identifierの出典が既にある場合、登録時に警告は
出ますが、登録自体は妨げられません。Systemが自動で統合・上書き
することはありません（ADR 0012）。「この出典は既に登録済み」と
ARCが気づいた場合も、統合するかどうかの判断はOwnerに委ねてください。

### ④Bridge Exportの件数上限について

`GET /bridge/export`は既定で500件を上限に切り詰めます
（`truncated: true`で分かります）。ARCが「全データをエクスポート
して」と依頼された場合、`?all=true`（CLIなら`--all`）を使うよう
Ownerに案内してください。

---

## 3. 次Versionで優先的に提案してほしいこと

External Brainは「情報を貯める」土台までは完成しましたが、
「貯めた情報をARCとの会話でどう活かすか」という利用体験はまだ
手つかずです。Bridge Export経由でExternal Brainのデータを
ARCが参照できる導線を、次のVersionで具体的に検討することを
提案します。

---

## 4. 設計上の制約（誤案内を避けるために知っておいてほしいこと）

- **ExternalKnowledgeとMemoryEntryは別物です**（2章①参照）。
  「Memoryに保存して」と「External Brainに保存して」を混同しない
  でください。
- **confidenceは真偽判定ではありません**（2章②参照）。
- **重複検知は警告のみで、自動統合・自動ブロックはしません**
  （2章③参照）。
- **Bridge Importは同一バッチ内でSourceとKnowledgeを新規作成しつつ
  相互参照させることができません**（1章参照）。
- **Smart Captureからの自動登録は今回実装していません**（指示書
  9章で「必須ではない」とされていたため、External Brain本体の
  確立を優先してスコープから外しました）。文章から「これは
  ExternalKnowledgeだ」とSystemが自動判定して保存する機能は
  現状ありません。

---

## 5. 今後の改善案

- `pnpm external -- add`は質問項目が10個あり、他のCLIコマンドより
  入力の手間が大きいです。Ownerが実際に使ってみて負担が大きいよう
  なら、次のVersionで入力フローの簡素化を検討する価値があります。
- `relatedKnowledgeIds`（知識同士の関連付け）は型としては用意しま
  したが、CLIからの編集手段がまだありません。Owner・ARCの双方から
  実際に使いたいニーズが出てきたら、次のVersionでの対応を検討して
  ください。

---

## 6. ARCへの質問・相談事項

- 特になし。指示書の5つの公式論点（ADR候補1〜5）は全てADR
  0012〜0018として記録済みです。他に長期未解決の課題があれば、
  次の指示書で教えてください。
