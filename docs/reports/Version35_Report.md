# Version35 Report: Program B Mobile Ingressローカルモデル

commit: `0b7db63`

## 1. Version概要

Owner優先順位（2026-07-19）に従い、技術的負債の細部ではなく
Program B（Mobile Daily Capture、日常ログの参照・保存）を最優先で
進めたVersion。Architecture Gateの論点整理（無料枠優先のcloud比較、
月額上限0円を初期既定とする方針、ADR 0064）とMobile Ingressの
データ契約（受信・idempotency・競合検出・待機/失敗状態、ADR 0065）を
確定し、**PCが停止していてもスマホから生活ログを受け取れる仕組み**を
完全ローカルのMVPとして実装した。クラウド契約・課金・本番公開・
秘密情報設定は一切実施していない。

着手前に、直前セッションで報告した「テスト576件中573件green（新規
3件）」という表現が「3件失敗/skip」と読める曖昧な言い方だった点を
Ownerから指摘され、`pnpm test`を再実行して**573件中573件が合格
（失敗・skip・pendingなし）**であることを確認した——表現の誤りであり
実際のテスト不備ではなかった。

## 2. 今回実装した機能（理由も含めて説明）

- **`IngressRecord`Entity**（`src/domain/entities/IngressRecord.ts`）：
  `Accepted → Canonicalized | Pending | Failed`の状態機械。
  `AgentTask`（Version33）で確立したcircuit-breakerパターン
  （`MAX_RETRY`、規定回数失敗で`retry()`を拒否）をそのまま踏襲し、
  1回目のテストで状態遷移バグなく通した（同種バグを踏んだVersion33の
  教訓——`LEGAL_TRANSITIONS`の抜け漏れ確認——を先に適用した結果）。
- **`BridgeLogType`のDomain層への移設**：`IngressRecord`が
  `payloadType`として必要としたが、元の置き場所
  （`application/use-cases/bridge/`）はApplication層であり、Domainが
  Applicationに依存する向きの誤りになるため、Domain層
  `value-objects/`へ`git mv`した。あわせて`MealLog`・
  `NutritionLog`・`WeightLog`・`FinanceLog`・`StudySession`の5型を
  Union・Import/Export UseCaseへ追加し、Bridge Layer（Version9）が
  Version9〜27間で追いついていなかったギャップを解消した——これに
  よりMobile IngressのCanonicalize処理が既存の`ImportLogsUseCase`へ
  そのまま委譲できるようになった（ADR 0065の設計判断）。
- **Mobile Ingress受信サーバー**（`src/infrastructure/http/
  mobileIngress.ts`、`pnpm mobile-ingress`）：`127.0.0.1`限定の素の
  `node:http`サーバー。`POST /ingress`（`idempotencyKey`重複時は
  201ではなく200で既存レコードを返す）、`GET /ingress?status=`、
  `GET /health`。
- **Sync Worker（ローカルMVP）**（`src/infrastructure/cli/
  mobileSync.ts`、`pnpm mobile-sync [sync|list|resolve|retry]`）：
  PC起動時に`Accepted`状態のレコードをCanonicalize。`Reflection`
  payloadは`reflectionRepository.findByDate`で事前に競合を検出し
  `Pending`へ、それ以外は`ImportLogsUseCase`へ委譲して成功なら
  `Canonicalized`・失敗なら`Failed`。`resolve <id> accept|discard`で
  Owner解決、`retry <id>`で失敗レコードの再試行を提供する。
- **`serializeIngressRecord`**（`serializers.ts`）：実機デモ中に
  `list`コマンドがEntityの`private`フィールドをそのまま
  `JSON.stringify`していた不具合を発見・修正する過程で追加（7章）。

## 3. 実装しなかった機能（延期理由も記載）

- **クラウドへのデプロイ・Activation Gate**：Owner指示により明示的に
  対象外。ADR 0064はCloudflare Workersを暫定候補として仮置きしたのみ
  で、vendor確定・実デプロイ・cost上限確定はOwner確認事項として
  `Version35_Decision_Packet.md`に集約した。
- **「現在退避中の16件」のimport**：Owner指示にあったが、リポジトリ
  全体を検索してもデータ本体・形式仕様が見つからなかった。取り込み
  経路自体（既存Bridge Layer経由）は設計済みのため、実体が判明次第
  Version36以降で対応できる。Owner確認事項として`Version35_Decision_
  Packet.md`・STATUS.md（ARC-PM-014）に明記した。
- **Mobile Ingressの認証**：`127.0.0.1`限定のためVersion35時点では
  意図的に未実装（8章の脅威モデル参照）。将来クラウド化する際に
  改めて設計する。
- **`retry`のCLI経由の自動実行**：手動実行のみ。定期実行の自動化は
  ローカルMVPの完成度を高めるVersion36以降の検討事項。

## 4. Architecture Review

- 新規Domain：`IngressRecord`Entity（`src/domain/entities/
  IngressRecord.ts`）
- 移設：`BridgeLogType`（`application/use-cases/bridge/` →
  `domain/value-objects/`）、Union拡張（5型追加）
- 新規Application：`IngressRecordRepository`ポート、
  `ReceiveIngressRecord`・`SyncIngressRecords`・
  `ResolveIngressRecord`・`RetryFailedIngressRecord`・
  `ListIngressRecords`の5 UseCase（`use-cases/mobile-ingress/`）
- 新規Adapters：`JsonFileIngressRecordRepository`
- 新規Infrastructure：`http/mobileIngress.ts`（受信サーバー）、
  `cli/mobileSync.ts`（Sync Worker CLI）
- 変更：`ImportLogsUseCase`・`ExportLogsUseCase`（5型対応拡張）、
  `serializers.ts`（`serializeStudySession`・
  `serializeIngressRecord`追加）、`http/server.ts`・`cli/bridge.ts`
  （Repository配線拡張）、`package.json`（`mobile-ingress`・
  `mobile-sync`スクリプト追加）
- Mobile IngressはRemote MCP・Capability Registryの一部ではない
  （`127.0.0.1`限定のローカルツールのため）——`MCP_TOOL_NAMES`・
  `PROJECT_ARC_VERSION`は無変更。

## 5. ADR

- **新規：ADR 0064**（Program B Architecture Gate、Zero-Cost Default）
  ：Cloudflare Workers+KV/D1・Supabase Edge Functions・Vercel
  Functionsを無料枠条件で比較。今回はvendorを確定させず、$0/月の
  ローカルMVPをデフォルトとし、Cloudflare Workersを将来のActivation
  Gate候補として仮置きするに留めた。「PC停止中の可用性」要件は、
  自宅PC自体が電源オフになる$0のホームデバイス案とは原理的に両立
  しない点を明記した。
- **新規：ADR 0065**（Mobile Ingressデータ契約）：`IngressRecord`の
  状態（`Accepted|Canonicalized|Pending|Failed|Discarded`）、
  `payloadType`が既存`BridgeLogType`を再利用する設計、競合検出は
  事前チェック方式（エラー文字列パターンマッチではない）とする方針、
  受信・読み取り・Sync・Pending解決の各APIを規定。Status: Accepted。
- ADR 0059（Mobile Ingress as Transport vs Canonical Store、
  Version31策定）は今回のMVPで初めて実装により裏付けられた
  ——`data/ingress-records.json`は一時的な受信箱、`data/
  reflections.json`等の既存Repositoryが唯一のCanonical Store
  （Constitution第1条）であることをコードレベルで維持した。

## 6. テスト

- `pnpm typecheck` / `pnpm lint`：合格
- `pnpm test`：**602件合格（602件中602件、失敗・skip・pendingなし）**
  （Version34時点573件 + 29件新規：`IngressRecord.test.ts`11件、
  `MobileIngress.test.ts`7件、`mobileIngress.test.ts`（HTTPサーバー）
  5件、`mobileSync.test.ts`4件、`Bridge.test.ts`拡張2件）
- **実機確認**：`pnpm mobile-ingress`と`pnpm mobile-sync`を実際に
  起動し、(1)受信→`GET /ingress`での確認、(2)同一`idempotencyKey`の
  再送が新規レコードを作らないこと、(3)`pnpm mobile-sync sync`が
  `Reflection`を実際にCanonicalizeし`data/reflections.json`へ反映
  すること、(4)既存日付との競合が`Pending`になること、(5)
  `resolve accept`で上書き・`resolve discard`で既存データ保持、
  (6)MAX_RETRY到達後の`Failed`固定化、(7)`pnpm backup create`実行時に
  `data/ingress-records.json`が追加コード無しで自動的にbackup対象へ
  含まれること、を一つずつ手動で確認した。

## 7. 修正したバグ（検出方法、原因、対応方法、再発防止）

- **`mobileSync.ts`の`list`コマンドがEntity private fieldを漏洩**：
  実機デモで`pnpm mobile-sync list Pending`を実行したところ、
  `_id`・`_data`・`_status`等の内部フィールド名がそのまま出力
  された。原因はCLIの出力パスが`ListIngressRecordsUseCase`の戻り値
  （`IngressRecord[]`）を`serializers.ts`を経由せず直接
  `JSON.stringify`していたため——TypeScriptの`private`は実行時の
  制約ではないという、このファイル自身のヘッダーコメントに明記
  されている既知の落とし穴を今回も踏んだ形になった。
  `serializeIngressRecord()`を追加し、`list`ケースで
  `result.records.map(serializeIngressRecord)`を通すよう修正、
  再実行してクリーンな出力を確認した。この種のバグは自動テストでは
  見つけにくく（レスポンス型を`unknown`のまま比較していれば通って
  しまう）、実機確認（`docs/HISTORY.md`が繰り返し強調する文化）で
  実際に見つけた。

## 8. 技術的負債（今後改善したい点）

- ARC-PM-014（新規）：「現在退避中の16件」の実体不明。判明次第
  Version36以降で対応。
- Mobile Ingressの認証は未実装（`127.0.0.1`限定のため現状は許容、
  クラウド化時に再設計必須）。
- `retry`は手動実行のみ、定期実行の自動化は未実装。
- 既存の技術的負債（P1: build/契約同期/巨大module/model重複/
  release管理、P2: 命名/template/apiKeyAuthのtiming-safe化等）は
  Version35のスコープ外のまま。

## 9. 次Versionへの申し送り（技術的観点から推奨する事項）

- Version36として、Mobile Ingressローカルモデルの完成度を高める
  （Owner指示により継続可）：`retry`の定期実行、Sync実行結果の
  Owner向け通知、`resolve accept`の対象payloadType拡張
  （現状Reflectionのみ）等が候補。
- クラウドActivation Gateへ進む場合は、`Version35_Decision_Packet.md`
  のOwner確認事項（vendor確定、cost上限、data保管地域）が前提条件。
- 「16件」の実体が判明した際は、既存Bridge Layer（`ImportLogsUseCase`）
  経由でMobile Ingressの`payloadType`として取り込めるよう設計済み
  のため、追加設計なしで対応できる見込み。

## 10. POへの提案（提案・懸念点・改善案を自由に記載）

- ローカルMVPは「PC起動時に手動で`pnpm mobile-sync`を叩く」運用の
  ため、実際にスマホから使うにはまだOwnerの能動的な操作が必要。
  日常的に使うには、最低限PC起動時の自動sync（Windowsタスク
  スケジューラ等）が次の価値の高い改善だと考える。
- スマホ側からPOSTする実際のクライアント（ショートカット・簡易Web
  フォーム等）はVersion35のスコープ外——「受け皿」は完成したが
  「送る側」がまだない。

## 11. CEOへのコメント（今回の成果、次Versionへの期待）

Program Bの核心的な難しさ（PC停止中の可用性と$0コストの両立が
原理的に不可能という制約、ADR 0064）を正面から言語化した上で、
「今すぐクラウドを選ばない」という決定を先送りではなく設計判断として
下せたのが今回の一番の成果だと考える。既存資産（Bridge Layer、
circuit-breakerパターン、atomic書き込み、backup自動対象化）を新規
実装せず再利用しきれたことで、実装量の割に一貫性の高い設計になった。

## 12. ARCへの引き継ぎ（Owner追加指示、2026年7月）

- **新しい資産**：Mobile Ingressで受信した生活ログ
  （`data/ingress-records.json`、`Accepted|Canonicalized|Pending|
  Failed|Discarded`状態付き）。ただし現時点ではARCから直接読める
  MCP Tool配線はない（`127.0.0.1`限定のローカルツールのため）。
- **新しいルール**：Transport（`IngressRecord`）とCanonical Store
  （既存JSON Repository）を明確に分離し、Transport側は判断せず
  Pendingとして待たせる、という設計原則が実装レベルで確立した
  （ADR 0059・0065）。今後クラウド化する際もこの分離は維持する。
- **新しい思想**：「PCが止まっていても人生の記録を取りこぼさない」
  という要件と、「Owner主権・Systemは判断しない」という原則
  （Constitution第2条）は、競合検出を`Pending`に倒すことで両立
  できることが今回実装レベルで確認できた。
- **Ownerについて分かったこと**：曖昧な報告表現（テスト件数の
  「573件green（新規3件）」）を見過ごさず即座に確認を求める一方、
  その確認だけでは作業を止めず本題（Program B）を優先させる、
  という運用判断の速さが観察された（事実ベースの記述、Principle 5）。

## 13. Product Review（Owner追加指示、2026年7月）

- **ユーザー体験で改善されたこと**：Before：スマホで気づいた生活の
  出来事はPCを開くまで記録できなかった。After：PCが停止していても
  スマホから送信でき、PC起動時に自動でCanonicalizeされる
  （ただし送信側クライアントは未実装、10章参照）。
- **毎日使う理由**：既存のMorning Brief / Reflectionへ、PC不在時の
  記録という新しい入口が加わったが、実際に「毎日使う」ためには
  送信側UIとsync自動化が必要（次Versionの課題）。
- **懸念**：現状は`curl`等での手動POSTでしか検証していない
  ——実際のスマホからの使用感（フォームの使いやすさ等）は未検証。
- **次Versionで最も価値が高い改善**：PC起動時のsync自動実行
  （手動`pnpm mobile-sync`を廃止する）。

## 14. 10年後のProject ARCへの貢献（Owner追加指示、2026年7月、Version9より）

Mobile Ingressを独立したTransport層として設計し、Canonical Storeを
一切汚染しない形に保った判断が、10年後も効いてくると考える。将来
クラウドやモバイルアプリ等、記録の「入口」が増えても、Canonical
Storeへの書き込みは常に同じBridge Layer経由という一本の経路に
収束させられる。

「人生OS」というVisionから逆算すると、今Versionは「複数の入口を
持ちながら記録の一貫性を保つ」ための接続点に位置する石だった。
機能の派手さより、Transport/Canonicalの境界を最初から明確に
引いたことの方が、将来の拡張（Apple Health連携、他デバイスからの
入力等）を安全に受け入れる土台として効いてくる。
