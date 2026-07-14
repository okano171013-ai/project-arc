# ARCからの最新指示書

Owner: ARC（ChatGPT）から新しいVersionのテーマ・指示が来たら、
このファイルの中身をまるごと置き換えてください。次にClaude Codeが
このプロジェクトを開いたとき、このファイルを確認して着手します。

**処理済み**：
- Version7「ARC Connector」（`docs/reports/Version7_Report.md`）
- Version8「Timeline」（`docs/reports/Version8_Report.md`、新しい
  指示書なしでClaude Codeの判断により着手）
- Version9「ARC Bridge」（`docs/reports/Version9_Report.md`、原文は
  `docs/handoff/archive/Version9_ARC_Brief.md`に保管）

**処理済み**：ARCからの「長期ロードマップ2.0」提案は`docs/roadmap.md`
に方向性として記録。「ARC Constitution」はOwner承認により正式採択し
[`docs/constitution.md`](../constitution.md)として新設、
`docs/vision.md`・`docs/principles.md`・README・CLAUDE.mdから相互
参照するよう更新した（原文は
`docs/handoff/archive/2026-07_ARC_Roadmap2_and_Constitution_Proposal.md`
に保管）。

**処理済み**：Version10「External Brain」（`docs/reports/
Version10_Report.md`）。実装指示書はPDFファイル
（`Project ARC Version10 実装指示書.pdf`）として届いた（原文は
`docs/handoff/archive/Version10_ARC_Brief.md`に保管）。

**処理済み**：Version11「Knowledge Retrieval」（`docs/reports/
Version11_Report.md`）。Version10完了報告への応答としてARCから
届いた（原文は`docs/handoff/archive/Version11_ARC_Brief.md`に保管）。

**処理済み**：Version12「Decision Support」（`docs/reports/
Version12_Report.md`）。Version11完了報告への応答としてARCから
届いた（原文は`docs/handoff/archive/Version12_ARC_Brief.md`に保管）。

**処理済み**：Version13「Conversational Integration」（`docs/
reports/Version13_Report.md`）。Version12完了報告への応答として
ARCから届いた（原文は`docs/handoff/archive/Version13_ARC_Brief.md`
に保管）。

**処理済み**：Version14「ARC Integration」（`docs/
reports/Version14_Report.md`）。Owner自身が「ARCが直接POSTする」案を
撤回し、Write Proposal Layer（`ARC → Write Proposal → Owner承認 →
Project ARC`）を新設する方針へ修正した指示書（原文は
`docs/handoff/archive/Version14_ARC_Brief.md`に保管）。

**処理済み**：Version15「Connector Deployment」（`docs/
reports/Version15_Report.md`）。「Project ARCを完成させる。ARCとの
実際の接続を実現する」というテーマで、Infrastructure層に
Connector・API Key認証を追加した指示書（原文は
`docs/handoff/archive/Version15_ARC_Brief.md`に保管）。

**処理済み**：Version16「MCP Integration」（`docs/
reports/Version16_Report.md`）。「ARCが初めてProject ARCを直接
利用する」というテーマで、MCPサーバー（薄いアダプタ、Connectorのみに
依存）と9個のMCP Toolを追加した指示書（原文は
`docs/handoff/archive/Version16_ARC_Brief.md`に保管）。

**処理済み**：Version17「Agent Collaboration Layer」（`docs/
reports/Version17_Report.md`）。ARCとClaude Codeの役割分担を明確化
した上で、ARC↔Claude Code間の指示書・Feedbackの往復記録
（AgentMessage）をProject ARC自身に保存できるようにした指示書
（フィールド定義等の具体仕様はなく、Claude Codeが設計。原文は
`docs/handoff/archive/Version17_ARC_Brief.md`に保管）。

**処理済み**：Version18「Remote MCP Integration」（`docs/
reports/Version18_Report.md`）。「ARCが初めてProject ARCを直接
利用する」というテーマで、Streamable HTTP transportによるRemote MCP
サーバー・OpenAPI 3.x生成（主要エンドポイントのみ）を追加した正式な
指示書。事前調査の結果、ChatGPT Developer Modeの認証方式が指示書の
想定（Bearer認証）と実際の仕様（OAuth 2.0/2.1または認証なし）で
ズレがあることが判明し、Owner確認のもと簡易Bearer認証のみで進めた
（フルOAuth 2.1は見送り。原文は`docs/handoff/archive/
Version18_ARC_Brief.md`に保管）。

**処理済み**：Version19「Continuous Collaboration」（`docs/
reports/Version19_Report.md`）。**このファイルへの貼り付けを経由
せず**、ARC自身がRemote MCP（Version18・ADR 0044）経由で
`AgentMessage`（id `b0adb087-...`、direction: ToClaudeCode）として
直接Project ARCへ保存した初めての指示書（原文は`docs/handoff/
archive/Version19_ARC_Brief.md`に保管）。「ManagementFeedbackを
分析し指示書を生成する」対象をSystem/Claude Codeではなくスコープを
絞り、ARC自身がその作業を担う運用の完成に限定した（ADR 0045）。

次の指示書を待っています。新しい指示が来たら、このファイルの
「ここにARCの指示書を貼り付け」以下を置き換えてください
（またはARCが直接AgentMessageとして送ってくることもあります
——`agent_message_list`も必ず確認すること）。

---

<!-- ここにARCの指示書を貼り付け -->
