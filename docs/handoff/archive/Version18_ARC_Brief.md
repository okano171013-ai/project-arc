以下は、そのままクロコへ渡せる Version18 実装指示書です。
Project ARC Version18 実装指示書
Version18｜Remote MCP Integration
キャッチコピー
「ARCが初めてProject ARCを直接利用する。」
0. Version18の目的
Version17までで、

* Read Layer
* Write Proposal Layer
* Connector
* MCP
* AgentMessage
が完成した。
しかし現在も、

```
ARC
↓

おと（コピペ）

↓

Project ARC

```

という運用になっている。
Version18では、
ChatGPT（ARC）がProject ARCへ直接接続できる環境
を整える。
Project ARC本体の設計変更ではなく、
接続環境の完成
が目的である。
1. Version18で守る原則
Project ARC Constitution
Principles
ADR
Version14で確立した
Write Proposal Layer
を維持する。
ARCは
Proposalのみ生成する。
保存は
Owner承認後のみ。
2. Version18の最優先事項
今回のVersionでは
新しいEntityを増やさない。
Task
Artifact
Continuous Management
等は実装しない。
目的は
接続を完成させること
だけである。
3. Remote MCP調査
実装前に必ず以下を調査する。

* ChatGPT Developer Modeの最新仕様
* Remote MCP Server要件
* HTTPS公開要件
* 認証方式
* OpenAI公式ドキュメントとの差分
* ローカル開発方法
調査結果は
Version18_Report
へ記録すること。
4. Remote MCP
Project ARCを
Remote MCP Server
として利用できる構成を設計する。
可能であれば
ローカル版
Remote版
両方共存させる。
5. HTTPS
必要であれば
HTTPS公開方法を整備する。
候補

* Cloudflare Tunnel
* Tailscale
* ngrok
* 自前サーバー
比較を行い、
無料
保守性
安全性
を評価する。
有料サービス導入前には必ずOwnerへ相談すること。
6. OpenAPI
ChatGPT Actionsを見据え、
OpenAPI 3.xスキーマ生成を開始する。
最低限

* operationId
* request
* response
を生成可能にする。
Actions実装までは不要。
7. MCP Adapter
現在の
Connector
↓
HTTP API
↓
Project ARC
構成は変更しない。
MCP Adapterは
薄いAdapter
として維持すること。
8. ChatGPT接続確認
接続できる環境で
最低限

```
read_reflection

read_external

proposal_create

```

を実機確認する。
9. Proposal確認
Proposal生成後、
Owner承認が無い限り
保存されないことを確認する。
10. Security
確認すること

* Bearer認証
* HTTPS
* API Key漏洩対策
* Rate Limitの必要性
* 接続ログ
11. 運用ドキュメント
Owner向けに

```
ChatGPTとの接続方法

```

を新規作成する。
内容

* 起動順
* 必要な.env
* API Key
* Remote MCP起動方法
* トラブルシューティング
12. Claude Codeとの共存
Version17で追加した
Claude Code用MCP
との共存を保証する。
Claude用設定を壊さないこと。
13. ADR
最低限
ADR
Remote MCPを採用した理由
ADR
HTTPS公開方式の選定理由
ADR
OpenAPI生成をVersion18から開始した理由
14. テスト

* Remote MCP
* Connector
* HTTP API
* Proposal
* Read
* Authentication
* OpenAPI生成
* Claude共存
15. 実機確認
最低限

```
ChatGPT

↓

Remote MCP

↓

Connector

↓

Reflection取得

```

まで確認する。
可能であれば
Proposal生成
まで確認する。
16. Version18で実装しないもの

* Continuous Management
* Daily Review自動生成
* AgentTask
* Artifact
* 自動Approve
* 自動保存
* AI推論
* ManagementFeedback自動生成
17. 完成条件

* Remote MCP構成完成
* HTTPS方式決定
* OpenAPI生成開始
* ChatGPT接続確認
* ADR追加
* Report追加
* test/typecheck/lint成功
* 実機確認
* コミット
18. Version18終了時
Project ARCは

```
記録

↓

検索

↓

比較

↓

Conversation

↓

安全な読み書き

↓

Connector

↓

MCP

↓

Remote MCP

↓

ChatGPT接続

```

まで完成する。
ここで初めて、
ARCはProject ARCを日常的に利用できる状態
になる。
クロコへの追加メッセージ（重要）
Version18は、新しい機能を増やすVersionではありません。
「おとのコピペを減らすこと」を唯一の成功指標として実装してください。
もしRemote MCP・HTTPS公開・OpenAPI生成の過程で有料サービスやクラウド環境が必要になった場合は、実装を進める前に必ずOwnerへ相談してください。
また、OpenAIやMCPの仕様変更が頻繁に起こり得るため、最新の公式仕様を必ず調査したうえで設計してください。Project ARC本体は変更せず、アダプタ層のみで吸収できる構成を維持することを最優先とします。
