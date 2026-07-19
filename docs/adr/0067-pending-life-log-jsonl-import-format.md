# ADR 0067: 退避中ログJSONL Import形式・重複防止規則

## ステータス

Accepted

## 関連Principle・ADR

- Constitution第2条（Systemは判断しない）
- Principle 5（推測は推測として扱う）
- ADR 0059（Mobile Ingress as Transport vs Canonical Store）
- ADR 0065（Mobile Ingressデータ契約）

## コンテキスト

Version35 Decision Packetで「現在退避中の16件」の実体をOwner確認
事項として提起したところ、Owner指示書（2026-07-20）で以下が判明
した。

- 16件は実在し、公開GitHubへ個人データを置かない方針のもと、
  OwnerのCodex workspaceに`project-arc-pending-life-logs-2026-07-20
  .jsonl`として保管されている。
- 各行のフィールドは`sequence`・`type`・`occurredAt`（`null`）・
  `content`・`provenance`（`"chat_summary_queue"`）。
- `type`にはMealLog・FinanceLog・Reflection・AppearanceLogのように
  既存Entityに対応するものと、RewardSystem・BudgetRule・Wishlist・
  Preference・SkincareRoutine・AppearanceAssessment・
  PersonalCareInventoryのように**2026-07-20時点でProject ARCに
  対応するEntityが存在しないもの**が混在する。
- 実データはこのリポジトリに含まれない。

## 決定

### 1. 汎用Importerとして実装する（実データは扱わない）

`ImportPendingLifeLogsUseCase`（`src/application/use-cases/
mobile-ingress/ImportPendingLifeLogs.ts`）は、JSONL**本文の文字列**を
受け取って処理する純粋なUseCaseとし、ファイルI/O自体はCLI
（`pnpm import-pending-logs -- <path> [--dry-run]`）側の責務とする。
実データはOwnerがローカルに保管したファイルパスを都度渡す前提で、
このリポジトリ・コミット履歴には一切含めない。テストは全てプレース
ホルダーの合成データのみを使う。

### 2. 未対応typeは自動マッピングせず`unsupported_type`として報告する

RewardSystem等の型は、既存のどのEntityへ「近そうか」を推測して
自動変換しない。Constitution第2条・Principle 5に従い、Systemが
判断せず、Owner/ARCが後から明示的に判断できるよう、報告のみ行う
——具体的には「どのtypeの行が何件あったか」を`summary`として集計し、
個別行の詳細も`results`配列で確認できる。

新しいEntityを設計するかどうかは本ADRの対象外とし、Owner/ARCの
今後の判断に委ねる。

### 3. 重複防止ID生成規則：`idempotencyKey = "pending-life-log:<sequence>"`

Owner指示書自身は重複防止の生成規則を指定していなかったため、
Claude Codeが設計した。`sequence`はOwnerのJSONLファイル内で一意
であることが前提（`chat_summary_queue`という`provenance`から、
ARCとの会話ログを順序付けて退避させたものと推測されるが、この
推測はADRの決定には影響しない——生成規則が`sequence`に対して
決定的でありさえすれば、同じファイルの再importが安全に冪等になる
という性質だけが必要条件のため）。

同じJSONLファイルを複数回importしても、既存の
`ReceiveIngressRecordUseCase`の冪等化がそのまま効き、二重の
`IngressRecord`は作られない。

### 4. dry-runの検証範囲はTransport層まで、Entity形状の検証はSyncへ委ねる

`--dry-run`はJSON構文・トップレベルschema・type対応確認のみを行う。
`content`が対応するEntityの`create()`要件を満たすかどうかは、
ADR 0059の「Transport、Canonical Storeではない」という既存の設計
分離に従い、実際に`ReceiveIngressRecordUseCase`でAcceptされた後、
`pnpm mobile-sync`（Canonicalize）が検証する——スマートフォンからの
ライブ送信と全く同じ検証経路を通すことで、Importer側に検証ロジックを
二重実装しない。

### 5. 実際の取り込みタイミングは本ADRの対象外

「実取り込みは安全なローカル受け渡しまたは認証済み接続後に行う」
というOwner指示に従い、本Versionでは汎用Importerの実装・検証のみを
行い、実際の16件の取り込みは実施しない（実データがこのセッションから
見えないため、そもそも実行不可能）。Owner自身がファイルを用意し、
`pnpm import-pending-logs -- <path> --dry-run`で内容を確認した上で、
本番実行するかどうかを判断する。

## 影響

- 新規Application層UseCase・CLI・テスト（合成データのみ）。
  Domain層は無変更（既存`IngressRecord`・`BridgeLogType`をそのまま
  再利用）。
- `ALL_BRIDGE_LOG_TYPES`（実行時の型一覧）を`BridgeLogType.ts`へ
  昇格し、`ExportLogs.ts`の重複private配列を解消した（副産物的な
  簡略化）。

## 見送った案

- **未対応typeを最も近い既存Entityへ自動マッピングする**：
  Constitution第2条に抵触するため見送った。
- **`occurredAt: null`の行に現在時刻を補完して取り込む**：
  存在しない事実を捏造することになるため見送った。`content`自身が
  日付情報を持たない場合、対応するEntityの`create()`検証が自然に
  失敗し、その理由が`Failed`状態として正確に記録される。
