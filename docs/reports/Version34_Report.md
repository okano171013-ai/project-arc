# Version34 Report: Program A読み取り専用公開（agent_task_list・development_grant_list）

commit: `39e446a`

## 1. Version概要

Version33で実装したDevelopmentGrant・AgentTaskを、ARCが確認できる
よう`agent_task_list`・`development_grant_list`として公開した。
Owner指示に従い**読み取り専用に限定**し、write操作
（create/claim/heartbeat/状態遷移/pause/resume/revoke）は権限境界・
脅威モデルを再確認した上で別Versionとして扱うことを、
`docs/security/remote-mcp-threat-model.md`7章に明記した。

## 2. 今回実装した機能（理由も含めて説明）

- **Connector**：`listDevelopmentGrants(status?)`・
  `listAgentTasks({status?, relatedVersion?})`（`ConnectorProposal`
  等と同じ、HTTP APIのみを呼ぶ薄いクライアントメソッド）
- **HTTP Route**：`GET /development-grants`（status絞り込み）、
  `GET /agent-tasks`（status・relatedVersion絞り込み）——既存の
  `GET /agent-delegation-grants`と同型
- **MCP Tool**：`development_grant_list`・`agent_task_list`
  （ADR 0038「薄いアダプタ」方針、`server.ts`・`remoteServer.ts`
  双方が共有する`buildMcpServer()`から自動的に両方へ配線される）
- **Capability Registry**：`MCP_TOOL_NAMES`に2件追加（24→26）、
  `PROJECT_ARC_VERSION`を29→34へ更新（Version28時点のまま放置されて
  いた——今回の変更で初めて気づいた、ARC-PM-010に近い小さな
  document driftだった）

## 3. 実装しなかった機能（延期理由も記載）

- **Write用MCP Tool・HTTP Route**（`agent_task_claim`等）：Owner
  指示により意図的に除外。無認証のまま公開すると、
  `management_feedback_resolve`（3章の既存の発見）と同種の
  「無認証で直接操作できる書き込み経路」を開発プロセス自体に
  持ち込むことになるため、OAuth本番有効化（ARC-PM-001）後に
  別途設計する。
- **DevelopmentGrantの初回発行**：Owner専権事項のまま。今回も
  発行していない（一覧は取得できるが空のまま）。

## 4. Architecture Review

- 変更：`Connector.ts`（型2件・メソッド2件追加）、`http/server.ts`
  （Repository 2件・UseCase 2件・Route 2件追加）、`serializers.ts`
  （2件追加）、`mcp/server.ts`（Tool登録2件追加）、
  `capabilityRegistry.ts`（MCP_TOOL_NAMES・PROJECT_ARC_VERSION更新）
- 新規：`mcp/tools/developmentGrantList.ts`、
  `mcp/tools/agentTaskList.ts`
- 既存のDomain/Application層（Version33で実装）は無変更——今回は
  Adapters/Infrastructure層の配線のみ

## 5. ADR

新規なし。ADR 0060・0061のステータスは引き続きProposed
（Version33 Reportで定めた方針通り、実際のGrant発行・task運用が
始まるまではAccepted化しない）。

## 6. テスト

- `pnpm typecheck` / `pnpm lint`：合格
- `pnpm test`：**573件合格**（Version33時点570件 + 3件新規：
  HTTP Route 2件、Connector 1件）
- **実装中に2件の既存テスト失敗を検出・修正**（7章参照）：
  `remoteServer.test.ts`のツール数ハードコード（24→26）、
  `runnerControlPlane.test.ts`の`PROJECT_ARC_VERSION`ハードコード
  （29→固定値ではなく`capabilityRegistry.ts`からimportする形に修正
  し、次回同じ問題が起きないようにした）
- `server.test.ts`・`remoteServer.test.ts`は`MCP_TOOL_NAMES`を
  動的に参照する設計のため、新Tool追加後も無修正で正しく合格した
  ——Capability Registryを単一の正本にする設計（Version28、ADR
  0055）の効果が今回実際に確認できた。
- HTTP Route・Connectorの新規テストは、write経路が無いため
  Repositoryへ直接データを書き込んでから読み取りを検証する形にした
  （既存の`agent-delegation-grants`等のlist routeにはこの種の
  直接テストが無かったため、今回追加した2 routeは既存routeより
  テストが手厚い）。

## 7. 修正したバグ・気づいた既存の不整合

- **`remoteServer.test.ts`のツール数ハードコード**：`toHaveLength(24)`
  ・`toBe(24)`が新Tool追加でそのまま失敗。24→26に修正。
- **`runnerControlPlane.test.ts`の`PROJECT_ARC_VERSION`ハードコード**：
  `toBe(29)`が失敗。単に29→34に直すのではなく、
  `capabilityRegistry.ts`から`PROJECT_ARC_VERSION`をimportして参照
  する形に変更した——次にVersion番号が変わっても、このテストが
  再び失敗することはない（再発防止）。
- **`PROJECT_ARC_VERSION`自体がVersion28のまま放置されていた**：
  Version29〜33のいずれのVersionでもこの定数は更新されていなかった
  ——`capability_registry_get`ツールがChatGPT側に返す`projectVersion`
  が5Version分古いままだった。今回29→34に修正し、更新漏れに
  気づいたが、**この定数を毎Version手動更新する運用は今後も
  抜けうる**（技術的負債として8章に記録）。

## 8. 技術的負債

- `PROJECT_ARC_VERSION`の手動更新忘れが今回発覚した——ビルド時に
  `package.json`や最新ADR番号から自動導出する仕組みがあれば防げる
  （ARC-PM-010「package `0.20.0`とProject Version不一致」と根が
  同じ問題）。次にrelease identity関連の作業をする際にまとめて
  解消したい。
- Write用MCP Tool・HTTP Route（次Version）

## 9. 次Versionへの申し送り（技術的観点から推奨する事項）

- Write操作（claim/heartbeat/状態遷移等）を設計する際は、
  ARC-PM-001（OAuth本番有効化）の完了を前提条件にすること
  （脅威モデル7.2節参照）。
- `PROJECT_ARC_VERSION`の更新を「Version終了チェックリスト」
  （`docs/governance/DEVELOPMENT_RULES.md`）に明示的な項目として
  追加することを検討する。

## 10. POへの提案

ARCが`agent_task_list`・`development_grant_list`を呼べるように
なったことで、次にDevelopmentGrantを発行した後は、ARCが
「今どんな開発taskが進行中か」を会話の中で参照できるようになる。

## 11. CEOへのコメント

今回見つけた`PROJECT_ARC_VERSION`の放置（Version28から5Version分
古いまま）は、機能追加のたびに増える「小さな更新忘れ」が積み重なる
典型例だった。テストがハードコードされた値を検証していたおかげで
機械的に検出できたが、動的参照に直したことで同じ問題の再発は防げた
——「テストが失敗したら値を直すだけでなく、なぜハードコードされて
いたのかを考える」という姿勢が今回活きた。

## 12. ARCへの引き継ぎ

**新しい資産**：`agent_task_list`・`development_grant_list`という、
ARCが直接呼び出せるProgram A関連の新しいMCP Toolが2つ増えた
（現在は空のリストが返る——DevelopmentGrant未発行のため）。

**新しいルール**：読み取り専用公開と書き込み公開は同じVersionで
混在させない、という運用パターンを確立した。今後Program Aの
write操作を実装する際も、このVersion分離を踏襲する。

**新しい思想**：脅威モデル文書（`docs/security/
remote-mcp-threat-model.md`）は、認証まわりの記録に留まらず、
「新しいMCP Toolを公開する前に権限境界を確認する」という、
今後の全てのTool追加に適用できる恒久的なチェックポイントとして
機能し始めた。

**Ownerについて分かったこと**：「読み取り専用に限定し、write操作は
別工程として扱う」という指示は、Version30のOAuth作業で確立した
「無料・可逆・秘密情報なし・本番変更なしの範囲は停止せず進める」
という境界を、新しい機能公開の場面にも一貫して適用したものだった。

## 13. Product Review

**ユーザー体験で改善されたこと**：ARC（ChatGPT）が、Program Aの
状態（今のところ空だが、今後DevelopmentGrantを発行すれば）を
会話の中で確認できるようになった。

**毎日使う理由**：変化なし（Program Aはまだ実運用前）。

**懸念**：読み取り専用のToolが2つ増えたが、DevelopmentGrantが
まだ1件も発行されていないため、実際に何かを確認できるようになる
のはOwnerが初回発行した後になる。

**次Versionで最も価値が高い改善**：Owner確認の機会にDevelopmentGrant
を初めて発行し、Program Aの最初のAgentTaskを1件通しで動かして
みること——設計・実装が机上のまま終わらないようにする。

## 14. 10年後のProject ARCへの貢献

今回の「読み取り専用と書き込みを同じVersionで混在させない」という
分離は、地味だが、Program A・Bのような大きな権限拡張を扱う際の
汎用パターンになる。10年後、Project ARCがさらに多くの自律的な
書き込み経路を持つようになったとしても、「まず見えるようにする、
それから触れるようにする」という段階的な公開の順序が、今回の
Versionの価値として残り続けることを期待する。
