# ADR 0034: ConnectorをApplicationではなくInfrastructureへ置いた理由

## ステータス

承認済み

## 関連Principle

- `docs/architecture.md`（Clean Architectureの依存方向）
- ADR 0026（ConversationGatewayをApplication層へ置いた理由——対比対象）
- ADR 0030（ReadGatewayとWriteProposalGatewayの分離）

## コンテキスト

Version15指示書2章は「Infrastructure層へConnectorを追加する。
Connectorは Application層へ直接アクセスしない。HTTP APIのみ利用する」
と指定していた。Version13の`ConversationGatewayUseCase`・Version14の
`ReadGatewayUseCase`/`WriteProposalGatewayUseCase`はいずれも
Application層のUseCaseとして実装してきた（ADR 0026・0030）ため、
なぜ`Connector`だけInfrastructure層に置くのか、その配置判断の根拠を
記録する。

## 決定

`Connector`（`src/infrastructure/connector/Connector.ts`）は
Infrastructure層に置き、既存のUseCase（`ReadGatewayUseCase`等）を
一切importしない。Domain層の型（`Proposal`/`Reflection`等）も
importせず、ファイル内で完結するローカル型（`ConnectorProposal`等）
のみを使う。Connectorは`fetch()`でARC Connector HTTP API
（`src/infrastructure/http/server.ts`）を呼び出すだけの、独立した
HTTPクライアントとして実装する。

## 根拠

これまでのGateway群（ConversationGateway・ReadGateway・
WriteProposalGateway）は、いずれも「**同一プロセス内**で複数の
既存UseCaseに委譲する薄いディスパッチャ」という共通の性質を持って
いた（ADR 0026）。CLIとHTTP APIの両方から同一の振る舞いを呼び出す
必要があったため、Application層に置くことでコード重複を避けられた。

`Connector`はこれと性質が根本的に異なる。指示書0章が明記する通り
「Project ARCはARCに依存することではない。ARCはその利用者の一人で
ある」——`Connector`は**別プロセス・別プログラムから見た入口**を
表現するものであり、実際に外部プログラム（将来のMCPサーバー・
ChatGPT Actions等）がこの役割を担う際は、Project ARCのTypeScript
内部実装（UseCase・Repository・Domain Entity）には一切アクセスでき
ず、公開されたHTTP API（JSON）としか対話できない。

`Connector`をApplication層に置いてUseCaseを直接importできる構成に
してしまうと、「HTTPのみを利用する外部クライアント」という設計上の
制約が、コード上では守られていても意味的には嘘になる——将来
Application層の内部構造が変わった際に`Connector`も追従してしまい、
「本当に外部プログラムから見て安定したインターフェースか」を型
レベルで検証できなくなる。Infrastructure層に置き、HTTP経由のみで
実装することで、この制約をコンパイラレベルで強制する。

## 影響

- `Connector`のテスト（`Connector.test.ts`）は、実際に`createApp()`で
  HTTPサーバーを起動し、`fetch`経由で駆動する（UseCaseを直接呼ぶ
  Fakeリポジトリ方式は使わない）——これによりHTTP層を含めた
  end-to-endの動作を検証する。
- 将来Version16でMCPサーバーやChatGPT Actionsアダプタを追加する際も、
  `Connector`と同じ「HTTP APIのみを利用する」制約を踏襲すればよい
  （ADR 0035参照）。
