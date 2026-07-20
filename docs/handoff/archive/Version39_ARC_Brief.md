# Version39 ARC Brief

## Theme

Cloud Quick Capture & PC-off Gap Closure

## Goal（原文、2026-07-20、`docs/handoff/ARC_INBOX.md`より保管）

### 受領

Version38（本体 `76b5e3f`、メイン640件＋Cloudflare 14件 green）を
完了として受領します。Cloudflare Worker、二段階token、
pull/reconciliation、NutritionLog、Miniflare E2Eは妥当です。

### 重要な現状認識

Version38はクラウド待機キューまで完成しましたが、次のOwner最優先
要件はまだ未達です。

- スマホから使えるcloud側Quick Capture UIがない。
- PC停止中はIngressRecordとして待機できるが、canonical ARCへの
  確定保存はPC再開後である。
- PC停止中の参照はsubmission statusに限られ、生活ログ全体の安全な
  参照ではない。

これらを曖昧に「PC-off対応完了」と表現しないでください。

### Version39の安全な実装範囲

1. Cloudflare Workerにスマホ向けQuick Capture UIを実装してください。
   Reflection / MealLog / NutritionLog / WeightLog / FinanceLogを
   明示選択でき、入力から別typeを推測・自動生成しないこと。
2. DEVICE_TOKENはソース、HTML、URL query、ログへ埋め込まないで
   ください。初回手入力を基本とし、既定では永続保存しない設計に
   してください。tokenを保持する場合は明示opt-in、危険性表示、
   消去操作を必須とします。
3. CSP、XSS対策、HTTPS前提、64KB上限、rate limit、認証失敗、
   token非漏えいを否定テストしてください。
4. 送信直後にsubmission statusを表示し、再送時も同じ
   idempotencyKeyを再利用できるUXにしてください。オフライン・
   通信失敗時に内容を消失させず、重複作成もしないこと。
5. 「PC-off保存」の意味を、(a) cloud ingress受付、(b) canonical
   ARC確定、(c) read availabilityに分解したCapability/Gap表を
   作成してください。各段階のデータ所在、整合性、復旧方法を
   明記します。
6. canonical ARCをcloudへ移す案、Transport queueのみcloudに置く
   現行案、hybrid案を比較するADR/Decision Packetを作成してください。
   個人情報、バックアップ、削除、費用0円、provider portability、
   Remote MCPとの統合を評価し、実移行は行わないでください。
7. デプロイ前preflightを追加してください。設定・binding・secret名・
   test結果を検査するだけとし、login、account作成、secret生成、
   deploy、公開URL発行は実行しないこと。
8. Version38で残ったbuild問題（ARC-PM-005）を今回変更と混同せず、
   cloud UIと同期経路の全gateを実行してください。
9. Report、Developer Feedback、ADR/threat model、STATUS、Roadmap、
   DoD、Activation Packet、ARC_INBOX archiveを更新してください。
   LATEST_ARC_FEEDBACK.mdの古いVersion28ポインタもVersion39完了時に
   必ず更新してください。

### 継続・停止条件

- ローカル、Miniflare、無課金、可逆、秘密情報不要の工程はOwner
  返答を待たずに完了してください。
- アカウント作成、秘密情報生成・設定、実デプロイ、外部公開、課金、
  canonical個人データのcloud移行、Constitution/Principles変更は
  Activation GateとしてOwner確認を求めてください。
- 退避中16件の実データは公開repositoryへ入れず、実importもしないで
  ください。
- live MCPが読めない場合も、このGit指示を正式指示として継続して
  ください。

## 対応結果

Version39として完了。詳細は`docs/reports/Version39_Report.md`・
`docs/developer-feedback/Version39_Developer_Feedback.md`・
ADR 0070・0071参照。
