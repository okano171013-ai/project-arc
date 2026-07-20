# Version38 ARC Brief

## Theme

Cloud-ready Mobile Life Log（Cloudflare Workersのローカルエミュレータ実装）

## Goal（原文、2026-07-20）

### 受領・判断

Version37（本体コミット `74c9bab`、626/626 tests green）を受領し、
完了として扱います。ADR 0066–0068、fail-closed認証、JSONL
Importer、provider-neutral境界、Quick Capture拡張は妥当です。

Ownerの最優先事項は引き続き次の順序です。

1. PC停止中でもスマホから日常ログをProject ARCへ即時保存・参照
   できること
2. PC停止中でもスマホから指示し、ARC・Claude Code・Codexが安全に
   自律開発できること

Version38は1を優先します。

### Owner判断（この指示で確定）

- PC停止中の利用を必須要件とします。
- 初期ランニングコスト上限は**0円**とします。
- Cloudflare Workers + D1/KVを暫定候補としますが、既存のrepository
  portを保ち、provider差し替え可能性を失わないでください。
- Version38ではアカウント作成、契約、課金、秘密情報生成・設定、
  実デプロイ、公開URL発行、LAN/外部公開の有効化を禁止します。
- 認証済みLAN公開も現時点では有効化しません。cloud-readyな
  ローカル実装・エミュレータ検証を優先してください。
- 退避中16件の実データはOwnerのローカルCodex workspaceにあり、
  公開Git repositoryへ絶対に入れません。実データimportは安全な
  ローカル引渡し経路が成立するまで行わないでください。テストは
  合成データのみ使用します。

### Version38の安全な実装範囲

1. `cloudflare/`をreference-onlyから、既存
   `IngressRecordRepository`境界を使うローカルエミュレータ対応の
   実装へ進めてください。実デプロイは禁止です。
2. Quick CaptureとMobile Ingress契約を、正規対応typeである
   Reflection / MealLog / NutritionLog / WeightLog / FinanceLogに
   揃えてください。NutritionLogを追加し、入力から別typeを推測・
   自動生成しないでください。
3. スマホ側のread/status/list契約をBearer認証・最小権限で設計・
   実装してください。全生活履歴の無制限公開は避け、既定は自分の
   submission status確認に限定してください。
4. cloud queue → canonical ARCへのpull/sync/reconciliationを、
   idempotency、再実行、部分失敗、dead-letter、retentionを含めて
   実装・検証してください。
5. JSONL Importerへdry-run、決定的ID、対応type別routing、
   unsupported typeの明示報告を追加または検証してください。
   unsupported typeを既存Entityへ丸めないでください。
6. Cloudflareローカルエミュレータ、否定認証、replay、重複、
   部分失敗、rollback、データ保持/削除、backup/restoreをテストして
   ください。0円上限を越える構成は採用しません。
7. 後日Ownerが5分以内に判断・実行できる1ページのActivation Packet
   を作成してください。必要アカウント、秘密情報、デプロイ、
   ChatGPT接続、rollback、想定費用を正確に列挙しますが、実行は
   しません。
8. ADR、threat model、Version Report、Developer Feedback、STATUS、
   Roadmap、DoD、ARC_INBOX archiveを更新してください。

### 開発継続ルール

- 上記のローカルで安全・可逆・無課金な工程はOwner返答待ちで停止
  せず完了してください。
- Version38完了後も、安全な未完了工程があれば継続して構いません。
- アカウント作成、秘密情報、本番変更、公開URL、外部公開、課金、
  不可逆操作、Constitution/Principles変更のActivation Gateだけは
  Owner承認を求めて停止してください。
- live MCPが読めなくても、このGit管理指示を正式指示として扱って
  ください。
- 完了時はDeveloper Feedbackを必ず残し、次のOwner確認事項を1か所に
  集約してください。

## Acceptance criteria

- Cloudflare Worker実装をローカルエミュレータで実機検証する
  （実デプロイなし）
- Quick CaptureがReflection/MealLog/NutritionLog/WeightLog/
  FinanceLogに対応する（NutritionLogは自動推測しない）
- スマホ側read契約が最小権限（自分のstatus確認のみ）
- pull/reconciliationがidempotency・部分失敗・retentionを含む
- JSONL Importerの要件（dry-run・決定的ID・type別routing・
  unsupported type報告）を満たす／再検証する
- 否定テスト・replay・重複・部分失敗・rollback・データ保持/削除を
  ローカルエミュレータでテストする
- 1ページのActivation Packetを作成する（実行はしない）
- ADR・threat model・Report・Developer Feedback・STATUS・Roadmap・
  DoD・ARC_INBOX archiveを更新する
- クラウド契約・課金・本番公開・秘密情報設定・認証済みLAN公開の
  有効化を一切実施しない

## Result

Cloudflareの公式local emulator（Miniflare、実`workerd`ランタイム）
を使い、アカウント・ログイン・デプロイ一切不要で実際のWorkerコード
を実機検証できることを確認した上で、`cloudflare/src/worker.ts`・
`kvIngressRecordRepository.ts`を実装した——既存の
`ReceiveIngressRecordUseCase`・`ListIngressRecordsUseCase`・
`IngressRecord`をそのままimportし、Application/Domain層は無変更
（ADR 0068の実証）。二段階token（DEVICE_TOKEN：スマホ、送信＋自分の
status確認のみ／PULL_TOKEN：Owner PC、全件list・ack）による最小
権限read契約を実装し、ローカル版`mobileIngress.ts`にも同じ最小
権限ルール（`idempotencyKey`必須化）を適用した。

`pnpm mobile-sync pull`（`PullCloudIngressUseCase`・
`HttpCloudIngressClient`）でcloud→localのpull/reconciliationを
実装し、部分失敗を`failed`（ローカル反映自体が失敗、次回自動
retry）と`pulled-ack-failed`（反映成功・cloud側cleanupのみ失敗）に
区別して報告する設計とした。retentionは`POST /ingress/:id/ack`で
実現。自動dead-letter化は見送り、理由をADR 0069に記録した。

Quick CaptureへNutritionLogを追加した——`mealLogId`はOwner手入力
とし、Systemが自動で紐付けを推測しない設計とした。

Miniflareで14件の実機テスト（認証・最小権限・rate limit・入力
上限・replay・重複・部分失敗・ack/retention）が全て合格。加えて、
実際にMiniflareで起動したWorkerと実`pnpm mobile-sync pull`/`sync`
コマンドを繋いだ手動end-to-end確認を実施し、送信→pull→sync→
Canonicalizeの一連と、既存の競合検出（ADR 0065）がcloud経由でも
正しく機能することを確認した。副次的に、無関係な既存テスト
（Check-In Prompterの時刻依存フレーキネス）を発見・修正した。

メインテストスイート640件・cloudflare専用テストスイート14件が
全て合格。`docs/project-management/Version38_Activation_Packet.md`
（実デプロイの1ページ実行チェックリスト）を作成した。クラウド
契約・課金・本番公開・秘密情報設定・認証済みLAN公開の有効化は
一切実施していない。詳細は`docs/reports/Version38_Report.md`・
ADR 0069参照。
