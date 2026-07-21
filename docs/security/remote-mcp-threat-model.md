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

**訂正（Version36）**：8.1の「同一Wi-Fi内からのみ到達可能」は不正確
だった。`127.0.0.1`にbindしたプロセスは同一マシン上のプロセスから
のみ到達可能で、同一Wi-Fi内の他デバイス（スマートフォン等）からは
そもそも到達できない——「同一マシン・同一Wi-Fi」という書き方が、
どちらの状態を指しているか曖昧だった。実際にスマートフォンから
到達させるには9章のLAN bind（opt-in）が必要である。訂正のみで、
Version35時点の実装・結論（認証未実装・低リスク）自体は変更ない。

## 9. Version36監査：Quick Capture UI・LAN公開のopt-in化

### 9.1 追加した公開面：`GET /`（Quick Capture HTML）

`mobileIngress.ts`に`GET /`を追加し、ブラウザから開けるReflection
送信フォーム（外部JS依存なし、`fetch('/ingress')`のみ）を提供する。
新しい書き込み経路は増えていない——既存の`POST /ingress`をブラウザ
から呼び出す薄いUIであり、`ReceiveIngressRecordUseCase`の権限境界
（8.3）はそのまま適用される。実機確認は、グローバルにインストール
済みのPlaywright（プロジェクトの依存関係には追加していない、YAGNI）
で実際のヘッドレスブラウザから一連の送信を行い、`GET /ingress`で
反映を確認した（検証用スクリプト・データは確認後に削除済み）。

### 9.2 `MOBILE_INGRESS_HOST`によるLAN公開のopt-in化

Version35時点では8.1の記述が曖昧だった「同一Wi-Fi内からの到達」を、
Version36で`MOBILE_INGRESS_HOST`環境変数（既定`127.0.0.1`）として
実際に実装可能にした。

- **既定値は無変更**：`.env`を編集しない限り、`127.0.0.1`限定のまま
  Version35と全く同じ公開範囲を維持する。
- **変更した場合のリスク**：`0.0.0.0`等へ変更すると、同一LAN内の
  他デバイス（同じWi-Fiに接続していれば誰でも）が認証なしで
  `POST /ingress`・`GET /ingress`・`GET /`へ到達できるようになる。
  インターネットへの公開ではないが、家庭内の他デバイス・訪問者の
  デバイス等も含まれ得るため、無条件に安全とは言えない。
- **Owner確認事項として明示**：この変更を有効化するかどうかは
  Claude Codeが自律判断せず、`docs/project-management/
  Version35_Decision_Packet.md`（Version36追記）にOwner確認事項として
  記載した。実際にスマートフォンから使うにはこの設定変更が事実上
  必須のため、次のOwner判断のタイミングで扱う。
- **`ARC_API_KEY`・`MCP_OAUTH_ENABLED`と同じopt-in設計方針**：既定で
  最も閉じた状態を保ち、Ownerが明示的に環境変数を変更した場合のみ
  露出範囲が広がる、という既存の設計規約をそのまま踏襲した。

### 9.3 結論

Quick Capture UIの追加は書き込み経路を増やさないため低リスク。
LAN公開のopt-in化は、既定値を変えない限りVersion35時点の脅威モデル
（8章）から変化しない。実際に有効化する場合は、認証なしでLAN内の
任意デバイスから到達可能になる点をOwnerが把握した上で判断すること
（Decision Packet参照）。

**訂正（Version37）**：9.2の「この変更を有効化するかどうかは
Claude Codeが自律判断せず」という記述は、Version36時点では
ドキュメント上の合意に留まっていた——コード上は`MOBILE_INGRESS_HOST`
を変更すれば認証なしでもLAN公開できてしまう状態だった。Owner指示書
（2026-07-20）はこれを明示的に問題視し、Version37で10章の
fail-closed起動ガードにより**構造的に**強制する形へ修正した。

## 10. Version37監査：Mobile Ingressセキュリティ強化（ADR 0066）

### 10.1 Fail-closed起動ガード

`validateExposureConfig(host, apiToken)`（`mobileIngress.ts`）が、
`MOBILE_INGRESS_HOST`を`127.0.0.1`以外へ変更する際に
`MOBILE_INGRESS_API_TOKEN`が未設定だと例外を投げてプロセスを終了
させる。9.2で「Owner確認事項として明示」に留まっていた抑止力を、
「そもそも起動できない」という構造的な強制へ格上げした。実機で
`MOBILE_INGRESS_HOST=0.0.0.0`・token未設定の組み合わせが実際に
起動時エラーで終了することを確認済み。

### 10.2 認証・rate limit・入力上限・監査ログ

ADR 0066参照。`Authorization: Bearer <token>`必須化（設定時のみ）、
1分30リクエスト/IPのrate limit、64KBのbody size上限、
`data/logs/mobile-ingress-audit.log`への監査ログ記録（token値は
記録しない）を実装した。否定テスト（401/413/429、起動ガード）を
`mobileIngress.test.ts`に追加、全て合格。

### 10.3 JSONL Importer（退避中ログ）のセキュリティ姿勢

`ImportPendingLifeLogsUseCase`・`pnpm import-pending-logs`（ADR
0067）は、実データをこのリポジトリ・コミット履歴に一切含めない
設計とした——ファイルパスは実行時にOwnerが指定し、テストは全て
プレースホルダーの合成データのみを使う。未対応type
（RewardSystem等）は自動マッピングせず明示的に報告するため、
誤った推測によるデータ汚染のリスクもない。

### 10.4 Cloud Adapter境界の追加コードなし

ADR 0068の決定により、Cloud Adapter境界は既存の
`IngressRecordRepository`ポートの再利用として整理し、新しい
コード・新しい公開面は追加していない。`cloudflare/`配下は参照専用
ファイルのみで、ビルド・テスト・デプロイのいずれのパイプラインにも
含まれない。

### 10.5 結論

Version37の変更により、LAN公開（`MOBILE_INGRESS_HOST`変更）は
「認証なしで到達可能になる」というリスクから、「認証トークンの
設定が構造的に必須」というリスクへ縮小した。ただし認証方式自体は
単一の共有シークレット（Bearer固定文字列）であり、本番クラウド
デプロイ時にはADR 0064のActivation Gateでより堅牢な認証
（OAuth・TLS等）へ置き換える前提は変わらない。

## 11. Version38監査：Cloudflare Worker実装・Pull/Reconciliation

Owner指示書（2026-07-20、`docs/handoff/archive/
Version38_ARC_Brief.md`）に基づき、`cloudflare/`をreference-onlyから
実装済み（ローカルエミュレータで検証済み、未デプロイ）へ進めた。
ADR 0069参照。

### 11.1 公開範囲：実デプロイ・アカウントなし、Miniflareのみ

`wrangler login`・`wrangler deploy`は一度も実行していない。
`pnpm cloudflare:test`はCloudflareの公式local emulator（Miniflare、
実`workerd`ランタイムをローカルプロセスとして起動）上で検証する
——外部ネットワークアクセス・アカウントは一切不要。実際に
インターネットへ公開されている面は存在しない。

### 11.2 二段階tokenによる最小権限（Owner指示3への対応）

`DEVICE_TOKEN`（スマホ：送信＋自分のstatus確認のみ、payload本体は
返さない）と`PULL_TOKEN`（Owner PC：全件list・ack、payload本体を
含む）を分離した。ローカル版`mobileIngress.ts`の`GET /ingress`にも
同じ最小権限ルール（`idempotencyKey`必須化）を適用した。詳細は
ADR 0069・9.2参照。実機テストで、deviceTokenでは`status=Accepted`の
無制限listが取得できない（400）ことを確認済み。

### 11.3 rate limitの既知の限界

KVベースの固定ウィンドウカウンタは、KVの`get`+`put`が原子的でない
ため高並行下でカウントを取りこぼしうる（実際にテスト中に確認——
35件の並行送信では制限が正確に働かないため、テストは順次送信で
検証している）。個人利用規模の乱用防止としては許容範囲と判断した
——真に正確な制限が必要になった場合はDurable Objectsへの移行を
検討する技術的負債として記録する（ADR 0069）。

### 11.4 監査ログの方式差異

ローカル版はファイル書き込み、cloud版は`console.log`
（Cloudflare Workers Logs）——Workersにはローカルファイルシステムが
ないための方式差異。token値は両方とも記録しない。

### 11.5 Pull/Reconciliationのretention・部分失敗

`POST /ingress/:id/ack`（pull token専用）でローカルへの反映成功後に
cloud側のKVエントリを削除する——cloud queueは一時的なTransportに
過ぎず、肥大化を防ぐ。部分失敗（`failed`／`pulled-ack-failed`）は
明確に区別して報告し、いずれの場合もデータが失われない設計である
ことをテストで確認済み（詳細はADR 0069参照）。

### 11.6 結論

Version38で追加したコード・公開面は、いずれもローカルエミュレータ
検証のみで実際の外部公開を伴わない。将来の実デプロイ時は、本
セクションを実際のCloudflareアカウント・secret・TLS証明書の構成に
合わせて全面的に書き直す必要がある——特にKVベースのrate limitの
限界（11.3）は、実際の公開後にDurable Objects等への移行を検討する
判断材料として残す。

## 12. Version39監査：Cloud Quick Capture UI・CSP・token非埋め込み

Owner指示書（2026-07-20、`docs/handoff/archive/
Version39_ARC_Brief.md`）に基づき、`GET /`にスマホ向けQuick Capture
UIを実装した（ローカル版・cloud版共通、ADR 0070）。本UIは静的HTML
であり、ユーザー入力を反映（reflect）する箇所を持たない
——XSSの主要な攻撃面（反射型・格納型の入力エコー）はそもそも
存在しないが、以下の防御をdefense-in-depthとして追加した。

### 12.1 CSPをper-requestなnonceで強制（`'unsafe-inline'`不使用）

`Content-Security-Policy: default-src 'none'; script-src
'nonce-<random>'; style-src 'nonce-<random>'; connect-src 'self';
base-uri 'none'; form-action 'self'`をGET `/`のレスポンスへ付与した。
nonceはリクエストごとにWeb Crypto（`crypto.getRandomValues`、cloud
版）／`node:crypto`の`randomBytes`（ローカル版）で生成し、`<script
nonce="...">`・`<style nonce="...">`要素にのみ埋め込む——ハード
コードされた固定nonceではないため、レスポンスを事前に取得しても
別リクエストのnonceは推測できない。

**実機のヘッドレスブラウザ検証で判明した仕様上の落とし穴**：nonceは
`<script>`／`<style>`要素自体には効くが、任意要素のinline
`style="..."`**属性**には効かない（CSP仕様上、nonceは要素単位の
許可であり属性単位ではない）。修正前は複数のinline `style`属性が
無音でブロックされていた（コンソールにCSP違反ログが出るのみで、
機能的には見た目が崩れるだけの劣化だったが、意図しないブロックで
あることに変わりはない）。全てCSSクラスへ置き換えて解消した
（ADR 0070 2.3節）。`'unsafe-hashes'`でこの属性を許可する代替案も
あったが、nonce方式より防御力が弱いため見送った。

### 12.2 Token非埋め込み（Owner指示2）

`DEVICE_TOKEN`／`PULL_TOKEN`の値は、HTML・JS・URLクエリ・監査ログの
いずれにも一切埋め込まない——`renderQuickCaptureHtml(nonce)`は
nonce以外の動的値を受け取らない純粋関数であり、token値を知り得ない
設計になっている（構造的に埋め込めない）。既定ではブラウザの
`localStorage`にも保存せず、ページを開くたびに空欄から始まる。
Ownerが明示的に「このデバイスに保存する」へチェックした場合のみ、
危険性の説明を表示した上でopt-inのlocalStorage保存を行う。テストで
`tokenInput`要素のraw HTMLに`value="..."`が存在しないことを確認
済み（`mobileIngress.test.ts`・`worker.test.ts`双方）。

### 12.3 実機ブラウザ検証で発見した機能バグ（セキュリティ上の direct な脆弱性ではないが、フォーム全体を無音でブロックする不具合）

NutritionLog用フィールドの`required`属性が、そのfieldsetが
`display:none`で非表示の間もHTML5ネイティブフォームバリデーション
の対象であり続けたため、Reflection等の**別type選択時に送信ボタンが
無音で機能しなくなる**バグが実機ブラウザ検証（Playwright）で発覚
した。直接`fetch()`を叩くテスト（Version38までの検証方法）では
ネイティブフォームバリデーションを経由しないため発見できなかった
——「実機確認」がHTTPレベルだけでなく、実際のブラウザ操作
（クリック・フォーム送信）を経由する必要があることを示す具体例と
なった。`data-required-when-active`マーカーへ置き換えて修正した
（ADR 0070 2.4節、Version39 Report 7章）。

### 12.4 送信UXとidempotency（Owner指示4）

再送時に同じ`idempotencyKey`を再利用し（確定成功までnullへ戻さない）、
オフライン・サーバーエラー時は入力内容を保持したままフォームを
クリアしないよう実装した。Playwrightの`page.route().abort('failed')`
でネットワーク断を模擬し、再送が同一`idempotencyKey`で行われ
サーバーが`duplicate: true`を返すことを実機確認した。

### 12.5 HTTPS前提（Owner指示3）

Miniflareのローカルテストは平文HTTPで動作する（ブラウザは
`Strict-Transport-Security`ヘッダーを無視する）。実デプロイ後は
Cloudflare edge側の仕様として常時HTTPSが強制されるため、
`Strict-Transport-Security: max-age=63072000; includeSubDomains`を
付与済みで、実デプロイ後にそのまま有効になる。ローカル版
（`mobileIngress.ts`、`node:http`）はHTTP限定のままであり、
このヘッダーは付与していない——ローカル版はLAN内利用が前提
（ADR 0066）であり、HTTPS化は別途検討課題として残る。

### 12.6 結論

Version39で追加したCloud Quick Capture UIは、静的HTML・nonceベース
CSP・token非埋め込み・冪等な再送UXにより、既知の攻撃面
（反射型XSS・token漏洩・重複送信）への対策は実機ブラウザ検証込みで
確認済みである。ただし、ADR 0070が明らかにした通り、これは
「PC停止中でも安全に生活ログを保存・参照できる」という要件全体を
満たすものではなく、cloud ingress受付（段階a）のみをカバーする
——canonical ARCへの確定保存（段階b）・全生活履歴のread
availability（段階c）は引き続きPC起動が前提のままである。

## 13. Version40監査：AgentDelegationGrant scope拡張・保存信頼性契約・
StudySession直接書き込みツール

Owner本人発信のAgentMessage（id `ba6548bc-c550-43a6-b5a1-
7ab4dd4c9889`、Critical）に基づき、Proposal承認フローを迂回できる
範囲を広げた（ADR 0072）。範囲拡大は必ず既存の安全装置と併せて
評価する必要があるため、本章で監査結果を記録する。

### 13.1 AUTO_APPROVABLE_TYPESの拡張・縮小

`Appearance`・`ManagementFeedback`を追加、`FinanceLog`を除外した
（ADR 0072決定2・3）。`FinanceLog`は`ClassifyApprovalLevelUseCase`の
型固定Level2ルールへ追加し、`AgentDelegationGrantScope`という型
自体からも除外した——「scopeにFinanceLogを含むGrant」がもはや
TypeScriptレベルで構築不能になっている（コンパイル時に防げる、
実行時チェックへ依存しない二重の安全装置）。回帰テストで、
scopeにFinanceLogを含まないGrantが存在する状態でFinanceLog
Proposalを送っても自動承認されないことを確認済み
（`WriteProposalGateway.test.ts`）。

### 13.2 保存信頼性契約が監査に与える影響

`createProposal`の自動承認パスに、read-after-write検証と
try/catchによる失敗の構造化報告（`saved`/`verified`/`saveError`/
`retryQueueId`）を追加した（ADR 0072決定4）。重要な点として、
**書き込みが失敗した場合はGrantの`usageCount`を消費しない**
——失敗した試行にOwnerの委譲予算を使わせない設計であることを、
Repositoryの`save()`を例外送出させる回帰テストで確認済み
（`WriteProposalGateway.test.ts`「reports saved:false...」）。
これにより、悪意ある・不安定なクライアントが失敗を繰り返しても、
有効なGrantの残り使用回数を消耗させて正当な保存を妨害する
（可用性への攻撃）リスクを抑えている。

### 13.3 StudySessionライフサイクルツール：Version27方針の意図的な
反転

`study_session_create`/`update`/`finish`は、Version27が明示的に
「MCP Toolは意図的に用意しない——ARC自身はこの経路を呼べない」と
決めた方針を反転させる。Owner本人の明示的な今回指示（項目2）を
根拠とする。この経路はWrite Proposal Layer・
`AgentDelegationGrant`・`ApprovalDecision`監査のいずれも経由しない
**直接書き込み**である——既存のStudy Timer Gateway
（`/api/study-sessions`、Bearer token認証、Version27）と同じ設計
思想（機械的な記録であり、Owner確認を要する「判断」を含まない）を
踏襲した。

**既知のトレードオフ**：この経路はApprovalDecisionの監査ログに
一切記録されない。個人の学習記録という低リスクなデータであること、
Constitution第2条上「保存する」という機械的操作自体が判断を伴わない
ことから許容範囲と判断したが、将来的に監査要件が強まった場合は
ApprovalDecision記録を追加することを技術的負債として記録する
（`docs/reports/Version40_Report.md`8章）。

### 13.4 `capability_registry_get`の環境情報開示

`environment.cwd`・`environment.dataDirectory`を返すようになった
（ADR 0072、本Version）。ファイルパス自体は機微情報ではないが、
将来Owner固有のユーザー名等がパスに含まれる環境（Windows
`C:\Users\<username>\...`等）では、この情報がMCP経由でChatGPT等の
外部サービスへ渡ることになる点は認識しておく必要がある——
現状の`/mcp`エンドポイントは無認証（ADR 0044）のため、接続できる
誰でもこの情報を取得できる。実害は限定的（Ownerは既にファイル
システムパスをローカルで把握している）と判断し、本Versionでは
対応不要としたが、将来Remote MCPへ認証を導入する際に併せて
再評価する。

### 13.5 結論

Version40の変更は、いずれも「機械的に判定可能な範囲を広げる・
失敗を握りつぶさない」という既存の設計原則の延長線上にあり、
Constitution第2条・第4条・ADR 0031の中核的保証（Ownerの明示行為
なしに書き込みが確定しない、という原則そのもの）には抵触しない。
StudySessionツールの監査ログ非対応（13.3）は唯一の新規トレード
オフであり、明示的に記録した。
