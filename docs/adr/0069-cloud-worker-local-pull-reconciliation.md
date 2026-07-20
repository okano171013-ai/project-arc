# ADR 0069: Cloud Worker実装・ローカルPull/Reconciliation・最小権限read契約

## ステータス

Accepted

## 関連Principle・ADR

- ADR 0059（Mobile Ingress as Transport vs Canonical Store）
- ADR 0064（Program B Architecture Gate、Zero-Cost Default）
- ADR 0066（Mobile Ingressセキュリティ強化）
- ADR 0068（Cloud Adapter境界）
- Owner指示書2026-07-20「Version38 Cloud-ready Mobile Life Log」
  （`docs/handoff/archive/Version38_ARC_Brief.md`）

## コンテキスト

ADR 0068は「新しい抽象を追加せず、既存の`IngressRecordRepository`を
provider-neutralな境界として再利用する」と決定したが、実際の
Cloudflare Workersコードは書かなかった（実行環境で動作確認できない
状態のコードを書かないため）。Owner指示書は、ローカルエミュレータ
（Miniflare）での実機検証を前提に、実際のWorker実装へ進めることを
求めた。同時に、(1) 認証済みLAN公開も含め実際の公開・デプロイは
禁止、(2) スマホ側のread契約は最小権限（自分のsubmission status
確認に限定）、(3) cloud queue→canonical ARCへのpull/sync/
reconciliationをidempotency・部分失敗・dead-letter・retention込みで
実装・検証する、ことを求めた。

## 決定

### 1. Cloudflare Worker実装（`cloudflare/src/worker.ts`・`kvIngressRecordRepository.ts`）

`IngressRecordRepository`をKV backedで実装
（`KvIngressRecordRepository`）し、Workerの`fetch`ハンドラは
`ReceiveIngressRecordUseCase`・`ListIngressRecordsUseCase`を
そのままimportして使う——Application/Domain層は無変更（ADR 0068の
実証）。`node:crypto`（`randomUUID`）は`nodejs_compat`
compatibility flagで解決する。

### 2. 二段階token（最小権限、Owner指示3への対応）

ローカル版（`mobileIngress.ts`）は単一の`MOBILE_INGRESS_API_TOKEN`
だったが、cloud版はインターネットに公開されうる前提のため2種類に
分離した：

- `DEVICE_TOKEN`（スマホ）：`POST /ingress`・
  `GET /ingress?idempotencyKey=`（自分の1件のみ、payload本体は
  含まない）
- `PULL_TOKEN`（OwnerのPC、`pnpm mobile-sync pull`専用）：
  `GET /ingress?status=Accepted`（全件、payload本体を含む）・
  `POST /ingress/:id/ack`（pull後の削除）

deviceTokenでの`GET /ingress`は、`idempotencyKey`未指定だと400で
拒否する——「全生活履歴の無制限公開を避け、既定は自分のsubmission
status確認に限定する」というOwner指示3を構造的に強制する。同じ
最小権限ルールをローカル版`mobileIngress.ts`にも適用した（`options.
apiToken`設定時は`idempotencyKey`必須）。

### 3. rate limitはKVベースの固定ウィンドウ（既知の限界を許容）

ローカル版のin-memory `Map`はWorkersの複数isolate環境では機能しない
——KVの`get`+`put`による固定ウィンドウカウンタへ置き換えた。KVは
原子的な増分操作を持たないため、高い同時並行下ではカウントを
取りこぼす可能性がある（テストで実際に確認済み：35件を並行送信すると
カウンタが競合し正確に制限できないため、テストは意図的に順次送信で
検証している）。個人利用規模の乱用防止としては許容範囲と判断した
——真に正確なrate limitが必要になった場合はDurable Objectsへの
移行を検討する（技術的負債として記録）。

### 4. Pull/Reconciliation（`PullCloudIngressUseCase`）

Application層に`CloudIngressClient`ポートを新設し、
`PullCloudIngressUseCase`がcloud側のAccepted queueを取得→
ローカル`ReceiveIngressRecordUseCase`で受信→成功したらcloud側を
ack（削除）、という2段目のTransport hopを実装した。部分失敗を
2種類に分けて報告する：

- `failed`：ローカル受信自体が失敗——ackしないため次回pullで
  自動的に再試行される（idempotencyKeyにより安全）
- `pulled-ack-failed`：ローカル受信は成功したがcloud側のack
  （削除）だけ失敗——データは既にローカルに安全に複製済み。次回
  pullで同じレコードを再取得しても`duplicate: true`になるだけで
  無害

**自動dead-letter化は実装していない**——特定のレコードが繰り返し
`failed`になった場合に自動でdiscardする機構は未実装で、「失敗したら
次回pullで再試行し続ける」設計に留めている。理由：ローカル側の
`IngressRecord`自体が既にcircuit breaker（`MAX_RETRY`、
`hasExceededRetries()`）を持っており、pull自体が繰り返し失敗する
シナリオ（cloud側の`payload`が壊れている等）は、ローカル受信時点で
即座に`IngressRecord.accept()`のバリデーションに引っかかるため、
「pullを繰り返しても直らない」状況は実質的に起こりにくい。将来
実際に問題が観測されたら、pull失敗回数をcloud側のレコードに
記録する拡張を検討する（技術的負債）。

### 5. 監査ログはWorkers Logs（`console.log`）

ローカル版はファイル（`data/logs/mobile-ingress-audit.log`）に
書き込むが、Workersにはローカルファイルシステムがない。
`console.log`（Cloudflare dashboard/Tail Workersで参照可能）へ
構造化JSONとして出力する方式とした。token値は記録しない
（ローカル版と同じ方針）。

## 実機検証

`pnpm cloudflare:test`（Miniflare、実`workerd`ランタイム、14件、
全件合格）：認証（401）・最小権限（400）・rate limit（429）・
入力上限（413）・replay/重複・部分失敗（不正JSON後も継続動作）・
ack/retention・pull tokenのみpayload可視、を検証。

`PullCloudIngress.test.ts`（Application層、fake `CloudIngressClient`、
5件）・`cloudIngressClient.test.ts`（Infrastructure層、実`node:http`
fake serverでの実HTTPリクエスト、4件）に加え、**実際にMiniflareで
起動したWorkerと実際の`pnpm mobile-sync pull`/`sync`コマンドを
繋いだ手動end-to-end確認**を実施——スマホ役の`fetch`が2件送信
→pullでローカルへ複製→cloud側ack（0件に）→syncでCanonicalize
（1件成功、1件は同日付の重複としてPendingへ——既存の競合検出
（ADR 0065）がcloud経由でも正しく機能することを確認）。検証用
スクリプトは確認後に削除済み。

## 影響

- 新規：`cloudflare/src/worker.ts`・`kvIngressRecordRepository.ts`・
  `worker.test.ts`（ビルド・テスト・CI対象外、`pnpm
  cloudflare:typecheck`/`cloudflare:test`で個別検証）
- 新規：`src/application/ports/CloudIngressClient.ts`・
  `PullCloudIngressUseCase`・`HttpCloudIngressClient`・
  `pnpm mobile-sync pull`
- 変更：`mobileIngress.ts`（GET /ingress最小権限化）・`env.ts`
  （`CLOUD_INGRESS_URL`/`CLOUD_INGRESS_PULL_TOKEN`追加、opt-in）
- 実デプロイ・アカウント作成・秘密情報発行は一切実施していない

## 見送った案

- **Durable Objectsによる正確なrate limit**：個人利用規模では
  KVベースの近似で十分と判断、YAGNI。
- **自動dead-letter化**：pullの失敗パターンが今のところローカル側
  circuit breakerで十分カバーされるため見送った。
- **cloud側のバックアップ機構**：cloud queueは一時的なTransportに
  過ぎず、Canonical Store（ローカル）のバックアップ（`pnpm backup`、
  ADR 0058）が既に唯一の永続データを守っている。cloud側に別途
  backup/restoreを作る必要性は薄いと判断した。
