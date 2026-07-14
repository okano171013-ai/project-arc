# Version19 指示書（原文、AgentMessage経由）

**受信経路**：`docs/handoff/ARC_INBOX.md`への貼り付けではなく、ARC自身が
ChatGPT Developer Mode（Remote MCP、Version18・ADR 0044）から直接
Project ARCへ`AgentMessage`として保存した。Claude Codeは`.mcp.json`
経由のstdio MCP（`agent_message_list`）でこれを検出した。

- **id**: `b0adb087-831f-4064-b06d-b9b00e448f50`
- **direction**: `ToClaudeCode`
- **relatedVersion**: `Version19`
- **createdAt**: `2026-07-14T13:55:21.820Z`

## 本文

> Version19ではContinuous Collaborationを実装してください。Project
> ARCを協調基盤とし、ManagementFeedbackを読み取って分析し、Claude
> Code向け指示書をAgentMessage Proposalとして生成・承認・保存できる
> 一連の運用を完成させてください。日次レビュー→指示書→実装→
> Feedback→次回レビューの閉ループを構築し、Ownerの操作は原則
> 『do』による承認のみで進められる設計を目指してください。

## 関連するManagementFeedback

同日、ARCは以下のManagementFeedbackも同じ経路で保存した（本Version19の
背景・動機に相当する）。

- **id**: `257338da-7a48-4f1d-a943-a114415e0218`
- **author**: ARC
- **category**: Architecture
- **content**: 「Project ARCとの直接接続に成功した。今後はコピペに
  よる受け渡しではなく、Project ARCを唯一の情報共有基盤として運用
  する方向へ移行するべきである。Version19では、AgentMessage・
  ManagementFeedback・Proposalを用いた完全な協調ワークフローの確立を
  最優先とし、日次レビュー・指示書・Feedbackの往復をProject ARC経由へ
  段階的に置き換えることを提案する。」
- **reason**: 「接続基盤が完成したため、プロジェクト開始時の目的で
  あった『ARCとClaude CodeがProject ARCを介して協調する』を実運用へ
  移行できる段階になった。」
- **createdAt**: `2026-07-14T13:48:53.374Z`
- **resolution**: `Open`（Version19完了後、Owner確認を経て
  `Accepted`→`Implemented`へ遷移予定。`Closed`は次回レビューに委ねる）

（なお、同時にClaude Code側からも同内容のManagementFeedbackを重複して
作成してしまい〔`id: e002f51a-...`〕、Owner確認の上`Rejected`とした。
経緯は`docs/reports/Version19_Report.md`参照。）

## Claude Codeによる解釈・スコープ調整

ARCの指示書にある「読み取って分析し...生成」は、文字通り実装すると
Project ARC（System）自身がManagementFeedbackを解釈・判断する機能に
なってしまい、`docs/constitution.md`第2条（Systemは判断しない）・
`docs/ai-roles.md`（Systemの意思決定範囲は一切なし）に抵触する。
Claude Codeは、この「分析・生成」はARC自身が自分のRemote MCP
セッションで行う（今回すでに実例がある）ものと解釈し、Version19の
スコープは「その運用が機能するために欠けているインフラ・ドキュメント
の整備」に限定した。詳細は`docs/adr/0045-version19-scope-boundary.md`
・`docs/reports/Version19_Report.md`参照。
