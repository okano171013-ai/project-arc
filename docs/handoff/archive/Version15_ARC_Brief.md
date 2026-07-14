以下は、そのままクロコ（Claude Code）へ渡すことを前提にしたVersion15の正式な指示書です。
Project ARC Version15 実装指示書
Version15｜Connector Deployment
キャッチコピー
「Project ARCを完成させる。ARCとの実際の接続を実現する。」
0. Version15の目的
Version14で、

* Read Layer
* Write Proposal Layer
* ManagementFeedback
という安全な読み書きの基盤は完成した。
しかし現在も、

```
Owner
↓

Project ARC

↓

コピー

↓

ARC

```

という手動運用になっている。
Version15では、
Project ARCを
ARCが実際に利用できる状態
へ進める。
ここでいう「接続」とは、
Project ARCが
ARCに依存することではない。
Project ARCは引き続き独立したシステムであり、
ARCはその利用者の一人である。
1. Version15で守る原則
Project ARC Constitution
Principles
ADR
Version14で完成した
Write Proposal Layer
を維持する。
つまり
ARCは
Proposalしか生成しない。
保存を決定するのは
Ownerのみ。
2. Connector Layer
Infrastructure層へ

```
Connector

```

を追加する。
責務

```
ARC

↓

Connector

↓

ReadGateway

↓

WriteProposalGateway

```

Connectorは
Application層へ直接アクセスしない。
HTTP APIのみ利用する。
3. Connector Interface
最低限

```
Read

CreateProposal

ApproveProposal

RejectProposal

```

を扱える。
Connector自身は
Proposalを保存しない。
4. Read API
Version14で追加した

```
GET /read/reflection

GET /read/timeline

GET /read/external

GET /read/decision

```

を
Connector経由で呼び出せること。
5. Proposal API
Version14で追加した

```
POST /proposal/create

POST /proposal/approve

POST /proposal/reject

```

を
Connector経由で利用できること。
6. Authentication
Version15では
簡易認証を追加する。
最低限

```
API Key

```

でよい。
ただし
Application層へ認証コードを書かない。
Infrastructure側のみ。
7. Configuration
Connector設定は

```
connector.config

```

などへ分離する。
ハードコード禁止。
8. Manual Connector
Version15では
MCP
ChatGPT Actions
Claude
Gemini
には依存しない。
代わりに
外部プログラムから呼び出せる
標準HTTP API
として完成させる。
9. Compatibility
将来
MCP
ChatGPT Actions
Claude
Gemini
が
Connectorを呼ぶだけで済む構造にする。
Connector側は
AIを知らない。
10. Proposal Confirmation
Connectorは
Proposalを返すだけ。
Approveは
Owner操作を前提とする。
Connectorが
自動Approveしてはならない。
11. Read Optimization
Connectorは
必要最低限だけ取得する。

```
limit

```

必須。
全件取得禁止。
12. ManagementFeedback
Connectorから

```
list-feedback

resolve

```

を呼べるようにする。
Daily Review運用を想定。
13. ADR
最低限
ADR
ConnectorをApplicationではなくInfrastructureへ置いた理由
ADR
HTTP APIを唯一の接続経路とした理由
ADR
認証をInfrastructureへ閉じ込めた理由
14. テスト
Read
Proposal
Approve
Reject
Authentication
Configuration
ManagementFeedback
limit
15. 実機確認
以下を確認すること。

```
Reflection取得

↓

Proposal生成

↓

Approve

↓

ManagementFeedback保存

↓

Resolve

```

16. Version15で実装しないもの

* MCP
* ChatGPT Actions
* Claude SDK
* Gemini SDK
* OpenAI SDK
* AI API
* 自動Proposal生成
* 自動Approve
* 自動保存
Version15は
接続基盤だけ
を完成させる。
17. 完成条件

* Connector追加
* Connector設定追加
* Read API接続
* Proposal API接続
* API Key認証
* Configuration分離
* ADR追加
* Report追加
* test/typecheck/lint成功
* 実機確認
* コミット
18. Version15終了時
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

標準Connector

```

まで完成する。
この時点で、
Project ARCは
「どのAIとも接続できる」
状態になる。
19. Version16への布石
Version15が完成したら、
ようやく
MCP
ChatGPT Actions
など、
AIごとの接続方式を実装できる。
Version16では
Project ARC側ではなく
各AIとの接続実装を行う。
クロコへの設計メモ（重要）
Version15ではMCPやChatGPT Actionsそのものを実装する必要はありません。
目的は、「AIに依存しない標準的な接続口」を完成させることです。
つまり、

* Project ARCはHTTP APIという安定したインターフェースだけを提供する。
* 将来、ChatGPT・Claude・Geminiなどは、そのインターフェースに接続するアダプタを追加するだけで済む。
この構成にしておけば、AIサービス側の仕様変更があってもProject ARC本体への影響を最小限に抑えられます。
追加で一つ提案
このVersion15については、実装前に**「本当にMCPやChatGPT Actionsから利用可能な設計になっているか」**を調査してから進めることをクロコに依頼することをおすすめします。
理由は、MCPやActionsにはそれぞれ接続方式や認証要件があり、現時点の仕様に合わせてAPI設計を微調整した方が、Version16での手戻りを減らせる可能性が高いからです。
