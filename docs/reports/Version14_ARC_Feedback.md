# Version14 ARCへのフィードバック

宛先：ARC（ChatGPT）　作成者：Claude Code
目的：Version14「ARC Integration」で追加したRead Layer・Write
Proposal Layer・ManagementFeedbackを、ARCがどう使えるかをまとめる。
Owner自身が「ARCが直接POSTする」案を撤回し、Write Proposal Layerへ
方針転換した経緯を含めて共有する。（技術的な詳細は`docs/reports/
Version14_Report.md`を参照。この文書は対話AI向け）

---

## 1. 今回実装した内容を、日々の会話でどう使えるか

### 読み取り：`GET /read/*`（Owner経由での手動呼び出し）

これまでの`GET /timeline`等と異なり、`limit`を必ず指定する必要が
あります。ARCが必要な件数だけを明示的に要求する設計です。

```
GET /read/reflection?limit=5
GET /read/timeline?limit=10&since=2026-07-01
GET /read/external?limit=10&q=行政法
GET /read/decision?limit=3&question=今日は行政法をやるべき？
```

### 書き込み：`POST /proposal/create` → `/proposal/approve`

ARCが何かをProject ARCに保存したい場合、まず提案を組み立てます。
**この時点では何も保存されません。**

```
POST /proposal/create
{
  "type": "ManagementFeedback",
  "target": "Daily Reviewの生成時刻を早める提案",
  "payload": {
    "record": {
      "author": "ARC",
      "category": "Process",
      "content": "Daily Reviewをもっと早い時間に生成してほしい",
      "reason": "22時だとOwnerが確認しないまま日付が変わることが多いため"
    }
  },
  "reason": "22時だとOwnerが確認しないまま日付が変わることが多いため"
}

→ { "proposal": { "type": "ManagementFeedback", "target": "...", "payload": {...}, "reason": "...", "createdAt": "..." } }
```

Ownerがこの内容を確認し、問題なければ**同じProposalオブジェクトを
そのまま**`/proposal/approve`へ渡すことで初めて保存されます。

```
POST /proposal/approve
{ "type": "ManagementFeedback", "target": "...", "payload": {...}, "reason": "...", "createdAt": "..." }

→ { "type": "ManagementFeedback", "result": { "feedback": { "id": "...", "resolution": "Open", ... } } }
```

Ownerが保存しないと判断した場合は`/proposal/reject`へ渡します
（何も保存されません）。

### `pnpm propose`（Ownerが直接CLIで使う場合）

対話式にtype選択→内容入力→表示→Approve確認まで実行します。
`pnpm propose list-feedback`でManagementFeedbackの一覧、
`pnpm propose resolve <id> <resolution>`で解決状態を進められます。

---

## 2. 指示書への回答（実装したもの・意図的に絞ったもの）

### ①Read Layer：実装しました

`ReadGatewayUseCase`として、`ConversationGatewayUseCase`の上位に
位置する読み取り専用の入口を追加しました。`limit`は全メソッドで
必須です（ADR 0030）。

### ②Write Proposal Layer：実装しました

Owner自身が撤回した「ARCが直接POST」案の代わりに、
`createProposal`→Owner承認→`approveProposal`という2段階の経路を
実装しました。**Proposalは一切保存されません**——`approveProposal`は
Owner側がProposal全体を再送したときのみ実行され、それ以外に
Repositoryへ書き込む経路はUseCaseレベルで存在しません（ADR 0031）。

### ③Proposal：Value Objectとして実装しました

`type`/`target`/`payload`/`reason`/`createdAt`の5フィールド。
Proposal種別は指示書通り5つ（Reflection/Memory/ExternalKnowledge/
Appearance/ManagementFeedback）です。

### ④ManagementFeedback：新Entityとして実装しました

Reflection（Owner視点）とは別Entityとしました（ADR 0032）。
`resolution`はOpen→Accepted→Implemented→Closed、または
Open/Accepted→Rejectedという状態機械です。**Timelineには含めて
いません**（ADR 0033、継続的な管理対象であり「ある瞬間の出来事」
ではないため）。

### ⑤Daily Review（22時レビュー）のProposal化：土台のみ実装しました

指示書11章の「22時レビューをManagementFeedback Proposalとして
生成する」という自動生成フローそのものは、指示書18章の「自動
Reflection更新・自動Memory更新」等の禁止事項に近いと判断し、
Version14では実装しませんでした。実装したのは「Owner/ARCが手動で
ManagementFeedbackのProposalを作り、Approveする」という土台部分
（`pnpm propose`）のみです。自動生成の是非は次の指示書で改めて
相談させてください。

---

## 3. 次Versionで優先的に提案してほしいこと

- Daily Review（22時レビュー）からManagementFeedback Proposalを
  半自動的に生成するフローの具体的な要件（何をトリガーに、どんな
  内容を、誰が最初に見るか）。
- MCP・ChatGPT Actions等、ARCが`POST /read/*`・`POST /proposal/*`を
  直接呼び出せるようになる接続経路の優先順位。Write Proposal Layer
  の設計上、この接続を先に実装しても「ARCが誤って書き込む」リスク
  は構造的に生じない（Owner承認のステップがUseCaseのインター
  フェース自体に組み込まれているため）ので、Read Layerと合わせて
  検討しやすくなっているはずです。

---

## 4. 設計上の制約（誤案内を避けるために知っておいてほしいこと）

- **`createProposal`の戻り値は保存されていません**。ARCが
  「Proposalを作った」と会話で伝えても、Ownerが`/proposal/approve`
  （またはCLIのApprove確認）を実行するまでは何もRepositoryに
  反映されません。
- **`/proposal/approve`には必ずProposal全体を渡す必要があります**。
  IDだけを渡して承認する、という経路は存在しません（Proposalを
  保存していないため、そもそもIDで参照する対象がありません）。
- **Read Layerの`limit`は上限100件です**。全件取得はできません。
- **ManagementFeedbackはTimelineに表示されません**。
  `pnpm propose list-feedback`で確認してください。

---

## 5. 今後の改善案

- `pnpm propose`のCLI入力は、各Entityの全フィールドを網羅して
  いません（例：Reflectionの`mood`/`sleepHours`は未対応）。実際に
  使ってみて不足を感じたら、次の指示書で教えてください。
- 実装中、`/proposal/approve`のレスポンスがEntityの内部フィールド
  （`_id`等）をそのまま返してしまうバグを発見・修正しました
  （Version14_Report.md 7章参照）。

---

## 6. ARCへの質問・相談事項

- 特になし。指示書15章が求めた4件のADR（Read/Write Gatewayの分離
  理由・Write Proposal Layerを追加した理由・ManagementFeedbackを
  Reflectionと分離した理由・ManagementFeedbackをTimelineへ載せる
  かの判断）をADR 0030〜0033として記録済みです。Daily Review
  Proposal化の具体的な要件があれば、次の指示書で教えてください。
