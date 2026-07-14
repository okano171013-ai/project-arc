# Version17 ARCへのフィードバック

宛先：ARC（ChatGPT）　作成者：Claude Code
目的：Version17「Agent Collaboration Layer」で追加したAgentMessage・
Claude CodeのMCP接続について、実装内容と設計判断の根拠をまとめる。
今回は具体的仕様がなかったため、Claude Code自身が設計した部分の
説明を含む。（技術的な詳細は`docs/reports/Version17_Report.md`を
参照。この文書は対話AI向け）

---

## 1. 今回実装した内容を、日々の会話でどう使えるか

### AgentMessage：ARC↔Claude Code間の往復記録

`proposal_create`（type: `AgentMessage`）→`proposal_approve`という
既存の流れで、指示書・Feedbackを記録できます。

```
proposal_create({
  type: "AgentMessage",
  target: "Version18の方向性について",
  payload: {
    record: {
      direction: "ToClaudeCode",  // ARC→クロコ の場合
      content: "...",
      relatedVersion: "Version18"  // 任意
    }
  },
  reason: "..."
})
→ Proposalが返る（まだ保存されない）

proposal_approve(上記のProposal)
→ ここで初めて保存される
```

読み取りは`agent_message_list`（`direction`・`relatedVersion`で
絞り込み可能）です。

### Claude CodeのMCP接続

`.mcp.json`をプロジェクトへ追加し、Claude Code自身がVersion16の
MCPサーバーへ接続できる設定にしました（次回Claude Code再起動時に
有効化）。これにより、次回以降のセッションでClaude Code自身が
Project ARCのデータをMCP経由で直接参照できるようになる見込みです。

---

## 2. 指示書への回答（実装したもの・意図的に絞ったもの）

### ①Agent Collaboration Layer：AgentMessageのみ実装しました

「AgentTask／Message／Artifact」のうち、「まずやる順番」①〜③が
具体的に要求していたのは実質的に「Message」（ARC→クロコの指示書・
クロコ→ARCのFeedbackの往復記録）のみと解釈し、`AgentMessage`と
命名して実装しました。

### ②Claude Codeを既存stdio MCPへ接続：実施しました

`.mcp.json`をプロジェクトへ追加しました（Owner承認済み。Claude Code
自身の永続設定変更にあたるため、事前に確認を取っています）。

### ③ARC→クロコ・クロコ→ARCの保存：実装しました

`AgentMessage`のdirectionフィールド（`ToClaudeCode`/`ToARC`）で
両方向を表現します。Version14で確立した「新しいProposal種別を1つ
追加する」パターン（ManagementFeedbackと同型）をそのまま踏襲した
ため、Project ARC本体（Connector・HTTP API・ReadGateway・
WriteProposalGateway）への変更は`ProposalType`に値を1つ追加した
だけに留まりました（ADR 0039）。

### ④AgentTask・Artifact：意図的に見送りました

フィールド定義等の具体的仕様がなく、「まずやる順番」①〜③の文面上も
要求されていなかったため、YAGNIに基づき今回は実装しませんでした
（ADR 0040）。具体的なニーズ（例：Version単位の進捗をMCP経由で
参照したい、生成物をカタログ化したい等）が確認できた時点で、
同じパターンで追加できます。

### ⑤Remote MCP化・ChatGPT接続：実施していません

指示書の「まずやる順番」④以降（Remote MCP化、ChatGPT接続）は
今回のスコープ外としました。費用が発生しうる判断（ホスティング・
ドメイン等）を伴うため、着手前に必ずOwnerへ相談する、というARCの
方針にも合致します。

---

## 3. 次Versionで優先的に提案してほしいこと

- AgentTask・Artifactについて、具体的なユースケース（例：「Version N
  の進捗状況をMCP経由で確認したい」「生成されたADRの一覧をMCP経由で
  取得したい」等）が固まっていれば、次の指示書で教えてください。
  ADR 0040に再検討の条件として記録しています。
- Remote MCP化・ChatGPT接続を進める場合の優先順位・費用面の許容
  範囲について、具体的な方針があれば共有してください。

---

## 4. 設計上の制約（誤案内を避けるために知っておいてほしいこと）

- **AgentMessageの書き込みもOwner承認が必須です**。ARCが
  `proposal_create`でメッセージを組み立てても、Claude Code側で
  `proposal_approve`が呼ばれるまでは何も保存されません（他の
  Proposal種別と同じ制約）。
- **AgentMessageに状態遷移（resolution）はありません**。単純な
  記録であり、ManagementFeedbackのような`Open→Accepted→...`という
  ワークフローは持ちません。
- **`docs/handoff/`のファイルベース運用は継続しています**。
  AgentMessageはこれを置き換えるものではなく、並行して存在します
  （ARCがMCP経由で直接参照できる、という新しい経路が増えた形）。

---

## 5. 今後の改善案

- AgentMessageとdocs/handoff/の二重管理が将来的に負担になる場合は、
  どちらかへの統合を検討する余地があります。

---

## 6. ARCへの質問・相談事項

- 特になし。ADR 0039（AgentMessageをProposalパターンで実装した
  理由）・ADR 0040（AgentTask/Artifactを今回実装しない理由）を
  記録済みです。AgentTask/Artifactの具体的要件、またはVersion18
  以降の方向性があれば、次の指示書で教えてください。
