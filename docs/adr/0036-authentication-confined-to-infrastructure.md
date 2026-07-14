# ADR 0036: 認証をInfrastructureへ閉じ込めた理由

## ステータス

承認済み

## 関連Principle

- Principle 9（段階的拡張／YAGNI）
- ADR 0008（ARC Connector HTTP API化——「認証は先送り」の再検討条件）
- ADR 0035（HTTP APIを唯一の接続経路とした理由）

## コンテキスト

ADR 0008（Version7）は「認証は実装しない（意図的な先送り）」と
決定し、「実際にリモートから（同一マシン外、あるいはChatGPT等の
外部サービスから直接）呼び出す具体的な要件が生じた時点で、本ADRを
見直し認証方式（APIキー、OAuth等）を設計すること」という再検討条件を
明記していた。Version15指示書6章は「簡易認証を追加する。最低限
API Keyでよい。ただしApplication層へ認証コードを書かない。
Infrastructure側のみ」と指定しており、この再検討条件が満たされた。

## 決定

### 認証方式：`Authorization: Bearer <ARC_API_KEY>`

`src/infrastructure/security/apiKeyAuth.ts`に`isAuthorized(header,
expectedKey)`という純粋関数を新設し、`src/infrastructure/http/
server.ts`の`handleRequest()`内でのみ呼び出す。Application層
（UseCase・Repository・Domain Entity）は認証の存在を一切知らない。

### opt-in設計：`ARC_API_KEY`が設定されている場合のみ強制する

`BuildAppOptions.apiKey`が指定されていない場合、認証は一切強制
されない——Version7〜14と全く同じ挙動を維持する。指定されている
場合のみ、`GET /health`を除く全ルートで`Authorization: Bearer`
ヘッダーの検証を行い、不一致・欠落時は401＋`WWW-Authenticate:
Bearer`を返す。

`pnpm run api`起動時は、`loadEnv().ARC_API_KEY`（`.env`から読む、
未設定なら`undefined`）をそのまま`createApp({apiKey})`へ渡す。

## 根拠

- **Application層への認証コード混入を防ぐ**：指示書6章の明示的な
  要求。UseCaseが「誰がこのリクエストを送ったか」を知る必要はなく、
  知ってしまうと「Systemは判断しない」という境界（Constitution第2条）
  とは別の新しい関心事がApplication層に漏れ出すことになる
  （Principle 10: 責務は交換可能ではなく分担する、とも整合する）。
- **`Authorization: Bearer`固定の理由**：ADR 0035の調査結果——
  ChatGPT Actionsのカスタムヘッダー非対応・MCP Remote Serverの
  Bearer token慣習の両方を1つの形式で満たす。
- **opt-inにした理由**：Version1〜14で構築した217件のテスト・
  Ownerの既存ローカル運用（`pnpm run api`を認証なしで使う）を
  一切壊さずに、実際にConnectorを外部公開する段階になったら
  `.env`に`ARC_API_KEY`を設定するだけで認証が有効化される、という
  段階的な移行を可能にする（Principle 9）。ADR 0008が「ローカル
  ホストバインドのみが正しい安全策」としていた前提（`127.0.0.1`
  限定）はVersion15でも変えていないため、認証は「同一マシン上の
  複数プロセスからの誤呼び出し防止」という位置づけであり、
  ネットワーク越しの攻撃者を想定した本格的な認証基盤ではない
  （ADR 0004の「簡易暗号化」と同じ、明示的に許容されたスコープ）。

## 影響

- `.env.example`に`ARC_API_KEY`（任意）・`ARC_CONNECTOR_BASE_URL`
  （Connector自身の接続先設定）を追記した。
- `docs/adr/0008-arc-connector-http-api.md`が明記していた再検討条件は
  Version15で満たされたとみなし、本ADRをその後継として扱う
  （ADR 0008自体は歴史的経緯として変更しない）。
- 将来リモート（同一マシン外）からの接続が必要になった場合は、
  `127.0.0.1`バインドの見直し・HTTPS化・より強固な認証方式
  （OAuth2等）を改めて検討すること（ADR 0035「見送ったもの」参照）。
