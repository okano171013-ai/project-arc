# ADR 0070: Cloud Quick Capture UI・PC停止中の「保存」の分解（Capability/Gap表）

## ステータス

Accepted

## 関連Principle・ADR

- Constitution第2条（Systemは判断しない）
- ADR 0059（Mobile Ingress as Transport vs Canonical Store）
- ADR 0066（Mobile Ingressセキュリティ強化）
- ADR 0069（Cloud Worker実装・Pull/Reconciliation・最小権限read契約）
- Owner指示書2026-07-20「Version39 Cloud Quick Capture & PC-off Gap
  Closure」（`docs/handoff/archive/Version39_ARC_Brief.md`）

## コンテキスト

Owner指示書は、Version38完了時点を「PC-off対応完了」と曖昧に表現
しないよう明確に求めた。実際には、(a) cloud ingress受付、
(b) canonical ARCへの確定保存、(c) read availability、という3段階が
分離しており、Version38はcloud側の受信キュー（KV）までしか届いて
いなかった。本ADRは、この3段階を明示的に分解した上で、Version39で
実装したCloud Quick Capture UIの設計を記録する。

## 決定1：Capability/Gap表（PC-off保存の3段階分解）

| 段階 | 内容 | データ所在 | 整合性 | 復旧方法 | PC停止中の可用性 |
|---|---|---|---|---|---|
| (a) Cloud ingress受付 | スマホからの送信をCloudflare Worker（KV）が受理する | Cloudflare KV（cloud） | Eventually consistent（KVの仕様） | KVは複数リージョンにレプリケートされる（Cloudflare側の責務）。Ownerが直接復旧する手段はない | **可能**——PCの電源状態と無関係にWorkerが応答する（実デプロイ後） |
| (b) Canonical ARC確定 | `pnpm mobile-sync pull`でcloud→local、続けて`pnpm mobile-sync sync`でCanonicalize（`data/reflections.json`等へ確定） | ローカルJSONファイル（PC） | 強い一貫性（単一プロセス・単一ファイル、`jsonStore.ts`のatomic書き込み、ADR0058） | `pnpm backup restore`（世代retention、ADR0058） | **PC起動時のみ**——PC停止中は(a)止まりで、確定保存はPC再開後まで遅延する |
| (c) Read availability | 「自分が送った内容が本当に届いたか」を確認できる | (a)の間はcloud側（DEVICE_TOKENでの自分のstatus確認のみ）。(b)の後はローカルAPI経由でCanonical Store全体を参照可能 | (a)段階では単一レコードのみ参照可（全生活履歴ではない）。(b)後は既存のRead Gateway等で全参照可能 | 該当なし（読み取りのみ） | **PC停止中はsubmission statusのみ**——生活ログ全体の安全な参照はPC起動が前提のまま |

**結論**：Version39時点でも「PC停止中でも生活ログをProject ARCへ
即時保存・参照できる」というOwnerの最優先要件は、(a)のみ満たされ、
(b)・(c)は未達のままである。これを「PC-off対応完了」と表現しない
——Owner指示書の要求通り、正確に段階を分けて記録する。

## 決定2：Cloud Quick Capture UI（`cloudflare/src/worker.ts`の`GET /`）

### 2.1 UI実装の重複を避ける（共通モジュール化）

ローカル版（`mobileIngress.ts`）とcloud版（`worker.ts`）で全く同じ
UI（Reflection/MealLog/NutritionLog/WeightLog/FinanceLogの明示選択、
型からの自動推測なし）を提供する必要があったため、
`renderQuickCaptureHtml(nonce)`を`src/infrastructure/http/
quickCaptureHtml.ts`へ共通モジュールとして切り出した——Node固有API・
Workers固有APIのどちらにも依存しない純粋な文字列生成関数のため、
両ランタイムから安全にimportできる。UIの二重実装・将来のドリフトを
防ぐ。

### 2.2 トークンの扱い（Owner指示2）

トークンはHTML/JSに一切ハードコードしない。既定ではlocalStorageへ
保存せず、ページを開くたびに空欄から始まる。Ownerが明示的に
「このデバイスに保存する」にチェックした場合のみ、危険性の説明を
表示した上でlocalStorageへ保存する（opt-in）。「消去」ボタンで
いつでも削除できる。URL query・ログ・監査ログにもトークン値は一切
出力しない（`auditLog()`はtoken値を受け取らない設計）。

### 2.3 CSP・XSS対策・HTTPS（Owner指示3）

`script-src`/`style-src`をper-request nonceで制限し、
`'unsafe-inline'`を使わない。実装過程で、nonceは`<style>`/`<script>`
タグには効くが、個別要素のinline `style="..."`属性には効かない
（CSP仕様上、nonceは属性ではなくタグ自体にのみ適用される）ことが
**実機のヘッドレスブラウザ検証で判明**——修正前は複数のinline
`style="..."`属性がCSP違反として無音でブロックされていた。全て
CSSクラスへ置き換えて解消した（7章参照）。HTTPSは実デプロイ後の
Cloudflare edge側の仕様として常時強制される（Workerは常にHTTPS
経由で配信される）ため、`Strict-Transport-Security`ヘッダーを
将来のデプロイに備えて付与した。

### 2.4 送信UX（Owner指示4）

同じ論理エントリの再送では同じ`idempotencyKey`を使い回す
（`currentSubmissionKey`、確定成功までnullへ戻さない）——オフライン・
通信失敗からの再試行で重複を作らない。送信直後に自動で
`GET /ingress?idempotencyKey=`を呼びsubmission statusを表示する。
ネットワーク断・サーバーエラー時は入力内容を保持し、フォームを
クリアしない。種類（payloadType）を切り替えた場合のみ新しい論理
エントリとみなし、`idempotencyKey`を破棄する。

## 実機確認

グローバルインストール済みPlaywright（プロジェクト依存には追加せず）
のヘッドレスブラウザで、ローカル版・cloud版（Miniflare起動）の
両方に対して実際にフォーム送信・token opt-in/永続化/消去・
オフライン再送（`page.route`でネットワーク断を模擬）を実行し、
全て設計通りに動作することを確認した。この過程で2件の実装バグ
（style属性のCSP違反、非表示fieldset内のrequired属性がネイティブ
フォームバリデーションを無音でブロックする不具合）を発見・修正した
（Version39 Report7章）。検証用スクリプトは確認後に削除済み。

## 影響

- 新規：`src/infrastructure/http/quickCaptureHtml.ts`（共通UI）
- 変更：`mobileIngress.ts`（UIをimportへ切り替え、CSPヘッダー追加）・
  `cloudflare/src/worker.ts`（`GET /`追加、CSPヘッダー追加）
- テスト：ローカル・cloud双方にCSP・token非漏洩・型網羅の否定テストを
  追加

## 見送った案

- **UIをローカル/cloudで別々に実装し続ける**：重複コード・将来の
  ドリフトリスクが大きいため見送った。
- **`'unsafe-hashes'`でinline style属性を許可する**：nonce方式より
  防御力が弱く、CSSクラスへの置き換えという根本修正の方が保守性も
  高いため見送った。
