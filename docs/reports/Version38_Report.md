# Version38 Report: Cloud-ready Mobile Life Log（ローカルエミュレータ実装）

## 1. Version概要

ARCがGit経由で送った指示書（2026-07-20、`docs/handoff/archive/
Version38_ARC_Brief.md`）に基づき、Program B（Mobile Daily Capture）
のCloud Activation Gateへ向けた「cloud-readyなローカル実装」を行った。
実際のCloudflareアカウント作成・デプロイ・LAN公開有効化は一切
実施していない——Cloudflareの公式local emulator（Miniflare、実
`workerd`ランタイム）で、実際のWorkerコードを実機検証することに
専念した。あわせて、Mobile Ingressのread契約を最小権限化し、
Quick CaptureへNutritionLogを追加、cloud queueからローカルへの
pull/reconciliation機構を実装した。副次的に、実機確認の過程で
無関係な既存テスト（Check-In Prompter）の時刻依存フレーキネスを
発見・修正した。

## 2. 今回実装した機能（理由も含めて説明）

- **最小権限GET /ingress**（`mobileIngress.ts`）：認証構成時、
  `idempotencyKey`未指定の一覧取得を400で拒否——「全生活履歴の
  無制限公開を避け、既定は自分のsubmission status確認に限定する」
  というOwner指示3への対応。
- **NutritionLogのQuick Capture対応**：`mealLogId`をOwnerが手入力
  する設計とした——Systemが自動で紐付けを推測しないという明示的な
  Owner指示に従う。実機（HTTP経由）でReceive→Sync→
  Canonicalizeまで確認済み。
- **Cloudflare Worker実装**（`cloudflare/src/worker.ts`・
  `kvIngressRecordRepository.ts`）：既存の`ReceiveIngressRecordUseCase`・
  `ListIngressRecordsUseCase`・`IngressRecord`をそのままimportし、
  KV backedの`IngressRecordRepository`実装のみを新規に書いた
  （ADR 0068の実証）。二段階token（DEVICE_TOKEN／PULL_TOKEN）による
  最小権限、KVベースrate limit、64KB入力上限、`console.log`監査ログ、
  `POST /ingress/:id/ack`によるretentionを実装。Miniflareで14件の
  実機テスト全て合格。
- **`pnpm mobile-sync pull`**（`PullCloudIngressUseCase`・
  `HttpCloudIngressClient`）：cloud queueをローカルへ引き下ろす
  2段目のTransport hop。部分失敗を`failed`（ローカル反映自体が
  失敗、次回自動retry）と`pulled-ack-failed`（反映は成功、cloud側
  cleanupのみ失敗）に区別して報告。
- **実機end-to-end確認**：Miniflareで起動した実Workerへ実際に
  `fetch`で2件送信→`pnpm mobile-sync pull`→`pnpm mobile-sync sync`
  の一連を実行し、1件がCanonicalize・もう1件が同日付競合で
  Pendingへ（既存の競合検出がcloud経由でも正しく機能）となることを
  確認した。

## 3. 実装しなかった機能（延期理由も記載）

- **実際のデプロイ・アカウント作成**：Owner指示により明示的に禁止。
  `docs/project-management/Version38_Activation_Packet.md`に手順を
  整理したのみ。
- **認証済みLAN公開の有効化**：Owner指示「認証済みLAN公開も現時点
  では有効化しません」に従い、実施していない（ADR 0066の
  fail-closedガードは既に実装済みのため、いつでも安全に有効化
  できる状態ではある）。
- **cloud側Quick Capture UI**：Worker側にはHTML UIを実装していない
  ——ローカル版`mobileIngress.ts`のQuick Captureのみ存在する。
  Activation Packetで明示的に注記した（次Version検討事項）。
- **自動dead-letter化**：pull失敗レコードの自動discardは未実装
  （ADR 0069参照、ローカル側circuit breakerで実質的にカバーされる
  と判断）。
- **Durable Objectsによる正確なrate limit**：KVベースの近似で
  個人利用規模には十分と判断。

## 4. Architecture Review

- 新規：`cloudflare/src/worker.ts`・`kvIngressRecordRepository.ts`・
  `worker.test.ts`（別tsconfig・別vitest config、メインgateには
  含まない）
- 新規：`src/application/ports/CloudIngressClient.ts`・
  `PullCloudIngressUseCase`・`HttpCloudIngressClient`
- 変更：`mobileIngress.ts`（最小権限GET、NutritionLog UI追加）・
  `env.ts`（`CLOUD_INGRESS_URL`/`CLOUD_INGRESS_PULL_TOKEN`追加）・
  `mobileSync.ts`（`pull`コマンド追加）
- 修正：`checkInPrompter.ts`（`runOnce()`へ`now`パラメータを追加、
  7章参照）
- Domain層は無変更。cloud側の`KvIngressRecordRepository`は
  `IngressRecordRepository`ポートを満たすだけの新規Adapter。

## 5. ADR

- **新規：ADR 0069**（Cloud Worker実装・ローカルPull/
  Reconciliation・最小権限read契約）：二段階token設計、KVベース
  rate limitの既知の限界、pull/reconciliationの部分失敗区分、
  dead-let化を見送った理由を記録。

## 6. テスト

- `pnpm typecheck` / `pnpm lint`：合格
- `pnpm test`：**640件合格（640件中640件、失敗・skip・pendingなし）**
  （Version37時点626件 + 14件新規：最小権限3件、NutritionLog1件、
  PullCloudIngress5件、HttpCloudIngressClient4件、mobile-sync pull
  設定確認1件——うち2件は6章で述べる既存バグ修正の副産物）
- `pnpm cloudflare:test`（別ゲート、Miniflare実機）：**14件合格**
- `pnpm cloudflare:typecheck`：合格
- **実機確認**：Miniflareで実際にWorkerを起動し、認証・rate limit・
  入力上限・replay・部分失敗・ack/retention・least privilegeを
  実HTTPリクエストで確認。加えて、実Workerと実`pnpm mobile-sync
  pull`/`sync`コマンドを繋いだ手動end-to-end確認（本Report2章参照）。
  検証用スクリプト・データは確認後に削除済み。

## 7. 修正したバグ（検出方法、原因、対応方法、再発防止）

- **Check-In Prompter（Version26）の時刻依存フレーキテスト**：
  実装中に`pnpm test`を実行したところ、Mobile Ingressとは無関係の
  `checkInPrompter.test.ts`が偶然失敗した（`expect(result.generated
  .length).toBeGreaterThan(0)`で0を検出）。原因調査の結果、
  `runOnce()`が実wall-clock（`new Date()`）を`GenerateInterventions
  UseCase`へ渡しており、実行時刻がたまたま既定quiet hours
  （23:00-07:00、`InterventionPolicySettings`既定値）に該当すると
  意図的にintervention生成が抑制される仕様だったため、と判明した
  （このセッション実行時刻が05:xx UTCだったため発現）。`runOnce()`
  に`now`パラメータを追加（`GenerateInterventionsUseCase`は
  Version26時点で既に`now`をoptional inputとして受け付ける設計
  だったが、`checkInPrompter.ts`がそれを配線していなかった）、
  テスト側は日中固定の`now`を注入するよう修正した。再発防止：
  時刻依存ロジックを持つUseCaseを呼ぶInfrastructure層のコードは、
  必ず`now`を外部から注入可能にする、という既存パターン
  （`GenerateInterventionsUseCase`自身）を末端まで一貫させる
  必要がある、という教訓を得た。

## 8. 技術的負債（今後改善したい点）

- KVベースrate limitの並行時不正確性（Durable Objects移行が
  将来の選択肢、ADR 0069）
- pull失敗の自動dead-letter化は未実装
- cloud側にQuick Capture UIがない（現状はローカル版のみ）
- 実際のCloudflareアカウントでの動作は未検証（Miniflareのみ）
  ——実デプロイ後、実際のネットワーク遅延・KVのeventual consistency
  等の挙動差異が出る可能性がある

## 9. 次Versionへの申し送り（技術的観点から推奨する事項）

- Owner確認事項（`Version38_Activation_Packet.md`）の実行を待って、
  実際のCloudflareデプロイ後の疎通確認を行う。
- cloud側Quick Capture UIの要否をOwnerと相談する。
- 「16件」（Version37で判明、ADR 0067）の実取り込みは引き続き
  Owner自身の作業として残っている。

## 10. POへの提案（提案・懸念点・改善案を自由に記載）

- ローカルエミュレータでの検証は「動くコード」への信頼度を大きく
  上げてくれた一方、実際のCloudflareネットワーク環境固有の問題
  （地理的レイテンシ、KVのeventual consistency等）はローカルでは
  再現できない——実デプロイ後の最初の疎通確認は、Miniflareでの
  結果を過信せず改めて丁寧に行うべきだと考える。
- cloud側にQuick Capture UIがないという非対称性は、実際に
  Activation Gateを通過した後、体験のギャップとして表面化する
  可能性がある。

## 11. CEOへのコメント（今回の成果、次Versionへの期待）

「実行環境で動作確認できないコードは書かない」という自らの
Version37時点の判断（ADR 0068）を、Miniflareという正当な手段を
見つけたことで覆さずに前進できたのが今回の一番の成果だと考える。
アカウント・ログイン・デプロイを一切行わずに、実際のCloudflare
Workersランタイム上でコードを検証できるという事実は、今後の
Program B開発全体の速度と安全性を大きく引き上げる。

## 12. ARCへの引き継ぎ（Owner追加指示、2026年7月）

- **新しい資産**：`cloudflare/src/worker.ts`——Miniflareで実機検証
  済みのCloudflare Worker実装。デプロイするだけで動く状態
  （Activation Packet参照）。
- **新しいルール**：「実行環境で検証できないコードは書かない」
  という方針は、Miniflareのような公式local emulatorが存在する
  場合は「検証できないから書かない」ではなく「emulatorで検証してから
  書く」へ具体化できる、という運用上の学びが得られた。
- **新しい思想**：Transport/Canonical分離（ADR 0059）は、
  ローカル1段階からcloud→local2段階へホップが増えても、既存の
  idempotency機構（idempotencyKey）だけで安全性を保てることが
  実証された——設計の一貫性が複雑化に対する耐性になっている。
- **Ownerについて分かったこと**：「認証済みLAN公開も現時点では
  有効化しません」という指示は、Version37で構造的に安全にした
  機能であっても、実際に使うかどうかは別の判断だという線引きを
  明確に示している——安全に「できる」ことと実際に「する」ことを
  混同しない態度が一貫している。

## 13. Product Review（Owner追加指示、2026年7月）

- **ユーザー体験で改善されたこと**：まだ実デプロイしていないため、
  Owner自身の体験としては変化なし。ただし「デプロイすればすぐ使える」
  状態への到達度は大きく進んだ。
- **毎日使う理由**：Quick CaptureがNutritionLogにも対応し、栄養情報
  も送信できるようになった（現状ローカル版のみ）。
- **懸念**：cloud側にQuick Capture UIがないため、実際にデプロイ後も
  スマホから直接送るにはローカル版UIをLAN経由で使うか、別途cloud側
  UIを作る必要がある——この非対称性は次Versionの検討課題。
- **次Versionで最も価値が高い改善**：Owner確認後の実デプロイと、
  実際のスマホからの初回送信の実地確認。

## 14. 10年後のProject ARCへの貢献（Owner追加指示、2026年7月、Version9より）

「ローカルで検証してからクラウドへ」という開発順序を、単なる
スローガンではなくMiniflareという具体的な技術で実現できたことが、
10年後も再利用可能なパターンとして残ると考える。将来Cloudflare
以外のprovider（あるいは全く別のクラウド技術）を検討する際も、
「まずローカルemulatorで動くコードを書き、実際にアカウントが
必要になるのは最後の一歩だけ」という順序を踏襲できる。

「人生OS」というVisionから逆算すると、今Versionはクラウドという
新しい領域へ踏み出す最初の一歩を、Ownerの信頼を損なわない形
（無許可でのアカウント作成・課金・公開を一切行わない）で実現した
石だった。技術的な機能追加以上に、「安全にどこまで進められるかの
境界線を正確に守りながら前進する」という姿勢そのものが、長期的な
Owner-System間の信頼関係の基盤になる。
