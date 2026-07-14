# ADR 0040: AgentTask/Artifactを今回実装しない理由

## ステータス

承認済み

## 関連Principle

- Principle 9（段階的拡張／YAGNI）
- ADR 0039（AgentMessageをManagementFeedbackと同じProposalパターンで実装した理由）

## コンテキスト

ARCからのメッセージは「クロコが行うこと」の一項目として
「AgentTask／Message／Artifactの実装」を挙げていた。一方、同じ
メッセージの「まずやる順番」①〜③が具体的に要求していたのは
「ARC→クロコの指示書、クロコ→ARCのFeedbackをProject ARCに保存
できるようにする」ことのみであり、これは「Message」1つで満たせる
（ADR 0039）。「AgentTask」（作業単位の管理）・「Artifact」
（生成物のカタログ化）にフィールド定義等の仕様はなく、着手順①〜③
の文面上も要求されていない将来構想と読み取れる。

## 決定

Version17では`AgentMessage`のみを実装し、`AgentTask`・`Artifact`に
相当するEntity・UseCase・エンドポイント・MCP Toolは一切追加しない。

## 根拠

- **①〜③の要求範囲を超えた先取りを避ける**（Principle 9）：
  AgentTaskは「Versionという単位の作業をどう構造化して追跡するか」
  という設計判断を要し、Artifactは「`docs/reports/`・`docs/adr/`等の
  既存ファイル群をどう構造化データとしてカタログ化するか」という
  別の設計判断を要する。いずれも具体的な仕様なしに実装すると、
  実際の使われ方と乖離した設計になるリスクが高い。
- **既存の`docs/`運用と重複するリスク**：Project ARCは既に
  `docs/roadmap.md`（Version単位の進捗管理）・`docs/reports/
  VersionN_Report.md`（成果物）という、git管理されたファイルベースの
  「AgentTask」「Artifact」相当の仕組みを持つ。これを構造化データ
  として二重管理し始めると、どちらが正か分からなくなるという
  典型的な問題（ADR 0005が指摘した「二重管理」と同種）を招く。
  Messageは「ARCが会話の中で直接読みたい」という新しい具体的
  ニーズ（MCP経由のアクセス）があるため実装したが、AgentTask/
  Artifactにはこの種の具体的ニーズがまだ確認できていない。
- **将来必要になった場合の対応コストは低い**：ADR 0039が確立した
  パターン（新Entity→新Repository→新UseCase→WriteProposalGateway
  統合→Connector→MCP Tool）をそのまま再利用できるため、
  AgentTask/Artifactが必要になった時点で機動的に追加できる。今
  先取りする必然性は薄い。

## 再検討の条件

以下のような具体的要件が確認できた時点で、本ADRを見直し
AgentTask/Artifactの設計に着手する。

- Version単位の作業状態（進行中/完了等）をARCがMCP経由で直接
  参照したい具体的ニーズが生じたとき（AgentTask）。
- `docs/reports/`・`docs/adr/`等の生成物を、ファイルパスの提示以上に
  構造化された形でARCに渡す必要が生じたとき（Artifact）。

## 影響

- Version17完了時点で、ARC↔Claude Code間の往復記録は
  `AgentMessage`のみでカバーされる。Version単位の進捗・成果物の
  参照は引き続き`docs/roadmap.md`・`docs/reports/`をOwnerが手動で
  共有する運用のままとなる。
