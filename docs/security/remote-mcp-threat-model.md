# Remote MCP 脅威モデル（Version22）

AgentMessage `e5728efb-...`要件「認証なしの現行Remote MCPにおける
脅威、攻撃経路、保護対象、信頼境界を文書化する」への対応。ADR 0044
（Bearer認証撤回）・ADR 0048（Approval Policy Engine）を前提とし、
その上に残るギャップを具体的に記録する。

## 1. 保護対象

Remote MCPサーバー（`pnpm run mcp:remote`、`src/infrastructure/mcp/
remoteServer.ts`）が公開する11個のMCP Tool（`buildMcpServer()`、
`server.ts`と共有）のうち、以下が実質的な保護対象になる。

| 種別 | Tool | 内容 |
|---|---|---|
| 読み取り | `read_reflection`/`read_timeline`/`read_external`/`read_decision` | Reflection・生活記録全般（Constitution第1条「唯一の人生データベース」） |
| 読み取り | `management_feedback_list`/`agent_message_list`/`approval_decision_list` | ARC↔Claude Code間の運用上のやり取り、承認監査ログ |
| 提案（Owner承認必須） | `proposal_create`/`proposal_approve`/`proposal_reject` | Write Proposal Layer経由。**Owner`do`が実質的な認可**（ADR 0031） |
| **直接書き込み（Owner承認を経由しない）** | `management_feedback_resolve` | 後述2章の中核的な発見 |

## 2. 中核的な発見：`management_feedback_resolve`はWrite Proposal Layerを経由しない

`management_feedback_resolve`（MCP Tool）→`Connector.resolveFeedback()`
→`POST /management-feedback/:id/resolve`→
`ResolveManagementFeedbackUseCase.execute()`
（[`src/application/use-cases/management-feedback/
ResolveManagementFeedback.ts`](../../src/application/use-cases/management-feedback/ResolveManagementFeedback.ts)）
は、`id`と`resolution`を受け取って**即座にRepositoryへ書き込む**。
Write Proposal Layer（`proposal_create`→Owner`do`→`proposal_approve`、
ADR 0031）を一切経由しない。

ADR 0044は「Write系操作はProposal経由なのでOwner承認を経由する。
認証撤廃が広げるリスクは読み取り・Proposal作成の範囲に限られる」と
主張していたが、これは**誤り**だった——`management_feedback_resolve`
は例外であり、Remote MCPが無認証である現状、**トンネルの公開URLを
知る誰でも、Ownerの`do`を一切経由せずManagementFeedbackの
`resolution`（Open/Accepted/Implemented/Closed/Rejected）を書き換え
られる**。実害としては「ARCの運用改善提案の状態が勝手に変わる」
程度に限られ、生活データそのもの（Reflection等）には到達しないが、
「Write系はOwner承認を経由する」という既存の前提が完全ではなかった
という事実は、脅威モデル上重要な訂正である。

## 3. 攻撃者像・攻撃経路

- **攻撃者**：Remote MCPのトンネル公開URL（例：`https://xxxx.ngrok-
  free.dev/mcp`）を知る任意の第三者。認証情報は不要（ADR 0044）。
- **URL漏洩経路**：
  - ターミナル出力・スクリーンショット・画面共有
  - `data/current-tunnel-url.txt`（gitignore対象だがローカルファイル
    として存在）
  - ngrok無料プランの性質上、稀にURLがスキャンサービスに拾われる
    可能性（ngrok公式が完全には否定していない既知のリスク）
  - ブラウザ履歴・ChatGPT Connector設定画面のスクリーンショット
- **常時稼働の性質**：Version20（Collaboration Runner常駐運用、ADR
  0047）により、ログオン中はngrokトンネルがほぼ常時起動している
  ——「検証後に停止する」という当初の運用規律（ADR 0044）は、
  常時運用の導入により実質的に機能しなくなっている。

## 4. 信頼境界

```
┌─────────────────────────────────────────┐
│ 現状（Version21まで）                      │
│                                           │
│  Owner本人 ≡ 公開URLを知る全員              │
│  （信頼度の区別が技術的に存在しない）          │
└─────────────────────────────────────────┘
```

Write Proposal Layer（ADR 0031）とApproval Policy Engine（ADR 0048）
は「Owner本人が`do`を送ったか」を区別する仕組みではなく、「Proposal
全体が再送されたか」という構造的なチェックに過ぎない——再送する
主体がOwner本人かどうかは、Remote MCPが無認証である限り検証できない。
Version21のサーバー側再計算保証（`signals`から`approveProposal`が
毎回再計算する）は「クライアントが表示用フィールドを詐称できない」
ことは保証するが、「そもそもクライアントがOwner本人か」は保証しない
——両者は別の問題である。

## 5. 対応方針（詳細はADR 0049・0051）

- `management_feedback_resolve`は、認証導入後は`requireBearerAuth`で
  保護する対象に含める（`/mcp`エンドポイント全体を保護すれば、
  MCP Tool呼び出し全般がカバーされるため、Tool単位の個別対応は
  不要——JSON-RPCの上位であるHTTPトランスポート層で認可する設計、
  詳細はADR 0049）。
- 認証方式の比較・推奨・ローカル試作はADR 0049・
  [`docs/setup/remote-mcp-oauth-migration.md`](../setup/remote-mcp-oauth-migration.md)参照。
- **Version24でOAuth 2.1を本番有効化した**（ADR 0051）。上記の
  `management_feedback_resolve`を含む全MCP Tool呼び出しは、現在
  `/mcp`エンドポイント全体を保護する`requireBearerAuth`の内側にある
  ——3章で発見した「無認証で直接書き込める」というギャップは実質的に
  閉じた。ただし4章で述べた「クライアントがOwner本人かARC/Claude
  Codeか」を暗号学的に区別できない、という限界は変わらない——
  OAuthはトンネル公開URLへの到達可能性を狭めるが、認証済み
  セッション内での主体の区別はできない。
