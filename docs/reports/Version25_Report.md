# Version25 Report: Life Log Phase 2

**コミットハッシュ**：`e7c2909`（`feature/v4-v6-smart-capture`ブランチ）

`docs/reports/TEMPLATE.md`の14章構成に準拠。

## 1. Version概要

**テーマ**：Life Log Phase 2。Owner本人発信のAgentMessage（id
`70926e76-aaaa-48bc-ae22-dc75ffa3cdc8`、`mf:fb9ee72f-a144-4d65-88a5-f78a113c536c`
継続）による正式指示——Version24で実装した`AgentDelegationGrant`
（Owner決定に基づく生活記録の自動保存、Reflection・ChallengeLog限定）
を、Version23の調査で「Reflectionの拡張では表現できない」ことが
判明していた4カテゴリ（食事・栄養・体重・収支）へ拡張する実装指示。
OAuth本番有効化・`.env`変更は指示書により明示的に対象外とされた。

## 2. 今回実装した機能（理由も含めて説明）

### 4つの新規Entity

指示書が要求した記録粒度（Owner確認済み：食事単位・1計測1記録・
取引単位）をそのままEntity設計へ反映した。

- **`MealLog`**：食事単位の記録。`occurredAt`（datetime）・`items`
  （必須、最低1件）・`mealType`/`portion`/`source`/`notes`/
  `photoPath`（任意）。写真は実体とパス参照を分離（既存
  `AppearanceLog.photoPath`と同じ設計）。Reflection/ChallengeLog
  （Version24）と同じ`estimated`/`estimationBasis`/`confidence`で
  Owner本人の発言とARCの推定を区別する。
- **`NutritionLog`**：`MealLog`に紐づく推定・実測の栄養値。
  `estimated`（必須）・`basis`（必須）・`confidence`または
  `uncertaintyNote`のいずれか必須、を`create()`で構造的に検証——
  推定値を確定事実として扱わないという指示書要件を型で強制した。
  日次合計は保存せず、`SummarizeNutritionByDateUseCase`が原記録
  （`MealLog`経由の`mealLogId`集合）から都度再計算する。
- **`WeightLog`**：1計測1記録。同日複数計測を許容する一意性制約
  なしの設計。日次代表値は今回実装しない（YAGNI、条件付き要件）。
- **`FinanceLog`**：収支の原取引記録。`currency`省略時は`create()`
  が`'JPY'`を補完。カード番号・口座番号・認証情報の保存禁止は運用上の
  制約として明記（コードでの自動検出は誤検知リスクの方が高く範囲外）。

### idempotencyKeyによる重複防止

4つのRecord型全てに`idempotencyKey?: string`を追加。各
`AddXUseCase`は、キーが渡された場合のみ既存レコードを検索し、同一
キーがあれば新規保存せずそれを返す（`deduped: true`）——文字列一致
のみを見る機械的な処理であり、内容の類似性は判断しない。

### `AgentDelegationGrant`のscope拡張

`AgentDelegationGrantScope`を6型に拡張、`WriteProposalGatewayUseCase`
の`AUTO_APPROVABLE_TYPES`に4型を追加するだけで、Version24で確立した
自動承認ロジック（Level2は対象外、grant scope/expiresAt/usageLimit/
statusの再評価、重複防止）がそのまま適用された——**型固定Level2
ルールもAUTO_APPROVABLE_TYPES除外も、`AgentDelegationGrant`自身は
一切変更していない**。新しい安全ロジックの追加は不要だった。

### Read側の配線

5つの新規読み取り専用MCP Tool（`meal_log_list`・
`nutrition_log_list`・`nutrition_summary_by_date`・
`weight_log_list`・`finance_log_list`）と対応するHTTP Route
（`GET /meal-logs`等）を追加。書き込みは既存の`proposal_create`/
`approve`が新ProposalTypeを受け付けるだけで完結し、書き込み経路は
1つも増やしていない（ADR 0039の方針を継続）。

## 3. 実装しなかった機能（延期理由も記載）

1. **訂正・削除UseCase**：Reflection/ChallengeLog同様、指示書の
   完了条件に含まれておらず、今回追加した4 Entityにもそもそも
   `update`/`delete`UseCaseが存在しない。次Versionへ持ち越し。
2. **Timeline横断統合**：指示書が「追加する場合は」という条件付き
   要件としており、既存Timeline順序への影響リスクを避けるため今回は
   見送った。
3. **体重の日次代表値**：指示書は「作る場合は原計測を上書きしない」
   という条件付き要件であり、必須ではないため実装しなかった（YAGNI）。
4. **OAuth本番有効化・`.env`変更**：指示書の明示的な対象外化。
5. **7月の会話履歴からのバックフィル**：指示書の明示的な禁止。

## 4. Architecture Review

**新規**
- Entity: `MealLog`・`NutritionLog`・`WeightLog`・`FinanceLog`
- UseCase: `AddMealLogUseCase`・`ListMealLogsUseCase`・
  `AddNutritionLogUseCase`・`ListNutritionLogsUseCase`・
  `SummarizeNutritionByDateUseCase`・`AddWeightLogUseCase`・
  `ListWeightLogsUseCase`・`AddFinanceLogUseCase`・
  `ListFinanceLogsUseCase`
- Port: `MealLogRepository`・`NutritionLogRepository`・
  `WeightLogRepository`・`FinanceLogRepository`
- Adapter: `JsonFileMealLogRepository`・`JsonFileNutritionLogRepository`・
  `JsonFileWeightLogRepository`・`JsonFileFinanceLogRepository`
- MCP Tool: `meal_log_list`・`nutrition_log_list`・
  `nutrition_summary_by_date`・`weight_log_list`・`finance_log_list`

**変更**
- `Proposal`型：4型を`ProposalType`へ追加
- `AgentDelegationGrantScope`：6型に拡張
- `WriteProposalGatewayUseCase`：コンストラクタが14引数に、
  `AUTO_APPROVABLE_TYPES`に4型追加、payloadSchemas・executeApproval
  に4型分のcase追加
- `Connector`・`http/server.ts`・`generateOpenApi.ts`・`propose.ts`・
  `proposalSchema.ts`・`serializers.ts`：上記に対応する配線
- `http/server.ts`の`serializeApproveResult`：4型分のcase追加
  （実機確認で発覚した実装漏れの修正、7章参照）

## 5. ADR（追加・変更したADR、追加しなかった理由）

- **ADR 0052**（新規）：4 Entity設計、`AgentDelegationGrant`scope
  拡張、二重管理境界（`Reflection.expenseYen`との役割分担）、
  idempotencyKey設計思想、Timeline統合を見送った理由、実装漏れの
  発見と修正の記録。
- ADR 0050・0051は変更なし——今回はscope拡張のみで、Constitution
  第4条自体の再改定は発生していない。

## 6. テスト（件数、カバレッジ、typecheck、lint、実機確認）

- `pnpm test`：369件全て緑（Version24時点321件から+48件）
- `pnpm typecheck`：エラーゼロ
- `pnpm lint`：エラーゼロ
- **実機確認（実HTTPリクエスト、隔離した一時データディレクトリで
  起動した実際のHTTP APIサーバーに対して）**：
  1. `AgentDelegationGrant`作成Proposal（scope: MealLog）→Level2
     分類を確認
  2. Owner承認をシミュレートしてapprove→grant保存（status: Active）
     を確認
  3. `MealLog` Proposal作成→`autoApproved: true`で即時保存される
     ことを確認
  4. 同じ自動承認済みProposalを`approveProposal`へ再送→エラー
     （重複防止）を確認
  5. `GET /meal-logs`で保存されたMealLogが1件取得できることを確認
  6. 同一`idempotencyKey`で再度MealLog Proposalを作成→新規保存
     されず、`GET /meal-logs`が引き続き1件のままであることを確認
     （dedup）
  7. `GET /agent-delegation-grants`で`usageCount`が2（手順3・6の
     自動承認2回分）に増加していることを確認

  全7ステップが設計通りに動作することを確認した。検証用スクリプト・
  隔離データディレクトリは確認後に削除した。

## 7. 修正したバグ（検出方法、原因、対応方法、再発防止）

- **`serializeApproveResult`の実装漏れ**：`http/server.ts`の
  `serializeApproveResult`関数（`approveProposal`の結果をHTTP
  レスポンスへシリアライズする）が、4つの新ProposalTypeのswitch
  caseを欠いたままコンパイルが通っていた。原因は、本プロジェクトの
  tsconfigで`noImplicitReturns`が有効でなく、switch文の
  exhaustiveness checkが型チェック時に働かなかったこと。`pnpm test`
  ・`pnpm typecheck`はいずれも緑のまま検出されず、6章の実機確認
  （実際にHTTP経由でMealLog Proposalを作成し、レスポンス本体まで
  検証）で初めて発覚した。4型分のcaseを追加し、`{ log, deduped }`
  が正しく返ることを確認した。再発防止として、8章に「型チェックだけ
  に頼らず実機確認で応答本体まで検証する」ことを申し送る。

## 8. 技術的負債（今後改善したい点）

- `noImplicitReturns`が無効なため、同様のswitch文（`payloadSchemas`・
  `executeApproval`・`serializeApproveResult`など、`ProposalType`で
  分岐する箇所が複数存在する）に新しい型を追加する際、コンパイラが
  漏れを検出しない。tsconfigで`noImplicitReturns`を有効化することを
  次Version以降で検討する価値がある（本Versionでは既存の全ファイルへ
  の影響範囲調査が必要になるため見送った）。
- Reflection/ChallengeLog（Version24）に続き、今回追加した4 Entity
  にも訂正・削除UseCaseがない（3章参照）。
- `WriteProposalGatewayUseCase`のコンストラクタが14引数になった——
  Version24のReportで指摘した技術的負債（10引数の時点で既に懸念
  表明）がさらに悪化した。パラメータオブジェクト化のリファクタリング
  を次Version以降で検討すべき。

## 9. 次Versionへの申し送り（技術的観点から推奨する事項）

- `WriteProposalGatewayUseCase`のコンストラクタのパラメータ
  オブジェクト化（8章）。
- StudyLog未配線問題（Version23で発見、Repository・UseCase・Route
  が一切ない技術的負債）は、今回も主目的を妨げない範囲での調査に
  留めた——`docs/proposals/life-log-auto-save-delegation.md`3章の
  記録済み調査結果から状況は変わっていない（Repository・UseCase・
  Routeなし、`Reflection.studyMinutes`による部分的な代替のみ）。
  配線するか廃止するかのOwner確認が引き続き必要。
- OAuth本番有効化（Owner自身の手作業、Version24から継続）が完了
  次第、次のセッションでMealLog等の新ProposalTypeについても
  ChatGPT Connector経由での自動保存フローを実機確認すること。

## 10. StudyLog未配線問題（指示書要求事項）

指示書が「今回の主目的を妨げない範囲で調査結果と次Version候補を
報告する」ことを求めていたため、追加調査はせずVersion23の調査結果
（`docs/proposals/life-log-auto-save-delegation.md`3章）を再掲する：
`StudyLog` Entityは存在するがRepository・UseCase・Routeが一切なく
完全に未配線（Version1計画時の先行定義のまま放置）。`Reflection.
studyMinutes`（日次合計）で部分的に代替可能だが、科目別の詳細記録は
できない。配線するか廃止するかはOwner確認が必要な技術的負債として
残っている。

## 11. POへの提案（提案・懸念点・改善案を自由に記載）

- README.mdがVersion22時点から更新されておらず、Version23・24の
  内容が反映されていないことに気づいたため、今回まとめて更新した。
  次Version以降、Version完了フロー（`CLAUDE.md`）のREADME更新
  ステップを確実に実行することを提案する。

## 12. ARCへの引き継ぎ

**新しい資産**：`MealLog`・`NutritionLog`・`WeightLog`・
`FinanceLog`——Owner本人がChatGPTで明示入力した食事・栄養推定・
体重・収支を、有効な`AgentDelegationGrant`の範囲内で個別`do`なしに
記録できる。`nutrition_summary_by_date`で日次の栄養合計を都度取得
できる。

**新しいルール**：`AgentDelegationGrant`の対象拡張は、`scope`型の
拡張と`AUTO_APPROVABLE_TYPES`への型追加だけで完結する汎用的な仕組み
であることが、Version24からVersion25への拡張で実際に検証された。
次に生活記録カテゴリを追加する場合も、同じパターン（Entity設計→
ProposalType追加→scope追加→AUTO_APPROVABLE_TYPES追加）で拡張できる。

**新しい思想**：推定値（栄養）を確定事実と区別する設計
（`estimated`/`basis`/`confidence`の必須化）は、Version24の
Reflection/ChallengeLogでの推定値区別パターンをそのまま踏襲した——
「Owner本人の発言」と「ARCによる推測」を型レベルで区別するという
設計方針が、Life Logの複数カテゴリを跨いで一貫した思想になりつつある。

**Ownerについて分かったこと**：今回、Version25着手前に「B＋C」という
未定義の略語を根拠にした変更提案があった際、Ownerは出所を明確に
確認できない提案には同意せず、Version25の既存承認範囲内の作業のみを
継続対象とする、という明確な線引きを行った。ガバナンスに関わる
判断ほど、根拠の追跡可能性を重視する姿勢が一貫している。

## 13. Product Review

**ユーザー体験で改善されたこと**：ChatGPTで「朝食は卵とトーストだった」
と話すだけで、有効な委譲が設定されていれば、食事記録がProject ARCへ
自動的に保存されるようになった（コードレベルでは完成、OAuth本番
有効化完了後にOwnerが実際に体験できる）。体重・収支も同様。

**毎日使う理由**：食事・体重・収支は日次で発生する記録であり、
Reflection・ChallengeLogに続いてこれらも自動保存の対象になったことで、
「ChatGPTと話すだけで生活記録が溜まっていく」という体験の対象範囲が
大きく広がった。

**懸念**：Version24と同じく、OAuth本番有効化というOwner自身の手作業が
未完了のため、今回実装した機能もまだOwnerが実際に体験できる状態には
なっていない。Version24からこの障壁が2Version続けて残っている。

**次Versionで最も価値が高い改善**：OAuth本番有効化を完了させ、
Version24・25で実装した全ての自動保存機能（Reflection・
ChallengeLog・MealLog・NutritionLog・WeightLog・FinanceLog）を
ChatGPT経由で実際に1回ずつ体験すること。

## 14. 10年後のProject ARCへの貢献

Version24で確立した「型固定Level2ルール＋AUTO_APPROVABLE_TYPES除外」
という二重の安全装置が、新しいカテゴリの追加に対してコード変更量
最小（型の追加のみ）で安全に拡張できることが、今回のVersion25で
実際に証明された。これは「一度正しく設計した安全境界は、範囲を
広げても再検証コストが線形に増えない」という、10年後Project ARCが
さらに多くの生活記録カテゴリを扱うようになったときにも効いてくる
設計上の資産だと考える。

一方で、`WriteProposalGatewayUseCase`のコンストラクタが14引数に
達したことは、同じ拡張パターンを繰り返した結果生じる構造的な負債
でもある。安全性の拡張しやすさと、コードの読みやすさの拡張しやすさは
別の軸であり、10年後も同じパターンで拡張を続けるなら、後者への
リファクタリング投資（8章）を先送りし続けるべきではない、という
教訓を今回のVersionは残した。
