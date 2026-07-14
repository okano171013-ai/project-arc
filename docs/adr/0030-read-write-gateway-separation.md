# ADR 0030: ReadGatewayとWriteProposalGatewayを分離した理由

## ステータス

承認済み

## 関連Principle

- Constitution第2条（Systemは判断しない）
- `docs/ai-roles.md`（Project ARCの意思決定範囲：一切なし）
- ADR 0026（ConversationGatewayをApplication層へ置く理由）

## コンテキスト

Version14指示書は「ARCがProject ARCを安全に読み、Ownerの承認のもとで
書き込めるようにする」ことを目的とし、`ReadGateway`と
`WriteProposalGateway`という2つの入口を新設するよう指定していた。
1つの`ConversationGatewayUseCase`（Version13）を拡張して読み書き両方を
扱う案も検討しえたが、あえて別UseCase・別層として分離した理由を
記録する。

## 決定

読み取りは`ReadGatewayUseCase`
（`src/application/use-cases/read-gateway/`）、書き込み提案は
`WriteProposalGatewayUseCase`
（`src/application/use-cases/write-proposal-gateway/`）として、
それぞれ独立したUseCaseに分離する。両者とも
`ConversationGatewayUseCase`と同じ「既存UseCaseへ委譲する薄い
ディスパッチャ」という設計（ADR 0026）を踏襲するが、依存する
Repository・呼び出す既存UseCaseの集合が異なるため、1つのクラスに
まとめない。

## 根拠

- **権限の非対称性**：`ai-roles.md`はProject ARC（System）自身の
  意思決定範囲を「一切なし」と定める一方、読み取りと書き込みでは
  Systemが負うリスクの性質が異なる——読み取りは「何を見せるか」の
  範囲制御（`limit`必須）で足りるが、書き込みは「実際にRepositoryの
  状態を変える」不可逆な操作であり、Ownerの明示的承認という追加の
  ゲートが要る。1つのクラスに混在させると、この非対称なリスクが
  コード上でも曖昧になる。
- **依存Repositoryの違い**：`ReadGatewayUseCase`は`GetTimelineUseCase`
  が要求する9個のRepositoryすべてに依存する（Timelineが多数のLogを
  横断するため）。`WriteProposalGatewayUseCase`は書き込み対象となる
  5種類（Reflection/Memory/ExternalKnowledge/Appearance/
  ManagementFeedback）のRepositoryのみに依存する。両者を1クラスに
  まとめると、コンストラクタが読み取り専用の依存と書き込み専用の
  依存を無関係に抱え込み、責務が読み取りづらくなる。
- **将来の接続経路追加への備え**：指示書19章が明記する「将来MCPや
  ChatGPT Actionsへ接続するときにも設計変更を最小限に抑える」
  という要件に対し、読み取り専用の接続（例：ARCが会話中に参照する
  だけ）と書き込みを伴う接続（例：Owner承認UIを介した書き込み）は
  将来的に異なる認証・監査要件を持つ可能性が高い。層を分離しておく
  ことで、片方だけを先に外部公開する、といった段階的な拡張が
  UseCase自体の再設計なしに行える。

## 影響

- `src/infrastructure/http/server.ts`の`buildUseCases()`は
  `readGateway`と`writeProposalGateway`を別々のプロパティとして
  公開する。CLI（`propose.ts`）は`writeProposalGateway`のみを
  組み立てる（読み取りは不要なため）。
- 将来的にARCの会話フロー（`ConversationGatewayUseCase`）へ
  ReadGatewayの機能を統合する提案が出た場合も、既存の
  `RetrieveKnowledgeUseCase`/`DecisionEngineUseCase`同様、
  ReadGatewayUseCase自体を「呼び出すだけ」の形で組み込める。
