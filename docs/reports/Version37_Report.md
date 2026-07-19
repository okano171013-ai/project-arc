# Version37 Report: Mobile Ingressセキュリティ強化・退避ログImporter・Cloud Adapter境界

commit: `2aed924`

## 1. Version概要

ARCからGit経由で届いた指示書（2026-07-20、`docs/handoff/archive/
Version37_ARC_Brief.md`）に基づき、Version35〜36で完成したMobile
Ingressローカルモデルに対し、(1) 認証なしLAN公開の明示的な却下を
受けたセキュリティ強化、(2) 実在が判明した「退避中の16件」向けの
JSONL Importer、(3) provider-neutralなCloud Adapter境界の整理、
(4) スマホ側read契約の拡張、(5) Quick Capture UIの型拡張、を行った。
クラウド契約・課金・本番公開・秘密情報発行は一切実施していない。

## 2. 今回実装した機能（理由も含めて説明）

- **`validateExposureConfig()`によるfail-closed起動ガード**
  （ADR 0066）：`MOBILE_INGRESS_HOST`を`127.0.0.1`以外へ変更する
  場合、`MOBILE_INGRESS_API_TOKEN`未設定だと起動時に例外で拒否する。
  実機で実際にプロセスが起動時エラーで終了することを確認した。
- **Bearer token認証・rate limit・入力上限・監査ログ**（ADR 0066）：
  `/ingress`系ルートに`Authorization: Bearer <token>`必須化
  （token設定時のみ）、1分30リクエスト/IPのrate limit、64KBの
  body size上限、`data/logs/mobile-ingress-audit.log`への監査記録
  （token値は記録しない）。
- **`ImportPendingLifeLogsUseCase` / `pnpm import-pending-logs`**
  （ADR 0067）：Owner指示書が定義したJSONL形式（`sequence`/`type`/
  `occurredAt`/`content`/`provenance`）を検証・取り込む汎用
  Importer。`idempotencyKey = "pending-life-log:<sequence>"`という
  決定的な重複防止規則を採用。未対応type（RewardSystem等）は
  `unsupported_type`として明示的に報告し、既存の型へ推測で
  マッピングしない。実データはこのリポジトリに一切含めていない
  ——全テストはプレースホルダーの合成データのみを使用。
- **Cloud Adapter境界の明文化**（ADR 0068）：新しい抽象を追加せず、
  既存の`IngressRecordRepository`ポート（Version35）が既に
  provider-neutralな境界であることを文書化した。`cloudflare/`
  ディレクトリへ、ビルド・テスト対象外の参照専用ファイル
  （`README.md`・`wrangler.toml.example`）を追加した——実際の
  Workerスクリプトは未実行検証を避けるため今回書いていない。
- **スマホ側read契約の拡張**：`GET /ingress?idempotencyKey=`で
  自分が送信した1件の状態を確認できるようにした
  （`ListIngressRecordsUseCase`に`idempotencyKey`フィルタを追加）。
  Quick Capture UIに「状態を確認」ボタンを追加し、送信直後に
  ポーリングできるようにした。
- **Quick Capture UIの型拡張**：Reflection単体から、MealLog・
  WeightLog・FinanceLogを選べるようセレクタとフィールドを追加した
  （NutritionLogは既存MealLogとの紐付けが必要なため対象外、3章）。

## 3. 実装しなかった機能（延期理由も記載）

- **クラウドへの実デプロイ**：Owner指示により明示的に対象外。
  `cloudflare/`は参照専用のまま。
- **NutritionLogのQuick Capture対応**：既存の`MealLogId`と紐付ける
  設計のため、Mobile IngressのTransport層（Canonical Storeを直接
  参照しない）からは対応するMealLogを選べず、意味のあるフォームを
  作れない。実運用でのニーズが具体化してから設計する。
- **JSONL Importerでの`content`の深いスキーマ検証**：dry-runの
  検証範囲をTransport層（JSON構文・トップレベルschema・type対応
  確認）までに留め、Entity形状の検証は既存の`pnpm mobile-sync`
  （Canonicalize）に委ねた（ADR 0067、Transport/Canonical分離を
  維持するための意図的な設計）。
- **未対応type（RewardSystem等）への新規Entity設計**：Owner/ARCの
  今後の判断に委ねる。今回は「対応していない」ことを正確に報告する
  ところまでに留めた。
- **実際の16件の取り込み**：実データがこのセッションから見えない
  ため実行不可能。Owner自身が`pnpm import-pending-logs`を実行する。

## 4. Architecture Review

- 変更：`src/infrastructure/http/mobileIngress.ts`（認証・rate
  limit・入力上限・監査ログ・起動ガード・Quick Capture UI拡張）
- 変更：`src/infrastructure/config/env.ts`（`MOBILE_INGRESS_API_TOKEN`
  追加）
- 変更：`src/application/use-cases/mobile-ingress/
  ListIngressRecords.ts`（`idempotencyKey`フィルタ追加）
- 変更：`src/domain/value-objects/BridgeLogType.ts`
  （`ALL_BRIDGE_LOG_TYPES`を実行時定数として昇格）
- 変更：`src/application/use-cases/bridge/ExportLogs.ts`
  （private配列を`ALL_BRIDGE_LOG_TYPES`のimportへ置き換え、重複解消）
- 新規：`src/application/use-cases/mobile-ingress/
  ImportPendingLifeLogs.ts`・`src/infrastructure/cli/
  importPendingLifeLogs.ts`
- 新規：`cloudflare/README.md`・`cloudflare/wrangler.toml.example`
  （参照専用、ビルド・テスト対象外）
- Domain層のEntity（`IngressRecord`等）は無変更——今回は
  Infrastructure層のセキュリティ強化とApplication層の新規
  Importer UseCaseが中心。

## 5. ADR

- **新規：ADR 0066**（Mobile Ingressセキュリティ強化）：fail-closed
  起動ガード、認証・rate limit・入力上限・監査ログの設計判断。
- **新規：ADR 0067**（退避中ログJSONL Import形式・重複防止規則）：
  未対応typeの扱い、dry-runの検証範囲、重複防止ID生成規則。
- **新規：ADR 0068**（Cloud Adapter境界）：新しい抽象を追加せず
  既存の`IngressRecordRepository`を再利用する判断、
  Cloudflareローカル開発用構成の位置づけ。

## 6. テスト

- `pnpm typecheck` / `pnpm lint`：合格
- `pnpm test`：**626件合格（626件中626件、失敗・skip・pendingなし）**
  （Version36時点603件 + 23件新規：Mobile Ingress認証・rate
  limit・body size・監査ログ・read契約テスト12件、
  `validateExposureConfig`単体テスト3件、`ImportPendingLifeLogs`
  UseCase 7件、CLIテスト3件——内訳の合計はテスト間の重複説明を
  避けるため概数）
- **実機確認**：
  - `MOBILE_INGRESS_HOST=0.0.0.0`・token未設定で実際に起動時
    エラーになることを確認
  - `MOBILE_INGRESS_HOST=0.0.0.0`・token設定済みで起動し、
    token無しリクエストが401、正しいtoken付きリクエストが200に
    なることを実際のHTTPリクエストで確認
  - `pnpm import-pending-logs -- <合成データのfixture> --dry-run`
    を実際に実行し、対応済みtype（FinanceLog/Reflection）は
    `validated`、未対応type（Wishlist）は`unsupported_type`として
    正しく報告されることを確認
  - 検証用スクリプト・データは確認後に削除済み（実データは
    一度も使用していない）

## 7. 修正したバグ（検出方法、原因、対応方法、再発防止）

なし。今回は新規実装が中心で、実装中に発見した既存の不具合はない。
（`ALL_BRIDGE_LOG_TYPES`の重複private配列は「バグ」ではなく
リファクタリング機会として3箇所目の利用者ができたタイミングで
解消した——ADR 0067の副産物。）

## 8. 技術的負債（今後改善したい点）

- Mobile Ingressの認証は単一の共有シークレット（Bearer固定文字列）
  ——本番クラウド化時はより堅牢な認証への置き換えが前提（ADR 0066）。
- NutritionLogのQuick Capture対応は未設計のまま。
- 未対応type（RewardSystem等7種）へのEntity設計はOwner/ARC判断待ち。
- rate limitはin-memoryのため、プロセス再起動でカウンタがリセット
  される（単一プロセス・低trafficのローカル運用では実害は限定的）。

## 9. 次Versionへの申し送り（技術的観点から推奨する事項）

- Owner確認事項3（LAN公開＋トークン設定）の回答を受けて、実際に
  スマートフォンから送信できることを実地確認する。
- 実際の16件を`pnpm import-pending-logs`で取り込み、未対応typeの
  一覧を踏まえて新規Entity設計の要否をOwner/ARCと相談する。
- クラウドActivation Gateへ進む場合、`IngressRecordRepository`を
  実装する`CloudflareKvIngressRecordRepository`（または D1版）を
  実装する（ADR 0068の見取り図参照）。

## 10. POへの提案（提案・懸念点・改善案を自由に記載）

- セキュリティ強化（トークン必須化）により、スマホからの実送信の
  ハードルが「LAN公開の判断」だけでなく「トークンの手入力」も
  加わった。UXとしては一手間増えるが、認証なし公開のリスクとの
  トレードオフとして妥当だと考える。
- 「退避中の16件」の実データは今回のセッションから終始見えない
  ままだった——実際に取り込んでみて初めて、未対応typeの実際の
  比率や、新規Entity設計の優先度が見えてくると思われる。

## 11. CEOへのコメント（今回の成果、次Versionへの期待）

Owner指示書が「承認しない」と明確に線を引いた箇所（認証なしLAN
公開）に対し、警告や文書化に留めず、fail-closedな起動ガードという
コードレベルの強制力で応えられたのが今回の一番の成果だと考える。
「16件」についても、実データが見えない制約の中で、推測に頼らず
「未対応typeは未対応と正確に報告する」という設計に徹したことで、
Constitution第2条・Principle 5との整合性を保ったまま実用的な
Importerを完成させられた。

## 12. ARCへの引き継ぎ（Owner追加指示、2026年7月）

- **新しい資産**：`pnpm import-pending-logs`——退避中ログを安全に
  検証・取り込める汎用Importer。実データが揃えばOwnerがいつでも
  実行できる。
- **新しいルール**：「公開範囲を広げる操作には、Owner本人の意図的な
  追加設定（トークン等）を構造的に必須化する」というパターンが
  確立した（ADR 0066）——`ARC_API_KEY`のopt-in、`MCP_OAUTH_ENABLED`
  のfail-closedに続く3つ目のバリエーション。
- **新しい思想**：「未対応の型を推測でマッピングしない」という
  Constitution第2条の適用が、JSONL Importerという新しい文脈でも
  一貫して機能することを確認した——退避ログの16件のうち、既存
  Entityに対応するもの以外は「取り込まない」という結果になるが、
  これは失敗ではなく正しい振る舞いである。
- **Ownerについて分かったこと**：Version36で仮に開けた設計判断
  （LAN公開opt-in）に対し、実際に使う段階になって具体的なリスク
  （認証なし公開）を明確に指摘し「承認しない」と線引きする、という
  段階的なレビューの仕方が観察された。

## 13. Product Review（Owner追加指示、2026年7月）

- **ユーザー体験で改善されたこと**：Before：スマホからの実送信は
  設計上可能だが認証なしという不安が残る状態だった。After：
  トークンさえ設定すれば、認証付きで安全にスマホから送信できる
  状態になった（実地確認はOwner確認後）。
- **毎日使う理由**：Quick Capture UIがReflection以外（食事・体重・
  支出）にも対応したことで、より多様な日常ログをその場で送れる
  ようになった。
- **懸念**：トークンをスマホのブラウザへ毎回手入力する運用は
  やや煩雑——`localStorage`に保存されるため2回目以降は不要だが、
  複数デバイスを使う場合はデバイスごとに設定が必要。
- **次Versionで最も価値が高い改善**：実際に16件を取り込んでみて、
  Owner自身がどの型が本当に必要かを確認すること。

## 14. 10年後のProject ARCへの貢献（Owner追加指示、2026年7月、Version9より）

「境界を広げる操作には、その操作自体が新しい前提条件を構造的に
要求する」という設計パターン（fail-closed起動ガード）が、10年後も
安全な拡張の型として機能し続けると考える。将来さらに公開面が
増えても、同じパターン（既定は閉じる、拡張には明示的な追加設定を
必須化する）を適用すればよい。

「人生OS」というVisionから逆算すると、今Versionは「善意の設計判断
（Version36のopt-in）を、実際の運用に近づく段階でより厳格な形へ
締め直す」という、成熟のための石だった。機能を増やすことよりも、
既に作った機能の安全性を一段深める判断の方が、長期的な信頼性に
直結する。
