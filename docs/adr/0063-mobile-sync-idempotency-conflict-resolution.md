# ADR 0063: Mobile Sync, Idempotency and Conflict Resolution

## ステータス

Proposed（設計のみ。実装はProgram B、Architecture Gate後）

## 関連Principle

- Principle 4（記録は資産である）・Principle 5（推測は推測として扱う）
- Constitution第1条（唯一の人生データベース）・第2条（Systemは、判断しない）
- ADR 0058（Life Data Durability）・ADR 0059（Mobile Ingress as
  Transport vs Canonical Store）

## コンテキスト

ADR 0059はMobile Ingressを「Transport」、local JSONを「Canonical
Store」と定義した。PCが起動した際、Sync WorkerがIngressから
Accepted状態の記録を取得し、Canonicalize（local反映）する。この
過程で2つの問題が起きうる。

1. **二重送信**：スマートフォン側のネットワーク不安定・再送により、
   同じ記録がIngressへ複数回届く、またはSync Workerが同じ記録を
   複数回取得してしまう。
2. **競合**：同じ日のReflection等が、PC側で直接（`pnpm reflect`）と
   モバイル経由の両方で記録された場合、どちらを正とするか。

既存のいくつかのEntity（`MealLog`・`FinanceLog`・`CheckIn`・
`DistractionSignal`・`NutritionLog`）は既に`idempotencyKey?: string`
という任意フィールドを持っており（Version24〜26で確立）、
`AgentDelegationGrant`の自動保存フローでも同キーによる重複防止が
実装済みである。本ADRはこの既存パターンをMobile Sync向けに拡張する。

## 決定

### idempotencyKeyの生成元をクライアント（スマートフォン）に固定する

Sync Worker側では生成しない——スマートフォンのUI/PWAが、送信操作
（1タップ）ごとに一意なキー（例：UUID v4）を生成し、オフライン
queueへの保存時点でそのレコードに紐付ける。ネットワーク復帰後の
自動再送・Sync Workerによる複数回の取得のいずれでも、同じ
idempotencyKeyを持つ記録は1件のみCanonicalizeされる
（既存の`AUTO_APPROVABLE_TYPES`自動保存フローの重複防止ロジックを
再利用する）。

### 競合解決：「後勝ち」ではなく「両方保持、Ownerへ提示」

PC側で直接記録された内容と、モバイル経由でCanonicalizeされる内容が
同じ日・同じ種別で衝突した場合（例：Reflectionの`date`が同じ）、
Systemはどちらが「正しい」かを判断しない（Constitution第2条）。

- 既存の`ReflectionRepository.save()`は「同じ日付なら上書き」する
  仕様（`JsonFileReflectionRepository`参照）だが、Mobile Sync経由の
  書き込みには適用しない——**衝突を検出したら、Canonicalizeを保留し
  `PendingApproval`として保持**する（Program B文書「保存権限」の
  「対象外は`PendingApproval`として失わず保持する」要求に対応）。
- Owner向けの通知（Daily Digest、Program A文書のRunner通知パターン
  を踏襲）で衝突を明示し、Ownerがどちらを採用するか、または
  マージするかを決める。Systemによる自動マージ・自動上書きは行わない。

### Retry・backoff

Sync Workerの取得・反映が失敗した場合（一時的なネットワーク断・
Ingress側障害）、既存のRunner Control Plane（Version29、ADR 0056）の
`outcome: failed`パターンを踏襲し、指数バックオフで再試行する。
無限retryはAgentTask（ADR 0061）と同じcircuit breaker思想
（一定回数で停止しOwner通知）を適用する。

### Canonicalize後のIngress側データ

Canonicalize成功後、Ingress側の該当レコードは即座に削除せず、
短いretention期間（Program B文書「最小data、短いretention」要求）
保持してから削除する——Sync Worker側の反映バグでCanonicalizeが
実は失敗していた場合に、Ingress側の記録から復旧できる猶予を残す
（ADR 0058の「復元操作自体を不可逆にしない」という設計思想を、
Transport層にも適用する）。

## 根拠

- idempotencyKeyをクライアント生成にする設計は、サーバー側
  （Sync Worker）が同じ内容から同じキーを再現できない
  （オフライン時に生成された記録の内容がPC側からは見えない）
  という制約上、必然的な選択である。
- 競合解決を「Systemが自動で正しい方を選ぶ」ではなく
  「両方保持してOwnerへ提示する」にしたのは、Version6（Smart
  Capture、ADR 0007）以来一貫している「Systemは判断しない、
  忠実に記録するだけ」という設計原則の、新しい領域（同期競合）
  への適用である。
- 既存の`idempotencyKey`フィールド・重複防止ロジックを再利用する
  ことで、新しい重複防止の仕組みを一から作らずに済む
  （Principle 9、YAGNI）。

## 影響

- 本ADRはコード変更を伴わない（設計のみ）。
- 実装時、`ReflectionRepository`等の「同じ日付なら上書き」という
  既存仕様と、Mobile Sync経由の「衝突したら保留」という新しい経路を
  どう共存させるか（呼び出し元での分岐、または新しいUseCase追加）は、
  実装Versionで確定する。
- `PendingApproval`という新しい状態を持つEntity/UseCaseが必要になる
  可能性がある——既存の`ApprovalDecision`（Version21）と概念が近く、
  流用できるか実装Versionで検討する。

## Owner確認が必要な事項（本ADRのスコープ外）

- 実装着手そのもの（ADR 0062のArchitecture Gate完了後）
