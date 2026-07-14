# ADR 0039: AgentMessageをManagementFeedbackと同じProposalパターンで実装した理由

## ステータス

承認済み

## 関連Principle

- Principle 9（段階的拡張／YAGNI）
- ADR 0031（Write Proposal Layerを追加した理由）
- ADR 0032（ManagementFeedbackをReflectionと分離した理由）

## コンテキスト

ARC（ChatGPT）からのメッセージ（`docs/handoff/archive/
Version17_ARC_Brief.md`）は「ARC→クロコの指示書、クロコ→ARCの
FeedbackをProject ARCに保存できるようにする」ことを求め、
「AgentTask／Message／Artifactの実装」を挙げていたが、Version14〜16の
指示書と異なりフィールド定義等の具体的仕様はなかった。Owner確認の
結果、Claude Codeが自ら設計して提案する方針となった（本ADR・
ADR 0040がその設計判断の記録）。

## 決定

ARCの「Message」概念を`AgentMessage`という新Entityとして実装し、
Version14で確立した「新しいProposal種別を1つ追加する」パターン
（`ManagementFeedback`が辿った道）をそのまま踏襲する：

```
AgentMessage（新Entity）
  ↓
AgentMessageRepository（新Port）+ JsonFileAgentMessageRepository（新Adapter）
  ↓
AddAgentMessageUseCase / ListAgentMessagesUseCase（新UseCase）
  ↓
WriteProposalGatewayUseCase（'AgentMessage'をProposalTypeに追加）
  ↓
GET /agent-messages（`GET /management-feedback`と同型のHTTPルート）
  ↓
Connector.listAgentMessages()（`Connector`のメソッド追加のみ）
  ↓
agent_message_list（MCP Tool新規1個。書き込みは既存の
  proposal_create/approve/rejectがtype:'AgentMessage'を
  受け付けるだけで済み、新規ツール不要）
```

新しいアーキテクチャ層・新しい抽象化は一切追加していない。

## 根拠

- **既存パターンの忠実な再利用**：`ManagementFeedback`（Version14）は
  「ARC視点の記録をProposal経由で書き込み、専用の一覧取得APIを持つ」
  という、今回の要求（ARC↔Claude Code間のメッセージ往復）と本質的に
  同じ形をしている。新しい設計を一から考えるのではなく、実績のある
  パターンをなぞることで、実装量を最小化しつつ既存のConstitution
  準拠（Systemは判断しない・Ownerが最終決定する）をそのまま継承
  できる。
- **書き込み経路を増やさない**：`proposal_create`/`approve`/`reject`
  というMCP Tool・HTTPエンドポイントは、`ProposalType`に新しい値を
  追加するだけで新しいデータ種別を扱えるようになる設計（ADR 0031）
  になっていた。これにより、AgentMessageの書き込みに新しいMCP Tool
  を追加する必要が一切なかった——`agent_message_list`（読み取り）
  1個の追加で完結した。
- **具体的仕様の欠如への対応**：フィールド定義がない状態で独自に
  凝った設計をするよりも、既存の確立されたパターンに従うことで、
  「なぜこの設計にしたか」の説明責任を果たしやすい（既存パターンと
  の差分のみを説明すればよい）。

## 影響

- `AgentMessage`は`ManagementFeedback`と異なり`resolution`状態機械を
  持たない（ADR 0040で「今回実装しない」と決めたAgentTask相当の
  機能に近いため、意図的に持たせていない）。
- 将来「AgentTask」（作業単位の管理）を実装する場合も、同じパターン
  （新Entity→新Repository→新UseCase→WriteProposalGateway統合→
  Connector→MCP Tool）を踏襲できる見込み（ADR 0040参照）。
