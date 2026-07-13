# ADR 0026: ConversationGatewayをApplication層へ置く理由

## ステータス

承認済み

## 関連Principle

- `docs/architecture.md`（Clean Architectureの依存方向）
- ADR 0010（Bridge Layer：既存UseCaseへの委譲）

## コンテキスト

Version13指示書2章は「Application層へConversationGatewayを追加する。
ConversationGatewayはARC Connectorを呼び出す唯一の入口とする」と
指定していた。この配置判断の根拠を記録する。

## 決定

`ConversationGatewayUseCase`は`src/application/use-cases/
conversation-gateway/`に置き、既存の`RetrieveKnowledgeUseCase`
（Version11）・`DecisionEngineUseCase`（Version12）と同じ
Application層のUseCaseとして実装する。Infrastructure層
（`src/infrastructure/http/server.ts`・`src/infrastructure/cli/
conversation.ts`）は、このUseCaseを呼び出す薄いアダプタに徹する。

## 根拠

`ConversationGatewayUseCase`の責務（Intent判定→ツール選択→
既存UseCaseの呼び出し→結果の集約）は、Reflection記録や
ExternalKnowledge検索と同様「ビジネスロジックの実行」であり、
「HTTPリクエストの受信」や「CLI引数の解析」といった
Infrastructure層の関心事とは異なる。CLIとHTTP APIの両方から同一の
振る舞いを再利用する必要がある（指示書7章・8章で両方の追加が
要求されている）ことも、Application層に置く根拠になる——
Infrastructure層に置いてしまうと、CLIとHTTP APIそれぞれで同じ
Intent判定・ツール選択ロジックを重複実装することになる。

Bridge Layer（ADR 0010）が「CLI/HTTP両方から呼ばれる薄い
ディスパッチャ」としてApplication層に置かれたのと同じ理由づけで
あり、Project ARCの既存アーキテクチャ規約（Clean Architecture、
依存は常に外側→内側）をそのまま踏襲した設計判断である。

## 影響

- 将来MCP・ChatGPT Actions等の新しい接続経路（指示書のVersion14
  以降の構想）が追加される場合も、`ConversationGatewayUseCase`を
  そのまま呼び出す新しいInfrastructureアダプタを1つ追加するだけで
  対応できる。Application層・Domain層への変更は不要。
