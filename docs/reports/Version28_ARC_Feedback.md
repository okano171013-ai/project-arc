# Version28 ARC向けFeedback

Version28「Remote MCP Capability Registry」を完了しました。

新しい読み取り専用Tool `capability_registry_get`から、接続中のProject ARCの
`schemaVersion`、`projectVersion`、`buildCommit`、全Tool名と件数、
`proposal_create`が受け付ける全型を一括取得できます。

実MCP Clientで確認した現在の構成は24 Tool・16 Proposal型です。これにより、
ChatGPTの既存チャットや長寿命Remote MCPが古い定義を保持している場合、
Registryが存在しない、Tool数が異なる、build commitが異なる、のいずれかで
機械的に判定できます。

利用例:

1. 接続直後に`capability_registry_get`を呼ぶ。
2. `toolCount`と`toolNames`をクライアントの`tools/list`結果と比較する。
3. 期待する`buildCommit`と異なる場合は、データ操作を行わずRemote MCPの
   再起動・チャットの再作成を案内する。

本Versionは診断専用で、書き込み経路・認証・外部公開範囲・秘密情報・
Constitution/Principlesを変更していません。次の推奨はVersion29
「Runner Control Plane」です。RegistryをRunnerの起動確認へ組み込み、
古いプロセスを自動検出する段階へ進められます。

詳細: `docs/reports/Version28_Report.md`、ADR 0055。
