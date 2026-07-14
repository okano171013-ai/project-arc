# Version17 Report: Agent Collaboration Layer

`docs/reports/TEMPLATE.md`の14章構成に準拠。

## 1. Version概要

**テーマ**：Agent Collaboration Layer — 「まず無料・ローカルで
Agent Collaboration Layerを実装し、Claude Codeとの往復を成立させる。」
Version16完了報告に対するARCからの応答として届いたメッセージに基づく
（原文は`docs/handoff/archive/Version17_ARC_Brief.md`に保管）。

**指示書の特徴**：これまでのVersion14〜16の指示書と異なり、フィールド
定義等の具体的仕様を伴わないメッセージだった。ARCとClaude Codeの
役割分担（ARCは設計・調査・レビュー・運用判断、Claude Codeは実装・
PC上の設定）を明確化した上で、「AgentTask／Message／Artifactの実装」
という3つの新概念を挙げつつ、直近の「まずやる順番」①〜③では
「ARC→クロコの指示書、クロコ→ARCのFeedbackをProject ARCに保存できる
ようにする」ことのみを具体的に要求していた。Owner確認の結果、
具体的な設計はClaude Codeが行う方針となった。

## 2. 今回実装した機能（理由も含めて説明）

### Claude CodeのMCP接続（`.mcp.json`）

「まずやる順番」②に対応。プロジェクトへ`.mcp.json`を追加し、
Version16で実装済みのstdio MCPサーバーへClaude Code自身を接続する
設定を行った（次回Claude Code再起動時に有効化）。

### AgentMessage（新Entity）

「まずやる順番」③に対応。ARC↔Claude Code間の指示書・Feedbackの
往復記録を表す新Entity。Version14で確立した「新しいProposal種別を
1つ追加する」パターン（`ManagementFeedback`と同型）をそのまま踏襲し、
Entity→Repository→UseCase→WriteProposalGateway統合→HTTPルート→
Connector→MCP Toolという6層すべてに`AgentMessage`を追加した
（ADR 0039）。`resolution`状態機械は持たない（単純な往復記録として
十分、YAGNI）。

書き込みは既存の`proposal_create`/`proposal_approve`/
`proposal_reject`が`type: 'AgentMessage'`を受け付けるだけで済み、
新しいMCP Toolは追加していない。読み取り専用の`agent_message_list`
（`GET /agent-messages`）のみを新規追加した。

### スコープの絞り込み（AgentTask・Artifactの先送り）

ARCが挙げた3概念のうち、「まずやる順番」①〜③の文面上要求されて
いたのは実質的に「Message」のみだったため、`AgentTask`（作業単位の
管理）・`Artifact`（生成物のカタログ化）は今回実装しなかった
（ADR 0040）。

## 3. 実装しなかった機能（延期理由も記載）

- **AgentTask・Artifact**：ADR 0040参照。具体的仕様がなく、指示書の
  直近の要求範囲を超えるため見送った。
- **ChatGPT用のRemote MCP化**（「まずやる順番」④〜⑤）：ARC自身が
  「有料サービスの契約や外部公開前にOwnerへ承認を求める」ことを
  求めており、今回のメッセージは「まずローカルで」に限定していた
  ため対象外。
- **Project ARC本体の変更**：ARCの追加提案（「Project ARC本体には
  極力手を入れない」）に従い、`Connector`・HTTP API・ReadGateway・
  WriteProposalGatewayの既存インターフェースはそのまま維持し、
  `ProposalType`への`'AgentMessage'`追加という最小限の拡張点のみで
  実現した。

## 4. Architecture Review

### 新規Domain

- `src/domain/entities/AgentMessage.ts`（`AgentMessage`/
  `AgentMessageRecord`/`AgentMessageDirection`）
- `src/domain/value-objects/Proposal.ts`（変更）：`ProposalType`に
  `'AgentMessage'`追加

### 新規Application

- `src/application/ports/AgentMessageRepository.ts`
- `src/application/use-cases/agent-message/`
  （`AddAgentMessage.ts`/`ListAgentMessages.ts`）
- `src/application/use-cases/write-proposal-gateway/
  WriteProposalGateway.ts`（変更）：`agentMessageRepository`を
  コンストラクタに追加、`payloadSchemas`・`approveProposal`の
  `switch`に`AgentMessage`ケースを追加

### 新規Adapters

- `src/adapters/repositories/JsonFileAgentMessageRepository.ts`

### 新規/変更Infrastructure

- `src/infrastructure/http/server.ts`（変更）：`buildUseCases()`に
  `agentMessageRepository`・`addAgentMessage`・`listAgentMessages`
  追加、`GET /agent-messages`ルート追加、`serializeApproveResult`に
  `AgentMessage`ケース追加
- `src/infrastructure/connector/Connector.ts`（変更）：
  `ConnectorProposalType`に`'AgentMessage'`追加、
  `listAgentMessages()`メソッド追加
- `src/infrastructure/mcp/tools/agentMessageList.ts`（新規、MCP Tool）
- `src/infrastructure/mcp/tools/proposalSchema.ts`（変更）：
  `PROPOSAL_TYPES`に`'AgentMessage'`追加
- `src/infrastructure/mcp/server.ts`（変更）：
  `registerAgentMessageListTool`の登録追加
- `src/infrastructure/cli/propose.ts`（変更）：`TYPES`に
  `'AgentMessage'`追加、`promptPayload`にケース追加、
  `list-messages`サブコマンド追加
- `src/application/serializers.ts`（変更）：`serializeAgentMessage`
  追加
- `.mcp.json`（新規、プロジェクトルート）：Claude Codeの既存MCP
  サーバーへの接続設定

## 5. ADR（追加・変更したADR、追加しなかった理由）

具体的仕様のない指示に対してClaude Code自身が設計判断を行った
経緯を記録するため、2件を新規作成した。

- **ADR 0039**: AgentMessageをManagementFeedbackと同じProposal
  パターンで実装した理由
- **ADR 0040**: AgentTask/Artifactを今回実装しない理由

## 6. テスト（件数、カバレッジ、typecheck、lint、実機確認）

- `pnpm test`：**246件**全て緑（Version16完了時点238件から8件増加。
  AgentMessage Entity 3件、AddAgentMessage 1件、ListAgentMessages
  1件、WriteProposalGateway（AgentMessageケース追加）1件、
  server.test.ts（GET /agent-messages）1件、mcp/server.test.ts
  （agent_message_list＋ツール数確認）1件）
- `pnpm typecheck`：エラーゼロ
- `pnpm lint`：エラーゼロ
- **実機確認**：3種類の経路すべてで確認した。
  1. 実サブプロセスとして起動した`pnpm run mcp`相当のコマンドを
     実MCP Client（`StdioClientTransport`）経由で駆動し、ツール
     一覧（10個）確認→`proposal_create`（type: AgentMessage）→
     承認前は`agent_message_list`が空であることを確認→
     `proposal_approve`→保存後は1件になることを確認→
     `direction`絞り込み（ToClaudeCode/ToARC）の動作を確認
  2. `GET /agent-messages`をHTTP経由で直接確認（自動テストとして
     server.test.tsに常設）
  3. `pnpm propose`（対話式、擬似expectドライバで駆動）で
     AgentMessage種別のProposal作成→表示→Approve→保存を確認し、
     続けて`pnpm propose list-messages`で一覧表示されることを確認
  - 検証用スクリプト・データは確認後に削除済み

## 7. 修正したバグ（検出方法、原因、対応方法、再発防止）

Version17では新規のロジックバグは発見されなかった。既存の
`WriteProposalGatewayUseCase`・`Connector`・MCP Tool層はいずれも
「新しい種別を1つ追加する」という変更のみであり、Version14〜16で
確立済みのパターンをそのまま適用したため、新規の実装ミスが
生じにくい変更だった。

## 8. 技術的負債（今後改善したい点）

- **AgentMessageとdocs/handoff/の並行運用**：ファイルベースの
  `docs/handoff/`（ARC_INBOX.md・VersionN_ARC_Feedback.md）と、
  データとしての`AgentMessage`が並行して存在する状態になった。
  現時点ではどちらか一方に統合していない——ファイルはOwnerが
  人間として読む用途、AgentMessageはARCがMCP経由で直接参照する
  用途として役割が異なるため意図的に残しているが、将来的に
  重複管理の負担が問題になれば整理を検討する。
- **AgentTask/Artifactの要否は未確定のまま**：ADR 0040で先送りした
  判断であり、次にARCから具体的なニーズが示された時点で再検討が
  必要。

## 9. 次Versionへの申し送り（技術的観点から推奨する事項）

- ARCの当初ロードマップでは次はVersion18（ChatGPT用のRemote MCP化、
  OpenAPI生成、Actions対応）だが、費用が発生しうる意思決定
  （ホスティング・ドメイン・トンネルサービス等）を伴うため、着手前に
  必ずOwnerへ相談すること（ARCの費用に関する注意事項）。
- 将来AgentTask/Artifactを実装する場合、ADR 0039が確立したパターン
  （新Entity→新Repository→新UseCase→WriteProposalGateway統合→
  Connector→MCP Tool）をそのまま踏襲できる見込み。

## 10. POへの提案（提案・懸念点・改善案を自由に記載）

- `.mcp.json`の追加はClaude Code自身の永続設定を変更する操作であり、
  Owner承認を得た上で実施した。次回Claude Codeを再起動した際に
  実際にMCP接続が有効化されるかは、Owner側での確認が必要になる。

## 11. CEOへのコメント（今回の成果、次Versionへの期待）

Version17は、これまでのVersionと異なり、ARCからの指示に具体的な
実装仕様が伴わなかった初めてのケースだった。この状況で、
「Message」という核心的要求のみをスコープに残し、「AgentTask」
「Artifact」という周辺概念を先送りにする判断（ADR 0040）は、
Principle 9（YAGNI）を最も純粋な形で適用した事例になったと考える。
また、既存のProposalパターンを一切変更せずに新しいデータ種別を
追加できたことは、Version14で設計した「ProposalTypeに値を1つ
追加するだけで新しい書き込み経路が生まれる」という拡張性が、
実際に機能することの3度目の実証（ManagementFeedback→前回のMCP
Tool追加→今回のAgentMessage）になった。

## 12. ARCへの引き継ぎ

### 新しい資産

- **AgentMessage**（`agent_message_list`、`GET /agent-messages`、
  `pnpm propose list-messages`）— ARC↔Claude Code間の指示書・
  Feedbackを、Project ARC自身のデータとして記録・参照できるように
  なった。ARCがMCP経由でこの一覧を直接読める（Claude Codeが
  `.mcp.json`経由で接続済み、ChatGPT側はまだ接続していない）。
- **Claude CodeのMCP接続**：`.mcp.json`により、次回Claude Code
  再起動後、このセッション自身がProject ARCのMCP Toolを直接
  呼び出せるようになる見込み。

### 新しいルール

- AgentMessageの書き込みも、他のProposal種別と同じくOwnerの
  明示的な承認（`proposal_approve`の呼び出し）を経由する。ARCが
  指示書を送ったつもりでも、Claude Code側で`proposal_approve`が
  呼ばれるまでは何も保存されない。
- AgentTask・Artifactはまだ存在しない——具体的な必要性が確認できた
  時点で、次の指示書で要求してほしい（ADR 0040）。

### 新しい思想

Version17は、ARCからの指示が「機能の詳細仕様」ではなく「解決すべき
課題」の形で与えられた初めてのケースであり、Claude Codeが
「何を作るべきか」を自ら翻訳する必要があった。これは`docs/
CLAUDE.md`が定める「確認を減らし、自律的に進める」という運用方針が
実際に機能した最初の具体例であり、ARC・Owner・Claude Codeの三者間の
役割分担が、単なる「指示と実行」から「課題と解決策の共同設計」に
一歩近づいたことを示している。

### Ownerについて分かったこと

Version17では、Owner自身がClaude Codeの永続設定変更（`.mcp.json`・
`claude mcp add`相当の操作）について明示的な事前確認を求められ、
それに応じて承認する、というやり取りが発生した（事実ベースの
観察）。これは安全ガイドラインが定める「標準的な設定変更には
明示的な許可が必要」という原則が、実際のセッションで機能した
具体例である。

## 13. Product Review

### ユーザー体験で改善されたこと

Before：ARCとClaude Codeのやり取りは、`docs/handoff/`配下のMarkdown
ファイルをOwnerが手動でコピー＆ペーストする以外の手段がなかった。

After：ARC↔Claude Code間の指示・Feedbackが、Project ARC自身の
データとして残るようになった。将来ARCがMCP経由でこのデータに
直接アクセスできるようになれば、「前回何を頼んだか」をOwnerが
思い出して伝える必要がなくなる可能性がある。

### 毎日使う理由

Version17単体では、Owner自身が毎日触れる体験に直接的な変化はない。
ただし、Claude Code自身のMCP接続が有効化されれば、次回以降の
セッションでClaude CodeがProject ARCのデータ（Reflection・
ExternalKnowledge等）をMCP経由で直接参照できるようになる可能性が
ある。

### 懸念

AgentMessageは現状、CLI/MCP経由で手動で記録する必要があり、
自動的にVersion完了報告と連動しているわけではない。将来的には
Version完了時に自動でAgentMessageのProposalを作る、といった
連携も考えられるが、これは「自動Proposal生成」に近く、指示書が
明示的に禁止する範囲との線引きが必要になる。

### 次Versionで最も価値が高い改善

Claude Code自身のMCP接続が実際に機能することの確認（次回セッション
開始時）。それが確認できれば、Claude Code自身がProject ARCの
データをMCP経由で参照しながら作業する、という新しい開発体験が
初めて実現する。

## 14. 10年後のProject ARCへの貢献

Version17で10年後も効いてくるのは、「具体的仕様のない指示を
受け取った際に、YAGNIに基づいてスコープを絞り込む」という判断
プロセスそのものが、ADRという形で記録として残ったことだと考える。
将来また同様に曖昧な指示（「AgentTask」「Artifact」等）が具体化
した際、ADR 0040に立ち返ることで「なぜあの時点では実装しなかったか」
を追跡でき、後から見て場当たり的な判断ではなく一貫した設計哲学の
延長線上にあることを示せる。

「人生OS」というVisionから逆算すると、Version17はARCとClaude Code
という2つのAIエージェントの協調そのものを、Project ARCのデータ
モデルの一部として扱い始めた最初のVersionである。これまでの
Reflection・Memory・External Brain等はOwnerの人生に関するデータ
だったが、AgentMessageは「Project ARCというシステム自体の開発
プロセスに関するデータ」であり、質的に新しいカテゴリのデータを
Project ARCが扱い始めたことを意味する。この一歩が、将来Project ARC
が単なる記録システムではなく、複数のAIエージェントが協調して
「Ownerの理想の人生に近づく」という目的を追求するプラットフォーム
へと成長していく土台になると考える。
