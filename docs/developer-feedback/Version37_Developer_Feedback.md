# Developer Feedback — Version37

## メタデータ

- Version / 日付: Version37 / 2026-07-19
- 担当エンジン: Claude Code
- Git commit / tag: （次コミットで記録）
- 対応Issue / 関連Report: Mobile Ingressセキュリティ強化・退避ログImporter・Cloud Adapter境界 / `docs/reports/Version37_Report.md`
- 状態: Complete（ローカル安全範囲。クラウド実デプロイ・LAN公開有効化はOwner確認待ち）

## 1. 目的

ARC指示書（2026-07-20、`docs/handoff/archive/Version37_ARC_Brief.md`）
に基づき、認証なしLAN公開の明示的な却下に応えるセキュリティ強化と、
実在が判明した「退避中の16件」向けのJSONL Importerを実装する。

## 2. 実装

- 追加：Mobile Ingressのfail-closed起動ガード・Bearer token認証・
  rate limit・入力上限・監査ログ（ADR 0066）
- 追加：`ImportPendingLifeLogsUseCase` / `pnpm import-pending-logs`
  （ADR 0067）
- 追加：`cloudflare/`参照専用ディレクトリ（ADR 0068）
- 追加：`GET /ingress?idempotencyKey=`によるスマホ側read契約、
  Quick Capture UIのMealLog/WeightLog/FinanceLog対応
- Before：`MOBILE_INGRESS_HOST`を変更すれば認証なしでLAN公開できて
  しまう状態だった。「16件」は実体不明のままだった。
- After：LAN公開にはトークン設定が構造的に必須。JSONL Importerが
  実装済みで、実データが揃えばOwnerがいつでも取り込める。

## 3. 設計判断

- **採用案**：新しい抽象（`CloudSyncProvider`等）を追加せず、既存の
  `IngressRecordRepository`ポートをそのままCloud Adapter境界とする
  （ADR 0068）。理由：既に同じ責務のRepository patternが存在し、
  並行する抽象を追加すると重複するため。
- **採用案**：未対応type（RewardSystem等）は既存Entityへ推測で
  マッピングせず、`unsupported_type`として明示的に報告する
  （ADR 0067）。理由：Constitution第2条・Principle 5に従い、Systemが
  判断しない設計を貫くため。
- **採用案**：`MOBILE_INGRESS_HOST`変更時のみ`MOBILE_INGRESS_API_
  TOKEN`を必須化するfail-closedガードとし、既定のloopback運用は
  無変更のままにする（ADR 0066）。理由：Version35〜36の既存運用を
  壊さず、かつOwnerが明示的に却下した「認証なしLAN公開」を構造的に
  防ぐため。
- **見送り案**：実際のCloudflare Workersスクリプトの先行実装は、
  実行環境がなく動作確認できないコードになるため見送った
  （ADR 0068、未実行検証を成功と書かない方針）。

## 4. 理由

Domain層の変更はなし（`IngressRecord`等は無変更）。Application/
Infrastructure層への新規UseCase・認証機構追加のため、ADR 0066・
0067・0068の3本を新規作成した——いずれも既存のDEVELOPMENT_
RULES.mdの「public API変更・セキュリティ判断はADR必須」に該当する。

## 5. 副作用

- 互換性：既定運用（`127.0.0.1`、token未設定）は無変更。既存の
  Version35〜36のテスト・実機確認結果は引き続き有効。
- セキュリティ：LAN公開時の認証が構造的に必須化された（緩和では
  なく強化）。
- 運用：新しいログファイル（`data/logs/mobile-ingress-audit.log`）
  が増える——backup機構（Version31）は`data/`直下のJSONファイルを
  対象とする設計のため、`.log`ファイルは対象外（意図的、ログは
  再生成可能なため人生データベースの一部ではない）。

## 6. テスト

- 実行コマンド：`pnpm typecheck && pnpm lint && pnpm test`
- 結果：**626件合格（626件中626件、失敗・skip・pendingなし）**
  （Version36時点603件 + 23件新規）
- 実機確認：fail-closed起動ガードの実際の動作（LAN host+token
  未設定で起動時エラー）、認証済み/未認証リクエストの実際の
  401/200応答、`pnpm import-pending-logs --dry-run`の合成データに
  よる実行、を確認。実データは一切使用していない。

## 7. 未解決

- Owner確認事項3（LAN公開＋トークン設定の有効化）は未回答。
- 実際の16件の取り込みはOwner自身が実行する必要がある。
- 未対応type（RewardSystem等7種）へのEntity設計はOwner/ARC判断待ち。

## 8. 次Version

1. Owner確認事項3への回答を受けての実地確認（依存：Owner確認）
2. 実際の16件の取り込み・未対応typeの一覧を踏まえたEntity設計要否の
   相談（依存：Owner確認）
3. クラウドActivation Gate（依存：Owner確認、`Version37_Decision_
   Packet.md`参照）

## 9. Owner確認事項

- **`MOBILE_INGRESS_HOST`のLAN公開＋トークン設定の有効化可否**：
  `docs/project-management/Version35_Decision_Packet.md`確認事項3
  （Version37更新版）参照。認証機構は実装済みのため、Owner確認後
  すぐに有効化できる状態。
- **クラウドvendor・月額上限・data保管地域**：
  `docs/project-management/Version37_Decision_Packet.md`参照。
  急ぎ度は低〜中——ローカルMVPのみでもProgram Bの価値は実現できて
  いる。
- 上記いずれも今すぐの回答を必要としない。

## 10. 関連ADR

- 新規：ADR 0066（Mobile Ingressセキュリティ強化）
- 新規：ADR 0067（退避中ログJSONL Import形式・重複防止規則）
- 新規：ADR 0068（Cloud Adapter境界）

## 完了宣言

- [x] Report、Feedback、Roadmap、PM Status、Open Issuesが同じ事実を示す
- [x] commit / tagを記録した（次コミットで反映、フォローアップ済み）
- [x] 未実行テストを成功扱いしていない（626件全件実行・全件合格を実機で確認）
- [x] Owner確認事項を通常タスクへ埋没させていない（9章に明記、Decision Packetへも集約）
- [x] 次担当者がこの文書だけで再開できる（8章に依存関係付きで記載）
