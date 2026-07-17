# ADR 0052: Version25「Life Log Phase 2」

## ステータス

承認済み（Owner本人発信のAgentMessage `70926e76-aaaa-48bc-ae22-dc75ffa3cdc8`
による正式指示、`mf:fb9ee72f-a144-4d65-88a5-f78a113c536c`継続）

## 関連Principle

- Constitution第2条（Systemは、判断しない）・第4条（Ownerが、
  最終決定する。ただし`AgentDelegationGrant`による限定委譲を含む）
- Principle 9（段階的拡張／YAGNI）
- ADR 0031（Write Proposal Layer）・ADR 0039（書き込み経路を増やさ
  ない方針）・ADR 0048（Approval Policy Engine）・ADR 0051（Version24
  Constitution第4条限定改定・`AgentDelegationGrant`の初期実装、
  scope: Reflection/ChallengeLogのみ）

## コンテキスト

Version24で`AgentDelegationGrant`の仕組みを実装したが、scopeは
Reflection・ChallengeLogに限定されていた。Version23の調査
（`docs/proposals/life-log-auto-save-delegation.md`3章）で、食事・
栄養・体重・収支には対応するEntityが存在しない「ギャップ」であることが
判明していた。Owner本人がAgentMessage `70926e76-...`でこのギャップを
埋める正式実装を指示した。

指示書は4つの新規Entity（MealLog/NutritionLog/WeightLog/FinanceLog）
の要件、`AgentDelegationGrant`のscope拡張、既存の安全装置
（type固定Level2ルール・重複防止・監査・default deny・Grantの
作成/拡張/復活をARCが自動実行できないこと）の維持、OAuth関連作業の
明示的な対象外化を定めていた。

## 決定

### 4つの新規Entity

いずれも`ChallengeLog`（ADR 0039以来のシンプルな「record +
`create()`バリデーション」パターン）を踏襲する。

- **`MealLog`**（`src/domain/entities/MealLog.ts`）：食事単位の記録。
  `occurredAt`（datetime、1日複数回のためdate単位ではない）・
  `items`（必須、最低1件）・`mealType`/`portion`/`source`/`notes`/
  `photoPath`（任意）。写真は実体（ファイル）と参照（`photoPath`
  文字列）を分離する設計とした——既存の`AppearanceLog.photoPath`
  （Version14）と同じ設計で、実体の保存自体は`photoStore.ts`の
  `savePhoto()`が担い、このEntity自身は画像を扱わない（指示書の
  「画像そのものの恒久保存と参照情報保存を分離」要件）。Reflection/
  ChallengeLog（Version24）と同じ`estimated`/`estimationBasis`/
  `confidence`で、Owner本人の発言とARCによる推定を区別する。
- **`NutritionLog`**（`src/domain/entities/NutritionLog.ts`）：
  `MealLog`に紐づく推定・実測の栄養値。`mealLogId`は軽量な参照
  （`AgentMessage.tags`の`mf:<id>`規約と同じく存在検証はしない、
  ADR 0045踏襲）。`estimated`（必須）・`basis`（必須、空文字禁止）・
  `confidence`または`uncertaintyNote`のいずれか必須、を`create()`で
  構造的に検証する——指示書の「推定値を確定事実として扱わない」を
  型とバリデーションで強制する。日次合計は保存しない。
- **`WeightLog`**（`src/domain/entities/WeightLog.ts`）：1計測1記録。
  `measuredAt`（datetime）・`weightKg`（正の数）。同日複数計測を
  許容する一意性制約なしの設計（指示書要件）。日次代表値の生成は
  今回実装しない（指示書は「作る場合は原計測を上書きしない」という
  条件付き要件であり、作らないことでこの制約を自明に満たす、YAGNI）。
- **`FinanceLog`**（`src/domain/entities/FinanceLog.ts`）：収支の
  原取引記録。`type`（Income/Expense）・`amount`（正の数）・
  `currency`（省略時`create()`が`'JPY'`を補完）。カード番号・口座
  番号・認証情報の保存禁止は、コードでの自動検出は行わず（誤検知
  リスクの方が高く範囲外）、MCP Tool descriptionと本ADRに明記する
  運用上の制約とする。

既存`Reflection.expenseYen`（日次要約）とは役割が異なる——
`Reflection`側は変更・移行・削除しない。二重管理の解消は、
`FinanceLog`を原取引、`Reflection.expenseYen`を日次要約とする役割
分担の明文化のみで行う（データ移行はしない、指示書の明示的な禁止）。

### idempotencyKeyによる重複防止

4つのRecord型全てに`idempotencyKey?: string`を持つ。各
`AddXUseCase.execute()`は、`idempotencyKey`が渡された場合のみ
`repository.findAll()`から同一キーの既存レコードを探し、あれば新規
保存せずそれを返す（`deduped: true`）。省略時は常に新規作成する
——これはARC側が安定したキーを供給する運用を前提とした、文字列一致
のみを見る機械的な処理であり、内容の類似性を判断するものではない
（Constitution第2条準拠）。

### `AgentDelegationGrant`のscope拡張

- `ProposalType`（`src/domain/value-objects/Proposal.ts`）に
  `MealLog`/`NutritionLog`/`WeightLog`/`FinanceLog`を追加。
- `AgentDelegationGrantScope`（`src/domain/entities/
  AgentDelegationGrant.ts`）を6型（Reflection/ChallengeLog/MealLog/
  NutritionLog/WeightLog/FinanceLog）に拡張。
- `WriteProposalGatewayUseCase`の`AUTO_APPROVABLE_TYPES`に4つを追加
  するだけで、Version24で確立した既存の自動承認ロジック（Level2は
  対象外、grant scope/expiresAt/usageLimit/statusの再評価、重複
  防止）がそのまま適用される——型固定Level2ルール
  （`AgentDelegationGrant`自体は絶対に自動承認されない）も無変更で
  効く。新しい安全ロジックの追加は不要、既存の汎用メカニズムへの
  型追加のみで指示書の「Grantの作成・拡張・更新・復活をARCまたは
  Claude Codeが自動実行できない保証」を維持した。

### Read側：4つの新規MCP Tool、書き込みTool追加なし

ADR 0039の「書き込み経路を増やさない」方針を継続——書き込みは既存の
`proposal_create`/`approve`が新ProposalTypeを受け付けるだけ。読み
取りは`agent_delegation_grant_list`（Version24）と同じ「1 Entity =
1個の読み取り専用MCP Tool」パターンを4つ分繰り返した：
`meal_log_list`・`nutrition_log_list`・`weight_log_list`・
`finance_log_list`（`limit`必須・最大100、`date`/`category`/
`mealType`/`type`等の絞り込み、`ReadGatewayUseCase`の
`assertValidLimit`と同じ制約を各List UseCaseに実装）。加えて
`NutritionLog`は原記録から日次合計を都度再計算する
`nutrition_summary_by_date`（`SummarizeNutritionByDateUseCase`）を
追加した——`MealLog`経由で対象日の`mealLogId`集合を求め、それに紐づく
`NutritionLog`を合算する。合計値自体は保存しない（指示書「日次合計は
原記録とは別の派生集計とし、再計算可能にする」）。対応するHTTP
`GET /meal-logs`等・Connectorメソッドも同型で追加した。

Timeline横断統合は今回行わない（指示書が「追加する場合は」という
条件付き要件としており、既存のTimeline順序への影響リスクを避けるため
——次Version検討事項として申し送る）。

### 永続化・配線

`JsonFileMealLogRepository`等4つ、既存の`JsonFile*Repository`パターン
（`readJsonArray`/`writeJsonArray`、`restore()`経由の復元）をそのまま
踏襲した。`WriteProposalGatewayUseCase`のコンストラクタが10引数から
14引数になった——`propose.ts`・`http/server.ts`・
`WriteProposalGateway.test.ts`の3呼び出し元を更新した。

### 発見した実装漏れとその修正

配線作業中、`src/infrastructure/http/server.ts`の
`serializeApproveResult`（`approveProposal`結果をHTTPレスポンスへ
シリアライズする関数）が4つの新ProposalTypeのcaseを欠いたまま
コンパイルが通っていたことが、実HTTPでの実機確認（後述）で発覚した
——`ProposalType`のswitch文がexhaustiveness checkでは検出されない
設定（`noImplicitReturns`が本プロジェクトのtsconfigで有効でない）
だったため、型チェックだけでは見つからなかった。4型分のcaseを追加し、
実HTTPリクエストで`MealLog`のProposalが`result: { log, deduped }`を
正しく返すことを確認した。今後同様のswitch文を追加する際は、型
チェックだけに頼らず実機確認で応答本体まで検証する必要があることを
申し送る（8章「技術的負債」参照）。

### 訂正・削除（指示書要件、スコープの明示）

`update`/`delete`UseCaseは**今回のスコープに含めていない**——
Reflection/ChallengeLog同様、Version24でもスコープ外とされた項目で
あり、今回追加した4 Entityにもそもそも`update`/`delete`UseCaseが
存在しない。次Versionへ明示的に持ち越す。

## 根拠

- Version24で確立した「型固定Level2ルール＋AUTO_APPROVABLE_TYPES
  除外」という二重の安全装置は、対象型を追加するだけで新しい
  ProposalTypeへそのまま適用できる汎用的な設計だった——今回その
  再利用性が実際に検証された。
- 4 Entityの設計判断（推定値区別・idempotencyKey・日次代表値を作らない
  等）は全て指示書の明示的な要件をそのままコード化したものであり、
  Claude Code自身が独自に「何を記録すべきか」を判断した箇所はない
  （Constitution第2条）。

## 影響

- `Proposal`（VO）の`ProposalType`に4型追加（既存フィールドは
  変更なし、後方互換）。
- `AgentDelegationGrantScope`が6型に拡張（既存のReflection/
  ChallengeLog限定Grantの挙動に変更はない、追加のみ）。
- `WriteProposalGatewayUseCase`のコンストラクタが14引数になった
  ——既存3呼び出し元を更新した。
- 新規MCP Tool 5つ（`meal_log_list`・`nutrition_log_list`・
  `nutrition_summary_by_date`・`weight_log_list`・
  `finance_log_list`、いずれも読み取り専用）・新規HTTP Route 5つ
  （`GET /meal-logs`・`/nutrition-logs`・`/nutrition-logs/summary`・
  `/weight-logs`・`/finance-logs`）を追加。
- `docs/proposals/level1-arc-approval-delegation.md`（一般的な
  Proposal承認代行）は、本ADRの対象外のまま未決定——今回の拡張は
  あくまで既存4型＋新規4型という限定scopeのAgentDelegationGrantに
  のみ及ぶ。
- OAuth本番有効化・`.env`変更は今回のスコープに一切含まれていない
  （指示書の明示的な対象外化）。
