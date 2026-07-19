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
- **Version24でOAuth 2.1を本番有効化した（ADR 0051）と記録されていたが、
  Version30の監査で実態と食い違うことが判明した**——6章参照。実際には
  本番`.env`・稼働中プロセスは今なお無認証（ADR 0044）のままである。
  ただしOwner本人がOAuthはトンネル公開URLへの到達可能性を狭めるが、
  認証済みセッション内での主体の区別はできない、という限界自体は
  変わらない。

## 6. Version30監査：ADR 0051の記録齟齬とOAuth実装のsecurity review

PM Review（2026-07-19）でARC-PM-001（Remote MCP無認証）がP0として
再指摘されたことを受け、Version30で`LocalOAuthProvider`
（Version22、ADR 0049）・`remoteServer.ts`の配線・関連テストを
再監査した。

### 6.1 ADR 0051の記録齟齬

ADR 0051は「実際の`.env`（`MCP_OAUTH_ENABLED=true`・
`MCP_OAUTH_OWNER_PASSCODE`）で有効化した」と記録していたが、
その直後の`docs/reports/Version25_Report.md`13章は「OAuth本番
有効化というOwner自身の手作業が未完了。Version24からこの障壁が
2Version続けて残っている」と明記しており、Version26〜29のReportにも
「完了した」という記述は見当たらない。`.env`は秘密情報のため
Claude Codeからは内容を確認できないが、複数Versionにまたがる
Report側の一貫した記述を優先し、**本番有効化は実施されていない**
という前提でVersion30を進めた。ADR 0051自体への訂正はADR 0051の
末尾に追記した（本項から相互参照する）。

### 6.2 コードレビュー結果

- `LocalOAuthProvider`：PKCE必須、Passcode比較は`timingSafeEqual`
  でタイミング攻撃を回避、`InvalidTokenError`/`InvalidGrantError`を
  正しく使い分け（`requireBearerAuth`が401を返せる）、リフレッシュ
  トークン交換時のscope拡大を拒否——設計・実装ともに健全と判断した。
- **発見した欠落**：`/authorize/confirm`（Passcode検証を行う、SDK非
  経由の自前POSTルート）にレート制限が一切なかった。ADR 0049は
  「SDKの`authorizationHandler`がIPベースのレート制限をデフォルトで
  適用する」としていたが、これは`/authorize`（GET、SDK配下）のみを
  保護しており、Passcodeを実際に照合する`/authorize/confirm`には
  及ばない。Passcodeが移行手順書の推奨（16文字以上のランダム文字列）
  通りであれば総当たりは現実的に不可能だが、Owner運用の実際の強度に
  依存させないため、固定窓レート制限（`src/infrastructure/security/
  rateLimiter.ts`、既定15分あたり10回まで）を追加した
  （`remoteServer.oauth.test.ts`に否定テストを追加、実際に429を
  返すことを確認済み）。
- `apiKeyAuth.ts`（ARC Connector HTTP API、Version15、別の認証境界）
  は文字列の単純比較（`===`）でありタイミング攻撃に対して
  `LocalOAuthProvider`ほど厳密ではない。ローカル専用APIであり
  実害は限定的なため、Version30のスコープ（Remote MCP OAuth）外の
  観察としてP2で記録するに留め、今回は変更しない。

### 6.3 rate limit・token失効・rollback・復旧手順の確認

| 項目 | 内容 |
|---|---|
| access token失効 | 発行から1時間（`ACCESS_TOKEN_TTL_MS`） |
| refresh token失効 | 発行から30日（`REFRESH_TOKEN_TTL_MS`）。期限切れは使用時に遅延評価 |
| authorization code失効 | 発行から5分（`AUTHORIZATION_CODE_TTL_MS`） |
| `/authorize/confirm`レート制限 | 同一IPから15分あたり10回まで（Version30で追加） |
| 永続化 | なし（インメモリのみ）。プロセス再起動で全クライアント・トークンが失効し、ChatGPT側は`/register`から自動的にやり直す |
| ロールバック | `.env`の`MCP_OAUTH_ENABLED`を`false`に戻し再起動するだけで、ADR 0044の無認証挙動に即座に戻る。データの巻き戻しは不要（`docs/setup/remote-mcp-oauth-migration.md`に既存記載、Version30で再確認・維持） |
| Passcode紛失時の復旧 | `.env`の`MCP_OAUTH_OWNER_PASSCODE`を新しい値に書き換えて再起動するだけでよい——アカウント復旧の概念自体が無い（Owner自身が唯一の認可者のため） |
| 接続不能時（OAuth有効化後にChatGPT接続が壊れた場合） | 上記ロールバック手順で無認証運用に戻し、`docs/setup/chatgpt-mcp-connection.md`の手順でChatGPT Connectorを「認証なし」で作り直す |

以上を`docs/setup/remote-mcp-oauth-migration.md`
（Version30でチェックリスト形式に全面改訂）にまとめた。

## 7. Version34監査：Program A読み取り専用公開（`agent_task_list`・`development_grant_list`）

Owner指示に基づき、`agent_task_list`・`development_grant_list`
（ADR 0060・0061）を**読み取り専用のみ**公開した。着手前に権限境界・
脅威モデルを以下の通り確認した。

### 7.1 公開する情報の性質

- `AgentTask`：task title、acceptance criteria、関連ADR ID、
  対象repository/branch名、claimしたAgent識別子、commit hash、
  test結果summary。**Owner個人の生活データ（Reflection・MealLog等）
  は一切含まない**——Project ARC自身の開発プロセスに関するメタ
  データのみ。
- `DevelopmentGrant`：scope（repositories・branchPrefix）、
  maxVersionCount、reason（Owner記述の委譲理由）。同じく開発
  プロセスのメタデータのみ。

1章の「保護対象」表に、この2つを**読み取り専用・低感度**として追加
する。第三者が無認証Remote MCP経由でこれらを読めた場合の実害は、
「Project ARCがどんな開発taskを進めているかを知られる」程度に
限られ、Owner個人を特定する情報や生活データへは到達しない。

### 7.2 Write操作を意図的に含めなかった理由

`agent_task_claim`・`agent_task_heartbeat`等のwrite用MCP Toolは、
本Versionでは追加していない。理由：

- `AgentTask.claim()`はブランチの所有権を確定させる操作であり、
  無認証のまま公開すると、トンネル公開URLを知る第三者が
  Claude Codeより先に任意のtaskをclaimし、Program Aのbranch
  ownership機構（ADR 0061「1 branch 1 writer」）を悪用して開発を
  妨害できてしまう——3章で発見した`management_feedback_resolve`
  （Write Proposal Layerを経由しない直接書き込み）と同種の
  「無認証で直接操作できる書き込み経路」を、新しい領域
  （開発プロセス自体）に持ち込むことになる。
- `DevelopmentGrant`のcreate/pause/resume/revokeはOwner専権事項
  （ADR 0060）であり、そもそもRemote MCP経由の書き込みに開放する
  設計にしていない。

Write操作を公開する場合は、ARC-PM-001と同じくOAuth本番有効化
（本番`.env`反映、Owner Action）が前提条件になる。無認証のまま
write toolを追加することは、Constitution第1条・第2条の観点からも
本ADR・脅威モデルの観点からも推奨しない——別途、write操作向けの
権限境界を再設計した上で、独立したVersionとして扱う。

### 7.3 結論

読み取り専用公開は、感度の低い開発プロセスメタデータに限られるため、
現状の無認証運用（ADR 0044）のリスク許容範囲内と判断した。ただし
ARC-PM-001（OAuth本番有効化）が完了すれば、この2 Toolも自動的に
認証保護下に入る（`/mcp`エンドポイント全体を保護する設計、5章参照）
——追加の個別対応は不要。

## 8. Version35監査：ARC Mobile Ingress（ローカルMVP）

ADR 0064・0065に基づき、Mobile Ingress（`src/infrastructure/http/
mobileIngress.ts`）・Sync Worker（`pnpm mobile-sync`）のローカルMVP
を実装した。以下、権限境界・脅威モデルを事前に確認した内容を記録
する。

### 8.1 公開範囲：`127.0.0.1`限定、トンネル・外部公開なし

`mobileIngress.ts`は`127.0.0.1`にのみbindする（`remoteServer.ts`と
同じ`node:http`ベースの実装）。**本Versionではngrok/Cloudflare等の
トンネルを一切張らない**——Remote MCP（1〜7章）とは独立した、別の
公開面である。同一マシン・同一Wi-Fi内からのみ到達可能なため、
Remote MCPの脅威モデル（無認証・公開URL漏洩）は本MVPには適用され
ない。将来Activation Gate（ADR 0064）でクラウドへ実際にデプロイする
際は、ADR 0064が要求する`strong auth`（OAuth/passkey等）・TLSを
別途実装し、そのタイミングで本セクションを更新する。

### 8.2 認証を実装しなかった理由（ローカルMVPの範囲内）

`POST /ingress`・`GET /ingress`はいずれも認証を要求しない。理由：

- `127.0.0.1`限定であり、同一マシン上のプロセスまたは同一
  Wi-Fi内の信頼できるデバイス（Owner本人のスマートフォン）からしか
  到達できない。
- 本番相当の認証実装（ADR 0064の`strong auth`要求）を、実際の
  デプロイ先（Cloudflare Workers等）が確定する前に作ると、
  デプロイ先のAuth機構（例：Cloudflare Access、Workers自身の
  検証ロジック）と重複・不整合を起こす可能性がある——認証は
  Activation Gateで実際のプラットフォームに合わせて実装する
  （YAGNI、Principle 9）。

### 8.3 書き込み経路の性質：Systemは判断しない設計を維持

`ReceiveIngressRecordUseCase`は、Owner本人（またはOwnerのスマート
フォン）が明示入力した事実の機械保存のみを行う——受信した内容の
解釈・分類・確定判断は一切行わない（Constitution第2条）。競合時は
`Pending`として保持し、Owner確認（`resolve accept|discard`）を経て
のみCanonicalizeする（Systemが自動で選ばない、ADR 0063・0065）。

### 8.4 データ保持

ローカルMVPでは、Canonicalize後もIngressRecordを削除しない
（`data/ingress-records.json`にAccepted/Canonicalized/Pending/
Failed/Discardedの全件が残る）。本番運用時のretention policy
（Program B文書「最小data、短いretention」要求）は、Activation Gate
で実際のIngress実装（クラウド側）を設計する際に別途定める——
ローカルMVPの`data/ingress-records.json`自体は`pnpm backup`
（ADR 0058）の対象に自動的に含まれるため、データ損失のリスクは
ない。

### 8.5 結論

ローカルMVPは外部への公開面を一切持たないため、Remote MCPの
脅威モデル（1〜7章）とは独立した、リスクの低い開発環境である。
本番デプロイ時は、ADR 0064のActivation Gateで認証・TLS・
retention policyを確定してから、本セクションを全面的に書き直す。
