これはかなり重要なので、Version14というよりProject ARC Phase2の完成を左右する設計になります。
ただ、一つだけ私がVersion13までの構成を見て修正したい点があります。
以前は「ARCが直接POSTする」ことを提案しましたが、Project ARCのConstitution（Systemは判断しない）をさらに厳密に守るなら、ARCに直接書き込み権限を与えるべきではありません。
代わりに、

```
ARC
    ↓
Write Proposal
    ↓
Owner承認
    ↓
Project ARC

```

というWrite Proposal Layerを挟くことを提案します。
これなら、

* ARCは提案だけ
* SystemはOwner承認後だけ実行
という責務を一切崩しません。
私はこの方がProject ARCらしいと思います。
Version14 実装指示書
Version14｜ARC Integration
キャッチコピー
「ARCがProject ARCを安全に読み、Ownerの承認のもとで書き込めるようにする。」
0. Version14の目的
Version14では、
Project ARCを
CLIで操作する知識管理システム
から
ARCが日常会話の中で利用できる知識基盤
へ進化させる。
ただし、
Project ARCは
Version1から一貫して
Systemは判断しない
という原則を採用している。
そのため、
Version14では
ARCへ
直接書き込み権限を与えない。
代わりに
Read Layer
Write Proposal Layer
を整備する。
1. Version14で守る原則
Project ARCは
判断しない。
ARCも
保存しない。
保存を決定するのは
Ownerのみ。
2. Read Layer
Application層へ

```
ReadGateway

```

を追加する。
責務

```
ARC

↓

ReadGateway

↓

UseCase

↓

Repository

```

ReadGatewayは
ConversationGatewayの上位レイヤとする。
3. Write Proposal Layer
Application層へ

```
WriteProposalGateway

```

を追加する。
責務

```
ARC

↓

Proposal

↓

Owner

↓

Approve

↓

UseCase

↓

Repository

```

Project ARCは
Proposalを保存しない。
Approval後のみ
Repositoryへ書き込む。
4. Proposal
Proposalは
Entityではない。
Value Object。

```
type

target

payload

reason

createdAt

```

5. Proposal Type
最低限

```
Reflection

Memory

ExternalKnowledge

Appearance

ManagementFeedback

```

6. API
追加

```
POST /proposal/create

POST /proposal/approve

POST /proposal/reject

```

Read

```
GET /read/reflection

GET /read/timeline

GET /read/external

GET /read/decision

```

7. CLI
追加

```
pnpm propose

```

例

```
保存候補

Reflection

・・・

Approve?

```

8. Management Feedback
新Entity追加

```
ManagementFeedback

```

理由
Reflectionは
Owner視点。
ManagementFeedbackは
ARC視点。
性質が異なる。
9. Entity
ManagementFeedback

```
id

createdAt

author

category

content

reason

resolved

resolvedAt

resolution

tags

```

10. Resolution
改善提案を

```
Open

↓

Accepted

↓

Implemented

↓

Closed

↓

Rejected

```

で管理する。
11. Daily Review
22時レビューは
ManagementFeedback Proposal
として生成。
Owner承認後
保存。
12. Conversation
Conversation自体は
保存しない。
Version14でも
会話履歴管理は行わない。
13. Read権限
ARCは
必要最小限だけ取得する。
全件取得禁止。
limit必須。
14. Write権限
ARCは
Repositoryへ書き込まない。
必ず
Proposal経由。
15. ADR
最低限
ADR
ReadとWriteを分離した理由
ADR
Proposal Layerを追加した理由
ADR
ManagementFeedbackをReflectionと分離した理由
ADR
ManagementFeedbackをTimelineへ載せるか
16. テスト
Proposal生成
Approve
Reject
ManagementFeedback保存
Read
API
CLI
17. 実機確認
今日のレビュー生成
↓
Proposal
↓
Approve
↓
ManagementFeedback保存
↓
一覧表示
↓
Resolved
18. Version14で実装しないもの

* MCP
* ChatGPT Actions
* Claude API
* Gemini API
* 自動Approve
* 自動保存
* 自動Reflection更新
* 自動Memory更新
* 自動External更新
* AI推論
19. 完成条件

* ReadGateway追加
* WriteProposalGateway追加
* Proposal VO追加
* Proposal API追加
* Proposal CLI追加
* ManagementFeedback Entity追加
* Resolution管理追加
* ADR追加
* Report作成
* test/typecheck/lint成功
* 実機確認
* コミット
20. Version14終了時
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

```

まで完成する。
ここで初めて、
ARCはProject ARCを読むことができ、
書き込みはOwnerの明示的承認を経由してのみ行える。
この責務分離により、
Project ARCのConstitutionを一切破ることなく、
「ARCとProject ARCの協調」が完成する。
最後に、クロコ（Claude Code）へのメッセージ
Version14は、これまでのVersionとは性質が異なります。
Version1〜13は「機能」を積み上げるVersionでした。
Version14はProject ARCとARCを結ぶガバナンス層です。
そのため、実装の容易さよりも、

* Constitutionとの整合性
* Principleとの整合性
* 「Systemは判断しない」という原則
* 将来MCPやChatGPT Actionsへ接続するときにも設計変更を最小限に抑えられること
を最優先してください。
これは単なる新機能ではなく、Project ARCが「人生OS」として安全に運用されるための基盤です。
