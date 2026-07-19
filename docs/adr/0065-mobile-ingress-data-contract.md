# ADR 0065: Mobile Ingress データ契約（読み取り・書き込み・idempotency・待機・失敗状態）

## ステータス

Accepted（Version35、ローカルMVPとして実装）

## 関連Principle

- Constitution第1条（唯一の人生データベース）・第2条（Systemは、判断しない）
- Principle 4（記録は資産である）・Principle 5（推測は推測として扱う）
- ADR 0058（Life Data Durability）・ADR 0059（Mobile Ingress as
  Transport vs Canonical Store）・ADR 0063（Mobile Sync,
  Idempotency and Conflict Resolution）・ADR 0064（Architecture Gate）

## コンテキスト

ADR 0059・0063は設計方針（Transport/Canonical分離、idempotency
キーはクライアント生成、競合はOwnerへ提示）を定めたが、実装可能な
データ契約（状態機械・API形状）までは踏み込んでいなかった。本ADRは
それを確定し、ローカルMVPとして実装する。

## 決定

### `IngressRecord`Entity（新規）

```ts
type IngressRecordStatus = 'Accepted' | 'Canonicalized' | 'Pending' | 'Failed' | 'Discarded';

interface IngressRecordData {
  readonly idempotencyKey: string;   // スマートフォン側が生成
  readonly payloadType: BridgeLogType; // 既存Bridge Layer（Version9）の型をそのまま再利用
  readonly payload: Record<string, unknown>;
  readonly clientCreatedAt: string;  // ISO8601、スマートフォン側の時刻
}
```

**`payloadType`は新しい型を作らず、既存の`BridgeLogType`
（Version9のBridge Layer、Import/Exportが既に対応済み）をそのまま
再利用する**——Mobile Ingressの本質は「新しい入力経路」であり
「新しい記録カテゴリ」ではないため、既存のImport機構
（`ImportLogsUseCase`）と型を共有することで、Canonicalize処理を
車輪の再発明せずに実装できる（6章参照）。

### 状態機械

```
Accepted → Canonicalized（Sync成功、競合なし）
Accepted → Pending（Sync時に競合を検出）
Accepted → Failed（Sync処理でエラー、例：payload形式不正）
Failed → Accepted（retry、MAX_RETRY未満の場合のみ）
Pending → Canonicalized（Owner確認により、受信内容を採用）
Pending → Discarded（Owner確認により、受信内容を破棄）
Failed → Discarded（MAX_RETRY到達後、Owner確認により打ち切り）
```

`AgentTask`（ADR 0061）と同じ「型で不正遷移を拒否する」
`LEGAL_TRANSITIONS`パターンを踏襲する。`MAX_RETRY`も同じ値（3）を
再利用し、プロジェクト全体でretry上限の考え方を統一する。

### 書き込み（受信）API：`receive`

```ts
interface ReceiveIngressRecordInput {
  idempotencyKey: string;
  payloadType: BridgeLogType;
  payload: Record<string, unknown>;
  clientCreatedAt: string;
}
```

同じ`idempotencyKey`で複数回呼ばれても、**2回目以降は新規作成せず
既存レコードをそのまま返す**（ADR 0063）。これによりスマートフォン
側のoffline再送・network不安定時の重複送信が安全になる。

### 読み取りAPI

- `listIngressRecords({ status?, payloadType? })`：一覧取得
- `getIngressRecord(id)`：単体取得

### Sync（Canonicalize）：`SyncIngressRecordsUseCase`

`Accepted`状態の全レコードを対象に、既存の`ImportLogsUseCase`
（Bridge Layer、Version9）へ`{ type: payloadType, data: payload }`
として委譲する。

- 委譲が成功 → `Canonicalized`
- 委譲が「同じ日付のReflectionが既に存在する」等の**競合**で失敗 →
  `Pending`（Systemは自動上書きしない、ADR 0063「競合はSystemが
  自動で選ばずOwnerへ提示する」を継続）
- 委譲がその他の理由（payload形式不正等）で失敗 → `Failed`

競合と一般的な失敗の区別は、`ImportLogsUseCase`が返すエラー
メッセージのパターンマッチではなく、**Canonicalize前に対象
Repositoryへ`findByDate`等で既存有無を確認する**という、Sync
Worker側の事前チェックで行う（エラー文字列に依存する脆い判定を
避ける）。

### Pending解決：`ResolvePendingIngressRecordUseCase`

- `accept`：`Pending → Canonicalized`。実際にCanonicalize処理
  （既存Repositoryへの保存、上書きを許可）を実行する。
- `discard`：`Pending → Discarded`。既存のlocalデータをそのまま
  保持し、受信内容は破棄する。

## 根拠

- `payloadType`をBridge Layerの`BridgeLogType`と共有したのは、
  Program Bが「新しい記録カテゴリ」ではなく「新しい入力経路」で
  あるという理解を型レベルで表現するため——ADR 0059の
  「TransportとCanonical Storeを区別する」設計の、具体的な型
  レベルでの実装である。
- 競合検出をエラーメッセージのパターンマッチに頼らず事前チェックに
  したのは、`docs/HISTORY.md`が繰り返し指摘する「文字列に依存した
  脆い判定は将来の変更で壊れる」という教訓を踏まえた判断。

## 影響

- 新規Entity：`IngressRecord`
- 新規UseCase：`ReceiveIngressRecordUseCase`・
  `SyncIngressRecordsUseCase`・`ResolvePendingIngressRecordUseCase`・
  `RetryFailedIngressRecordUseCase`
- 新規Repository：`JsonFileIngressRecordRepository`
  （`data/ingress-records.json`、`pnpm backup`の対象に自動的に
  含まれる）
- `BridgeLogType`・`ImportLogsUseCase`を、Program B文書が要求する
  Meal/Nutrition/Weight/Finance/StudySessionまで拡張する
  （Version24〜27で追加されたLog種別がBridge Layerに未対応だった
  ギャップの解消、6章参照）
- 本番のHTTPSデプロイ・認証は本ADRの対象外（ADR 0064の
  Activation Gate）。ローカルMVPは`127.0.0.1`限定。
