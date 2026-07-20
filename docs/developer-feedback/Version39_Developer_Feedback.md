# Developer Feedback — Version39

## メタデータ

- Version / 日付: Version39 / 2026-07-20
- 担当エンジン: Claude Code
- Git commit / tag: `61f0055`
- 対応Issue / 関連Report: Cloud Quick Capture & PC-off Gap Closure / `docs/reports/Version39_Report.md`
- 状態: Complete（ローカル・Miniflareエミュレータ検証のみ。実デプロイはOwner確認待ち）

## 1. 目的

ARC指示書（2026-07-20）に基づき、Version38が「クラウド待機キュー
まで」だった状態から一歩進め、スマホから直接使えるCloud Quick
Capture UIをCloudflare Worker側に実装する。あわせて「PC-off対応
完了」という曖昧な表現を避けるため、保存の3段階（cloud ingress
受付／canonical ARC確定／read availability）を明示的に分解した
Capability/Gap表と、Canonical Store所在の3案比較ADRを作成する。

## 2. 実装

- 新規：`src/infrastructure/http/quickCaptureHtml.ts`
  （`renderQuickCaptureHtml(nonce)`、ローカル・cloud共通のUI
  レンダリング関数）
- 新規：`cloudflare/preflight.ts`（`pnpm cloudflare:preflight`、
  読み取り専用のデプロイ前チェック）
- 変更：`mobileIngress.ts`（UI実装を共通モジュールへ切り出し、
  CSPヘッダー追加）・`worker.ts`（`GET /`追加、CSPヘッダー追加）
- Before：cloud Worker側にUIは存在せず、スマホからはローカル版
  （LAN内のみ）しか使えなかった。トークンの扱い・CSPは未整備。
- After：cloud Worker単体でQuick Capture UIが完結する
  （デプロイ後すぐ使える）。トークンは既定非永続・opt-in、CSPは
  per-request nonceで`'unsafe-inline'`なし。

## 3. 設計判断

- **採用案**：UIレンダリング関数をNode/Workers両ランタイムから
  importできる純粋関数として共通モジュール化する。理由：同じUI
  （5type明示選択・自動推測なし）を2つのランタイムで実装すると
  ドリフトリスクが大きく、`renderQuickCaptureHtml`自体はNode固有
  API・Workers固有APIのどちらにも依存しない文字列生成に過ぎない
  ため、共通化のコストが極めて低いと判断した。
- **採用案**：Tokenは既定でlocalStorageへ保存しない。理由：Owner
  指示2が「初回手入力を基本とし、既定では永続保存しない」ことを
  明示していたため。opt-inする場合も危険性の説明・消去操作を
  必須とした。
- **採用案**：CSPはper-request nonceで`script-src`/`style-src`を
  制限し、`'unsafe-inline'`を使わない。理由：静的HTMLで反射型XSSの
  攻撃面はそもそも小さいが、Owner指示3が明示的にCSP対応を求めて
  おり、defense-in-depthとして実装コストも小さいため。
- **採用案**：ADR 0071でCanonical Store所在の3案を比較したが、
  現行案（案B、Transport queueのみcloud）を維持する。理由：案A
  （全面cloud移行）は個人情報露出・バックアップ・費用$0制約の
  いずれとも既存原則と衝突し、Constitution/Principlesレベルの
  Owner合意なしに選択すべきでないと判断したため。案C（Hybrid）は
  将来検討候補として記録するに留めた。
- **見送り案**：`'unsafe-hashes'`でinline style属性のCSP違反を
  回避する案は、nonce方式より防御力が弱く、根本原因（CSSクラス化
  していないこと）を修正する方が保守性も高いため見送った。

## 4. 理由

新しい公開面（Cloud Quick Capture UI）とセキュリティ判断
（CSP nonce方式、token非埋め込み設計）を含むため、ADR 0070を
新規作成した。Canonical Store所在という構造判断のため、ADR 0071を
新規作成した（いずれもDEVELOPMENT_RULES.mdの「セキュリティ判断・
構造判断はADR必須」に該当）。`docs/security/remote-mcp-threat-model.md`
に12章として実機検証結果を記録した。

## 5. 副作用

- 互換性：既存のPOST `/ingress`・GET `/ingress`の挙動には影響
  なし。GET `/`は新規ルートの追加のみ。
- セキュリティ：新規公開面（`GET /`）が増えたが、認証不要の静的
  HTML配信のみであり、`POST /ingress`等の既存の認証・rate limit・
  入力上限には変更がない。CSPヘッダーは追加防御であり、既存の
  挙動を弱めるものではない。
- 運用：`cloudflare:preflight`は`pnpm typecheck`/`pnpm test`等の
  既存gateには組み込んでいない（明示的に別コマンド、Owner自身が
  デプロイ判断時に実行する想定）。

## 6. テスト

- 実行コマンド：`pnpm typecheck && pnpm lint && pnpm test`、
  `pnpm cloudflare:typecheck && pnpm cloudflare:test`、
  `pnpm cloudflare:preflight`
- 結果：メイン**642件合格**（Version38時点640件+2件）、
  cloudflare**17件合格**（Version38時点14件+3件）、共に失敗・
  skip・pendingなし。`cloudflare:preflight`は正常に実行でき、
  `wrangler.toml`未作成（実デプロイ前の正常な状態）以外は全項目OK
  だった。
- ARC-PM-005（`pnpm build`のTS2742失敗）は、本Versionの変更を
  `git stash`した状態でも再現することを確認し、無関係であることを
  再確認した。
- 実機確認：Playwrightヘッドレスブラウザでローカル版・cloud版
  （Miniflare）両方のQuick Capture UIを実際に操作し、CSP・
  token opt-in/永続化/消去・オフライン再送を確認。この過程で
  2件のバグ（CSP inline-style属性ブロック、非表示fieldset内の
  `required`によるフォーム全体ブロック）を発見・修正した
  （Report7章）。

## 7. 未解決

- (b) canonical ARC確定・(c) 全生活履歴read availabilityのPC-off化
  は未達のまま（ADR 0070、意図的にスコープ外）。
- ADR 0071の案C（Hybrid read-through cache）は将来検討候補のまま
  未実装。
- 実際のCloudflareアカウントでの動作は未検証（Miniflareのみ、
  Version38から継続）。

## 8. 次Version

1. Owner確認後、`Version38_Activation_Packet.md`の手順で実際に
   デプロイし、Cloud Quick Capture UIの実地確認を行う
   （依存：Owner確認・アカウント作成）
2. ADR 0071の案C（Hybrid read-through cache）を実装するかどうか、
   Owner/ARCと相談する（依存：Owner/ARCの価値判断）
3. 「16件」の実取り込み（Version37から継続、依存：Owner確認）

## 9. Owner確認事項

- **実際のCloudflareデプロイの実行可否**：
  `docs/project-management/Version38_Activation_Packet.md`
  （実行手順1ページ、Version39時点でも内容は変わらず有効）参照。
  アカウント作成・secret設定・デプロイはいずれもOwner自身の操作が
  必要。デプロイすれば、追加設定なしですぐにCloud Quick Capture UI
  （`GET /`）が使える状態になっている。急ぎ度：低〜中——ローカル
  Mobile Ingress（Version35〜38）だけでもProgram Bの価値は引き続き
  機能している。
- **ADR 0071・案C（Hybrid read-through cache）を将来検討するか**：
  「PC停止中でも直近の記録が届いたか確認できる」体感を改善しうる
  次点候補として記録した。実装するかどうかはOwnerの優先度判断
  次第——急ぎ度：低。
- Version37・38から継続する確認事項（LAN公開＋トークン設定の
  有効化、16件の実取り込み）は変化なし。

## 10. 関連ADR

- 新規：ADR 0070（Cloud Quick Capture UI・Capability/Gap表）
- 新規：ADR 0071（Canonical Store所在比較、実移行なし）

## 完了宣言

- [x] Report、Feedback、Roadmap、PM Status、Open Issuesが同じ事実を示す
- [x] commit / tagを記録した（`61f0055`）
- [x] 未実行テストを成功扱いしていない（642件+17件全件実行・全件合格を実機で確認）
- [x] Owner確認事項を通常タスクへ埋没させていない（9章に明記）
- [x] 次担当者がこの文書だけで再開できる（8章に依存関係付きで記載）
