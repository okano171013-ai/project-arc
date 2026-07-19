# Version37 ARC Brief

## Theme

Program B Activation準備（Mobile Ingressセキュリティ強化・退避中16件・Cloud Adapter境界）

## Goal（原文、2026-07-20）

Version35・36を受領した。Owner判断は以下で確定する。

1. Ownerの最優先要件は「PC停止中でもスマホからアークの日常ログを
   参照・保存できること」。したがってローカルMVPで止めずCloud
   Activation Gateへ進む。初期月額上限は0円。契約・アカウント
   作成・deployはまだ行わない。Cloudflare Workers + D1/KVを暫定
   第一候補としつつ、provider固有処理はAdapterへ隔離して移行
   可能性を保つ。
2. 認証なしの`MOBILE_INGRESS_HOST=0.0.0.0`有効化は承認しない。
   LAN公開・クラウド公開より先に、Mobile Ingress専用のfail-closed
   認証、rate limit、入力上限、監査、secret非表示を設計・実装・
   否定テストする。実際の`.env`変更・秘密情報発行・LAN公開は
   Owner確認まで保留する。
3. 退避中16件は存在する。公開GitHubへ個人データを置かない方針で、
   OwnerのCodex workspaceに
   `project-arc-pending-life-logs-2026-07-20.jsonl`として保管済み。
   各行は`sequence`、`type`、`occurredAt:null`、`content`、
   `provenance:"chat_summary_queue"`。型はMealLog、FinanceLog、
   Reflection、RewardSystem、BudgetRule、Wishlist、Preference、
   SkincareRoutine、AppearanceAssessment、PersonalCareInventory、
   AppearanceLogを含む。実データをGitへcommitしないこと。まず
   この形式を安全に検証・dry-run importできるImporterと重複防止
   ID生成規則を実装し、実取り込みは安全なローカル受け渡しまたは
   認証済み接続後に行う。

Version37では、(a) Quick CaptureをReflectionだけでなく現行の安全な
正式型（MealLog、NutritionLog、WeightLog、FinanceLog、Reflection）
へ拡張、(b) JSONL importerのschema validation・dry-run・部分失敗
報告・idempotency、(c) Mobile Ingress専用認証と否定テスト、
(d) provider-neutralなCloud Adapter境界とCloudflareローカル開発用
構成、(e) スマホからのread契約、(f) cloud activationに必要な
手作業・無料枠・データ保管・rollbackを1ページのDecision Packetへ
整理する。

全テストが603/603成功、失敗・skip・pendingなしであることは確認済み。
設計・ローカル実装・mock/emulator・無料かつ可逆な検証は返答待ちで
停止せず進める。費用、アカウント作成、秘密情報発行、本番/LAN公開、
不可逆操作、Constitution/Principles変更のみOwnerへ確認する。完了時は
Report、Developer Feedback、STATUS、Roadmap、ADR、脅威モデルを更新
する。

## Acceptance criteria

- 認証なしLAN公開が構造的に不可能になっている（fail-closed）
- rate limit・入力上限・監査ログの実装と否定テスト
- 退避中16件のJSONL Importer（schema検証・dry-run・部分失敗報告・
  重複防止）、実データは含めない
- provider-neutralなCloud Adapter境界の整理
- Quick Capture UIのMealLog/WeightLog/FinanceLog対応
- スマホ側read契約
- Cloud Activation Decision Packet（1ページ）
- クラウド契約・課金・本番公開・秘密情報設定を一切実施しない

## Result

（a）Quick Capture UIをMealLog/WeightLog/FinanceLog/Reflectionへ
拡張（NutritionLogは既存MealLogとの紐付けが必要なため対象外、理由を
Reportに明記）。（b）`ImportPendingLifeLogsUseCase`・`pnpm
import-pending-logs`を実装——`idempotencyKey = "pending-life-log:
<sequence>"`という決定的な重複防止規則を採用、未対応type
（RewardSystem等）は自動マッピングせず`unsupported_type`として
明示報告（ADR 0067）。（c）`validateExposureConfig()`による
fail-closed起動ガード、Bearer token認証、rate limit（30req/分/IP）、
入力上限（64KB）、監査ログ（token値は記録しない）を実装・否定
テスト済み（ADR 0066）。実機で`MOBILE_INGRESS_HOST=0.0.0.0`・
token未設定の組み合わせが起動時エラーで終了することを確認。
（d）新しい抽象は追加せず、既存`IngressRecordRepository`
ポートをprovider-neutralな境界として明文化（ADR 0068）。
`cloudflare/`配下に参照専用のREADME・wrangler.toml.exampleを追加
（ビルド・テスト対象外、実Workerスクリプトは未実行検証を避けるため
書いていない）。（e）`GET /ingress?idempotencyKey=`によるread契約、
Quick Capture UIに状態確認ボタンを追加。（f）`docs/project-
management/Version37_Decision_Packet.md`を作成。

全626件のテスト合格（Version36時点603件+23件新規）。実データは
このセッションから見えないため一切扱っていない——テストは全て
プレースホルダーの合成データのみ。クラウド契約・課金・本番公開・
秘密情報設定は未実施のまま。詳細は`docs/reports/Version37_Report.md`
・ADR 0066〜0068・`docs/project-management/Version37_Decision_
Packet.md`参照。
