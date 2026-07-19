# Owner Priority Programs — Autonomous Collaboration and Mobile Capture

決定日: 2026-07-19  
決定者: Owner  
状態: **最優先・計画承認済み／実装未承認事項あり**  
対象: Version30完了後のProject ARC Roadmap

## Owner要求

今後は次の2つを最優先とする。

1. Ownerが日常的に関与しなくても、Claude Code（クロコ）とARCが共同開発を継続できる環境
2. PCが停止中でも、スマホからDaily記録を直ちにProject ARCへ耐久保存できる環境

この文書は両Programの正本となる。既存Roadmapの優先候補と衝突する場合、このOwner指示を優先する。ただしConstitution、Principles、Authority Table、Level2境界は変更しない。

---

# Program A — ARC × Claude Autonomous Development

## 目的

Ownerが目的と制約を一度設定すれば、ARCがPM / Reviewer、Claude Codeが実装担当として、計画、実装、test、review、修正、文書更新、commitまで継続できる状態を作る。通常作業のたびにOwnerへ`do`を求めない。

## 目標運用

```text
Owner: goal・Level2判断・予算上限のみ
  ↓ DevelopmentGrant
ARC: backlog選定 → task発行 → review → Level1承認 → 次task
  ↓ AgentTask / AgentMessage
Claude Worker: 分離branchで実装 → test → report → review依頼
  ↓ Artifact / commit / test evidence
ARC: acceptance判定 → 修正依頼または完了
```

## 必要な構成

### 1. AgentTask state machine

`Proposed → Ready → Claimed → InProgress → Review → ChangesRequested → Accepted → Closed`を永続化する。taskにはVersion、受入条件、関連ADR、許可範囲、branch/worktree、commit、test結果、lease期限、retry回数を保持する。

### 2. DevelopmentGrant

既存`AgentDelegationGrant`を無理に流用せず、開発作業専用の委譲モデルをADRで検討する。Ownerが最初にscope、repository、期間、最大Version数、cost上限、禁止操作を設定する。Grant自体の作成・変更・再開はLevel2のまま。

### 3. ARC Review Broker

ARCは受入条件、test evidence、diff summary、security/data影響を確認し、通常作業のみLevel1で継続を許可する。ARCがConstitution変更、本番反映、秘密登録、外部公開、不可逆操作、有料利用を承認してはならない。

### 4. Claude Worker

RunnerがClaude Codeをtask単位で起動し、毎回core docsとtask envelopeを渡す。対話sessionの永続性に依存しない。Claudeが承認待ちになった場合、OwnerではなくARC Review Brokerへ質問を返す。Level2分類だけOwner Actionへ送る。

### 5. Branch / lease制御

- 1 branch 1 writer
- taskごとにworktreeまたは専用branch
- claim時にlease取得、heartbeat更新、期限切れで安全に解放
- `main`・共有feature branchへの直接push禁止
- mergeは全gate成功後のみ
- 未commit差分があるworkspaceを別Agentが再利用しない

### 6. Audit / recovery

prompt、判断、diff、test、承認主体、失敗理由、costをappend-onlyで記録する。Runner停止、古いbuild、無限retry、同一失敗3回、budget超過をcircuit breakerにする。

### 7. Ownerへの通知

通常進捗はDaily Digestへまとめる。即時通知はLevel2、P0 incident、data損失疑い、security breach、全worker停止のみ。Ownerの確認回数を減らしても、重要事項を隠さない。

## Owner確認なしで可能な範囲

- repository読取、設計案、通常実装、局所refactor
- test / lint / typecheck / build
- ADR proposal、Report、Feedback、Roadmap、Issue更新
- task branchへのcommit
- 可逆で外部影響のない修正

## 必ずOwnerへ上げる範囲

- 費用発生またはbudget変更
- secretの作成・入力・送信・rotation
- production変更、外部公開範囲、認証方式の有効化
- data削除、不可逆migration、backupからの上書きrestore
- Constitution / Principles / Authority変更
- merge方針を超える高影響変更

## 主な問題点

| ID | Priority | 問題 | 対策 |
|---|---|---|---|
| AUT-001 | P0 | Claude sessionは自動的に次taskを受け続けない | task polling workerまたはCLI起動runnerを用意 |
| AUT-002 | P0 | ARCの一般Level1承認が未実装 | Review BrokerとDevelopmentGrantを設計 |
| AUT-003 | P0 | 複数Agentの同一branch競合 | branch ownership、lease、worktree分離 |
| AUT-004 | P0 | 無限loop・暴走・cost増加 | budget、retry上限、kill switch、circuit breaker |
| AUT-005 | P1 | acceptanceが自然言語だけ | 機械gate＋構造化acceptance evidence |
| AUT-006 | P1 | AgentMessageはtask lifecycleを表せない | AgentTask / AgentEventを正式実装 |
| AUT-007 | P1 | ARC/Claude/Ownerの主体識別が弱い | actor、grant、correlationIdをauditへ記録 |
| AUT-008 | P1 | local PC停止時はworkerも停止 | resume可能なqueueとlease expiryを設計 |
| AUT-009 | P2 | Report/Feedback重複 | governance文書の責務分離を強制 |

## Program A受入条件

- Ownerが1回DevelopmentGrantを発行後、通常taskを3件連続で無人完了できる
- Claudeの質問をARCが処理し、Level2だけOwnerへ到達する
- 同一branchへの二重writerを機械的に拒否する
- process中断後にtaskを重複実行せずresumeできる
- 全判断、commit、test、cost、承認主体を追跡できる
- kill switchで新規claimを停止し、進行taskを安全終了できる

---

# Program B — Mobile Daily Capture Without PC

## 目的

OwnerがスマホからDaily記録を数秒で送信し、PCが停止中でも消失せず、受信確認を直ちに得られる状態を作る。後からPCが起動した際に重複なくlocal Project ARCへ同期する。

## 重要な定義

「すぐに保存」を次の2段階で定義する。

1. **Accepted**: 常時稼働するARC Mobile Ingressが暗号化された記録を耐久保存し、receiptを返す
2. **Canonicalized**: local ARCが同期し、schema検証、idempotency確認後にcanonical repositoryへ反映する

PC停止中にlocal JSONへ直接書くことはできない。したがって「即時受付」と「local正本反映」を区別し、UIに状態を明示する。cloud inboxもProject ARCのtransport componentであり、別の人生DBとして利用しない。

## 推奨Architecture

```text
Smartphone PWA / Shortcut
  ↓ HTTPS + strong auth + idempotency key
ARC Mobile Ingress（常時稼働）
  ↓ encrypted append-only inbox + receipt
Sync Worker（PC起動時）
  ↓ validate / deduplicate / proposal or grant check
Local canonical JSON repositories
  ↓ acknowledgement
Inbox retention cleanup（policyに従う）
```

## Smartphone UX

- Home Screenから1tap起動
- Daily、Meal、Nutrition、Weight、Finance、Study、Reflectionのquick form
- 音声入力と自由文captureは後段。最初は構造化field優先
- 送信後に`保存済み / local同期待ち / 要確認`を表示
- offline時は端末内queueへ保存し、network復帰後に自動再送
- 同じ操作を再送しても1件だけになる

## Cloud ingress要件

- OAuth / passkey等のstrong auth。固定URLのみ・無認証は禁止
- TLSに加えpayload-level encryptionを検討
- append-only、idempotency、checksum、server timestamp、client timestamp
- 最小data、短いretention、logへの本文出力禁止
- rate limit、replay防止、device revoke
- export / backup / restore / incident procedure
- provider障害時もsmartphone local queueを保持

## 保存権限

Ownerが明示入力した事実の機械保存だけを対象とする。推測、補完、分類の自動確定はしない。既存AgentDelegationGrantのscope / expiry / usageLimitを検証し、対象外は`PendingApproval`として失わず保持する。

## Technology選定条件

候補はManaged serverless DB/API、専用VPS、常時稼働home device。選定時は以下を比較しADR化する。

- 月額・従量cost
- data residency、暗号化、backup、export容易性
- cold start、availability、vendor lock-in
- auth実装、secret管理、監視負荷
- free tier終了時の挙動

GitHub Issue、Notion、Google Sheets、chat履歴を生活dataの一時保存先として流用しない。

## 主な問題点

| ID | Priority | 問題 | 対策 |
|---|---|---|---|
| MOB-001 | P0 | PC停止時は現local APIへ到達不能 | 常時稼働Mobile Ingressを導入 |
| MOB-002 | P0 | cloud保存はConstitution第1条と緊張 | transport inboxとcanonical DBの境界をADR化 |
| MOB-003 | P0 | 個人生活dataの漏洩 | strong auth、暗号化、最小保持、threat model |
| MOB-004 | P0 | JSONにbackup/migration契約がない | Mobile前にData Durabilityを完了 |
| MOB-005 | P1 | 二重送信・同期競合 | client-generated idempotency keyとappend-only receipt |
| MOB-006 | P1 | cloud acceptedとlocal savedの混同 | 2段階statusをUI/APIへ明示 |
| MOB-007 | P1 | offline・provider障害 | encrypted device queueとretry |
| MOB-008 | P1 | secret/passcode設定がOwner Action | activation checklistを1回に集約 |
| MOB-009 | P1 | cloudは継続costを伴う可能性 | cost ceilingと停止時exportを先に決定 |
| MOB-010 | P2 | 入力項目増加でdaily UX悪化 | 主要3 formから開始し利用dataで拡張 |

## Program B受入条件

- PC停止中にsmartphoneから送信し、5秒以内を目標にdurable receiptを得る
- network断中の入力が復帰後に自動送信される
- 同一idempotency keyを複数回送っても1件だけ保存される
- PC起動後にlocal repositoryへ自動同期し状態がCanonicalizedになる
- unauthorized / replay / expired grantを拒否またはPending化する
- cloud障害、device紛失、credential revoke、restoreを手順化しtestする
- 1日3回以上、1週間継続してOwnerが無理なく利用できる

---

# 統合Roadmap案

Version番号はVersion30の最終完了後に確定する。現時点の推奨順序は以下。

| Version | Program | 内容 | Owner関与 |
|---|---|---|---|
| 30 | 共通security gate | Remote MCP認証移行準備、permission hardening、文書整合 | production activation時のみ |
| 31 | 共通data foundation | backup、schemaVersion、migration、restore drill、cloud inbox ADR | provider/cost選定のみ |
| 32 | Program B MVP | Mobile Ingress、auth、encrypted inbox、idempotent receipt | secret・production公開時のみ |
| 33 | Program B UX | PWA/Shortcut、offline queue、local sync、status表示 | device接続確認のみ |
| 34 | Program A control plane | AgentTask/Event、branch lease、DevelopmentGrant、Review Broker | Grant初回発行のみ |
| 35 | Program A autonomous loop | Claude Worker、retry/circuit breaker、daily digest、3-task無人実証 | Level2例外のみ |

Program AとBは共通してauth、audit、queue、idempotency、recoveryを必要とする。Version31で共通基盤を先に作り、別々の場当たり的仕組みにしない。

## 着手前に必要なADR

1. Autonomous Development Authority and DevelopmentGrant
2. AgentTask State Machine, Lease and Branch Ownership
3. Mobile Ingress as ARC Transport vs Canonical Store
4. Cloud Provider, Cost Ceiling and Exit Strategy
5. Life Data Encryption, Retention, Backup and Incident Response
6. Mobile Sync, Idempotency and Conflict Resolution

## Owner確認をまとめるタイミング

Ownerへの質問を逐次発生させない。次の3回に集約する。

1. **Architecture Gate**: cloud候補、月額上限、data保管地域、DevelopmentGrant上限
2. **Activation Gate**: secret設定、OAuth/passkey、production URL公開、process再起動
3. **Acceptance Gate**: smartphone実機確認、3-task無人運転、運用継続可否

その他の調査、設計、ADR、prototype、test、文書化はOwnerの返事待ちで停止しない。

## Claude Codeへの次の指示

1. Version30を完了させ、この文書をRoadmap / PM Statusからlinkする
2. Version31 Briefを作成し、Data Durabilityと上記6 ADRの調査を開始する
3. 有料provider契約、secret設定、production公開は実行しない
4. Program Bは保存形式・threat model・sync contractから設計し、UIから先に作らない
5. Program AはAgentTask / lease / authorityから設計し、shell loopで疑似自律化しない
6. 各milestone終了時にReportとDeveloper Feedbackを残す
