# ADR 0066: Mobile Ingressのセキュリティ強化（認証・rate limit・監査ログ）

## ステータス

Accepted

## 関連Principle・ADR

- Constitution第2条（Systemは判断しない）
- ADR 0064（Program B Architecture Gate、Zero-Cost Default）
- ADR 0065（Mobile Ingressデータ契約）
- ADR 0067（退避中ログJSONL Import形式）
- 既存のopt-in設計規約：`ARC_API_KEY`（Version15）、
  `MCP_OAUTH_ENABLED`（Version22、fail-closed）

## コンテキスト

Version36で`MOBILE_INGRESS_HOST`環境変数を追加し、`0.0.0.0`等へ
変更すればLAN内の他デバイスから到達可能にできる設計にした。しかし
認証機構は未実装のままだった。Owner指示書（2026-07-20、`docs/
handoff/archive/Version37_ARC_Brief.md`）はこれを明示的に却下し、
「認証なしの`MOBILE_INGRESS_HOST=0.0.0.0`有効化は承認しない。
LAN公開・クラウド公開より先に、Mobile Ingress専用のfail-closed
認証、rate limit、入力上限、監査、secret非表示を設計・実装・否定
テストする」と指示した。

## 決定

### 1. Fail-closed起動ガード（`validateExposureConfig()`）

`MOBILE_INGRESS_HOST`を既定値（`127.0.0.1`）以外へ変更する場合、
`MOBILE_INGRESS_API_TOKEN`が未設定だと**起動時に例外を投げてプロセスを
終了させる**。既定のloopback運用では無トークンのまま動作し、
Version35〜36の既存運用を壊さない。

`STUDY_TIMER_API_TOKEN`（Version27、常にfail-closed）と`ARC_API_KEY`
（Version15、既定open・opt-in）のどちらとも異なる、第三のパターン
——**「デフォルトはopen（127.0.0.1限定という前提の上で）、しかし
その前提（loopback限定）自体を変える場合は構造的に認証を強制する」**
という設計を採用した。理由：Mobile Ingressは既定運用（PC上での
ローカル利用）では引き続き摩擦なく使えるべきだが、公開範囲を広げる
という「一線を越える」操作には、Owner本人の意図的な設定
（`MOBILE_INGRESS_API_TOKEN`）を伴わせることで、設定ミスによる
無自覚な公開を構造的に防ぐ。

### 2. 認証（`Authorization: Bearer <token>`）

`MOBILE_INGRESS_API_TOKEN`設定時、`POST /ingress`・`GET /ingress`の
両方でBearer token必須とする（`GET /health`・`GET /`は対象外——
前者はヘルスチェック、後者は静的HTMLで個人データを含まないため）。

### 3. Rate Limit（固定ウィンドウ、1IPあたり）

`/ingress`系ルートに対し、1分あたり既定30リクエスト/IPの固定
ウィンドウ制限を実装した（`DEFAULT_RATE_LIMIT_MAX`、テスト時は
`options.rateLimitMax`で上書き可能）。単一プロセスのローカル
サーバーであるため、外部ストア（Redis等）は導入せずin-memoryの
`Map`で十分と判断した（Principle 9、YAGNI）。

### 4. 入力上限（`MAX_BODY_BYTES = 64KB`）

リクエストボディの読み込み中にバイト数を数え、上限を超えたら
即座に`413`を返す（無制限バッファリングを避ける）。生活ログの
テキスト量に対して十分な余裕を持たせた値とした。

### 5. 監査ログ（`data/logs/mobile-ingress-audit.log`）

`/ingress`系リクエストごとに`{timestamp, method, path, ip, outcome,
status, reason}`を1行のJSONとして追記する。**Authorizationヘッダー
の値そのものは記録しない**——認証の成否のみを記録する。書き込み
失敗はリクエスト処理を止めない（stderrへフォールバック）。

### 6. 否定テスト

`src/infrastructure/http/mobileIngress.test.ts`に以下を追加した：
token無し401、誤token 401、rate limit超過429、oversized body 413、
`validateExposureConfig`の起動ガード（host変更+token無しで例外）。
実機でも`MOBILE_INGRESS_HOST=0.0.0.0`かつtoken未設定でプロセスが
起動時に終了することを確認済み。

## 影響

- 既定運用（`127.0.0.1`、token未設定）は無変更——Version35〜36の
  既存テスト・実機確認結果は引き続き有効。
- `MOBILE_INGRESS_HOST`を変更する場合のみ、`MOBILE_INGRESS_API_TOKEN`
  の設定が必須になる（構造的強制）。
- Quick Capture UI（`GET /`）にトークン入力欄を追加し、
  `localStorage`に保存して`Authorization`ヘッダーへ付与する
  （トークン自体はHTML/JSにハードコードしない）。

## 見送った案

- **JWT等の署名付きトークン**：単一Owner・単一デバイス想定の
  ローカルMVPには過剰（YAGNI）。固定共有シークレットで十分。
- **IPアドレスのallowlist**：スマートフォンのIPはDHCPで変動しうる
  ため運用が煩雑になる。token認証の方が単純で確実。
- **外部rate limitストアの導入**：単一プロセス・低trafficの
  ローカル運用にはin-memoryで十分。
