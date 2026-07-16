# ADR 0049: Version22「Authority Boundary and Secure Approval」のスコープ

## ステータス

承認済み（Owner確認済み、Plan Mode承認）

## 関連Principle

- Constitution第2条（Systemは、判断しない）・第4条（Ownerが、最終決定する）
- Principle 9（段階的拡張／YAGNI）
- ADR 0031（Write Proposal Layer）・ADR 0036（認証をInfrastructureへ
  閉じ込めた理由）・ADR 0037（MCP SDK新規依存）・ADR 0041（Remote MCP
  Streamable HTTP）・ADR 0042（HTTPS公開方式比較）・ADR 0044（Remote
  MCP認証撤回）・ADR 0045（Version19スコープ境界）・ADR 0048（Approval
  Policy Engine）

## コンテキスト

AgentMessage `e5728efb-...`は、Version21の2つの未実装事項に対する
ARCの方針を示した。

1. Level1のARC承認代行は、Constitution第4条・ADR 0031と衝突するため
   現状維持（Owner`do`必須）。ただし将来委譲できるよう設計案は作成する
   （実装しない）。
2. Level2の迂回不能性のため認証を再導入する方向で検討するが、認証方式・
   外部公開範囲・秘密情報の設定はLevel2事項のため、Version22では
   費用なし・実秘密情報の外部送信なし・既存接続を壊さない範囲の
   「設計・脅威モデル・ローカル試作・移行計画」に留め、本番有効化は
   Owner承認待ちで停止する。

着手前の調査で2つの重要な事実が判明した（詳細は
[脅威モデル](../security/remote-mcp-threat-model.md)）。

1. `@modelcontextprotocol/sdk`（1.29系）は`server/auth`配下にOAuth 2.1
   Authorization Serverの足回り（`mcpAuthRouter`・
   `requireBearerAuth`・Dynamic Client Registration・PKCE検証・
   `.well-known`メタデータ）を同梱している。ADR 0041が「フルOAuth 2.1は
   スコープ外」とした前提（実装コストの高さ）は、SDKの機能を使えば
   大幅に下がる。
2. `management_feedback_resolve`はWrite Proposal Layerを経由しない
   直接書き込みであり、現状の無認証Remote MCPでは
   トンネル公開URLを知る誰でもOwnerの`do`を経由せず実行できる
   ——ADR 0044の「Write系はProposal経由なのでリスクは限定的」という
   主張の反例。

## 決定

### 認証方式3案比較・推奨

| | A. Bearer静的トークン再導入 | B. 自前OAuth 2.1 AS（MCP SDK同梱の`mcpAuthRouter`+Express、ローカルPasscodeゲート） | C. Cloudflare Access（エッジ層でのゲート） |
|---|---|---|---|
| ChatGPT Connector互換性 | 不可（ADR 0044で実証済み：「認証なし」モードはAuthorizationヘッダーを送らない） | 可（ChatGPT UIの「OAuth」モードが想定する標準フロー） | 未検証（ChatGPTがAccessのログイン壁をOAuthとして扱えるか不明） |
| 費用 | ¥0 | ¥0（新規依存は`express`のみ、無料OSS） | Cloudflare Access無料枠（50ユーザーまで）だがCloudflareアカウント・ドメイン必須（Claude Codeは契約代行不可、ADR 0042と同じ制約） |
| 秘密情報の外部送信 | Bearer tokenをChatGPT側に保存させる必要あり | Passcodeはこのサーバー自身へ直接POST、外部送信なし | Cloudflareのログイン基盤に依存 |
| 運用負担 | 低 | 中（トークン失効・リフレッシュの運用） | 低（Cloudflare側で完結）だがアカウント設定はOwner作業 |
| セキュリティ特性 | ChatGPT非互換のため実質使えない | PKCE必須、短命token、`ApprovalDecision`監査ログと統合可能 | エッジでのブロックなので攻撃面は狭いが、Project ARC側では検証不能 |

**推奨：B（自前OAuth 2.1、ローカルPasscodeゲート）**。ChatGPT接続の
実用性を保ちながら、外部サービス・追加契約なしに実装できる。Cは
将来の多層防御として検討の余地を残す（本Versionでは比較のみ、
導入しない）。

### 実装：`LocalOAuthProvider`（ローカル無料試作、既定OFF）

`src/infrastructure/security/oauth/LocalOAuthProvider.ts`が、SDKの
`OAuthServerProvider`/`OAuthRegisteredClientsStore`をインメモリで
実装する。

- **Dynamic Client Registration対応**：ChatGPTが自己登録できるよう
  `registerClient`を実装。`token_endpoint_auth_method: 'none'`
  （PKCEのみの公開クライアント）を想定——DCRで生成された
  `client_secret`を要求しない設計（実機確認のe2eテストで、
  confidential client想定のままだと`client_secret`不一致により
  token交換が400になることを発見・修正した）。
- **認可はOwnerのみが知るPasscode**（`.env`の
  `MCP_OAUTH_OWNER_PASSCODE`）で行う。`/authorize`はまずPasscode入力
  フォームをHTML直接描画し（リダイレクトしない）、別ルート
  `/authorize/confirm`（SDK非経由、自前実装）でPasscodeを検証してから
  認可コードを発行する。Passcodeはこのサーバー自身へのPOSTのみで
  完結し、ChatGPT・Anthropic等いかなる第三者にも送信されない。
- トークンは短命access token（1時間）+ refresh token（30日）、
  インメモリMapで管理。`verifyAccessToken`/`revokeToken`実装。
- エラーはSDKの`InvalidTokenError`/`InvalidGrantError`
  （`server/auth/errors.js`）を投げる——`requireBearerAuth`ミドルウェアが
  この型を明示的に見て401を返す実装になっており、通常の`Error`のまま
  だと500として扱われてしまうことをe2eテストで発見・修正した。
- `express`を新規依存として追加（`pnpm add express`）。SDKの
  `mcpAuthRouter`/`requireBearerAuth`がExpressミドルウェアとして
  提供されているため——ADR 0037がMCP SDK自体を新規依存として明示した
  前例を踏襲し、ここでも明示する。生の`node:http`でOAuth 2.1
  （PKCE・DCR・`.well-known`メタデータ等）を独自実装するのは、
  SDKが既に正しく実装済みのものを車輪の再発明することになり、
  Principle 9（YAGNI）に反すると判断した。

### `remoteServer.ts`への配線：`MCP_OAUTH_ENABLED`（既定false）

`createRemoteMcpApp(connector, oauth?)`が第2引数を省略された場合
（既定）、ADR 0044のまま生の`node:http`サーバーを返し、1バイトも
挙動を変えない——既存の`remoteServer.test.ts`は無変更でgreenのまま
（回帰確認済み）。`oauth`オプション指定時のみExpressで
`mcpAuthRouter`を配線し、`/mcp`全体を`requireBearerAuth`で保護する
——`management_feedback_resolve`を含む全MCP Toolは`/mcp`という単一の
JSON-RPCエンドポイント経由のため、Tool単位の個別対応は不要（脅威
モデルの「対応方針」参照）。

本番の`pnpm run mcp:remote`起動コマンド・実際に稼働中のngrokトンネル・
`.env`ファイルには、Version22時点で`MCP_OAUTH_ENABLED`を追加していない
——本番環境は無変更のまま（完了条件「本番環境・現行接続には未承認の
変更を加えていない」を満たす）。

### 実装しないもの（Owner承認待ち）

1. **Level1委譲の実装**：[`docs/proposals/
   level1-arc-approval-delegation.md`](../proposals/level1-arc-approval-delegation.md)
   に設計のみ提示。Constitution第4条の改定を伴うため、Owner・ARCの
   判断を仰ぐ。
2. **`MCP_OAUTH_ENABLED`の本番有効化**：ローカル試作・自動テストでは
   実HTTPリクエストで動作確認済みだが、実際のngrok/Cloudflare
   トンネル・ChatGPT Connector側の再設定はOwner自身の操作が必要
   （[移行手順](../setup/remote-mcp-oauth-migration.md)参照）。
3. **永続化**：`LocalOAuthProvider`はインメモリのみ。プロセス再起動で
   全クライアント・トークンが失効する。本番運用が決まった段階で、
   JSON永続化（既存の`Json*Repository`パターン踏襲）を別途検討する。

## 根拠

- Constitution第2条・第4条、ADR 0031・0045の境界（上位文書の改定・
  Owner承認プロセスの変更は実装で先取りしない）を、認証設計という
  新しい領域でも一貫して適用した。
- SDKが提供する足回りを使うことで、ADR 0041時点の「フルOAuth 2.1は
  実装コストが高すぎる」という判断を覆せることが分かった——ただし
  「今すぐ本番有効化する」ことと「設計・試作を進める」ことは別の
  判断であり、後者のみをVersion22のスコープとした。
- 「本番稼働中のトンネル・接続を壊さない」という完了条件を、
  feature flag（既定OFF）とテストファイルの分離
  （`remoteServer.test.ts`は無変更、`remoteServer.oauth.test.ts`を
  新設）によってアーキテクチャレベルで担保した。

## 影響

- 新規依存：`express`（`^5.2.1`、`@types/express`）。既に
  `@modelcontextprotocol/sdk`の内部依存として`node_modules`に存在して
  いたが、直接importするため明示的な依存として追加した。
- `src/infrastructure/config/env.ts`に`MCP_OAUTH_ENABLED`・
  `MCP_OAUTH_OWNER_PASSCODE`を追加（両方任意、既定で無効）。
- 次にOwnerが承認すべき事項は`docs/reports/
  Version22_ARC_Feedback.md`の末尾に、費用・リスク・具体的操作とともに
  列挙した。
