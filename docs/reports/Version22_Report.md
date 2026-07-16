# Version22 Report: Authority Boundary and Secure Approval

**コミットハッシュ**：`b0764ad`（`feature/v4-v6-smart-capture`ブランチ）

`docs/reports/TEMPLATE.md`の14章構成に準拠。

## 1. Version概要

**テーマ**：Authority Boundary and Secure Approval。Version21完了報告
（AgentMessage `c3717f10-...`）への応答としてARCから届いたAgentMessage
（id `e5728efb-...`）に基づく。Version21で見送った2点（ARCによる
Proposal承認代行、Level2の暗号学的な迂回不能化）について、ARCは
「Level1のARC代行はConstitution第4条と衝突するため現状維持、ただし
将来委譲できる設計案は作成する」「Level2の認証再導入は検討するが、
Version22では費用なし・実秘密情報の外部送信なし・既存接続を壊さない
範囲の設計・脅威モデル・ローカル試作・移行計画に留め、本番有効化は
Owner承認待ちで停止する」という方針を示した。

単一の権限表、無認証Remote MCPの脅威モデル、認証方式3案比較・推奨、
Level1委譲の未実装Constitution変更案、ローカル無料試作、単体・
統合テスト、ADR、運用文書の追加が必須要件として明示されていた。

## 2. 今回実装した機能（理由も含めて説明）

### 権限表・脅威モデル・委譲案（ドキュメント）

- **`docs/authority-table.md`**：Level0/1/2の実行主体・許可操作・
  禁止操作・エスカレーション条件を単一表にまとめた。Level2操作の
  認可境界（コードによる強制ではなく、Claude Codeの行動規範・
  監査ログ・Write Proposal Layerの3層による裏付け）を明記。
- **`docs/security/remote-mcp-threat-model.md`**：保護対象・攻撃者像・
  攻撃経路・信頼境界を文書化。事前調査で
  **`management_feedback_resolve`がWrite Proposal Layerを経由しない
  直接書き込みであり、現状の無認証Remote MCPではOwnerの`do`を経由せず
  ManagementFeedbackのresolutionを書き換えられる**という具体的な穴を
  発見した——ADR 0044の「Write系操作はProposal経由なのでリスクは
  限定的」という従来の主張に対する反例であり、脅威モデルの中核として
  記録した。
- **`docs/proposals/level1-arc-approval-delegation.md`**：
  `AgentDelegationGrant`（`scope`・`expiresAt`・`revokedAt`・
  `usageLimit`・`usageCount`・default-deny）の設計と、Constitution
  第4条の改定文言案を、現行維持案と比較可能な形で提示した。**実装は
  していない**。

### 認証方式3案比較・推奨（ADR 0049）

Bearer静的トークン再導入・自前OAuth 2.1 AS・Cloudflare Accessの3案を
ChatGPT Connector互換性・費用・秘密情報の外部送信・運用負担・
セキュリティ特性で比較し、**自前OAuth 2.1**（`@modelcontextprotocol/
sdk`同梱の`mcpAuthRouter`を使用）を推奨した。ADR 0041が「フルOAuth
2.1はスコープ外」とした前提（実装コストの高さ）は、SDKが
`mcpAuthRouter`・`requireBearerAuth`・Dynamic Client Registration・
PKCE検証・`.well-known`メタデータを既に実装済みであることが分かり、
大幅に下がることを事前調査で確認した。

### `LocalOAuthProvider`（ローカル無料試作、既定OFF）

`src/infrastructure/security/oauth/LocalOAuthProvider.ts`——SDKの
`OAuthServerProvider`/`OAuthRegisteredClientsStore`をインメモリで
実装。

- Dynamic Client Registration対応（ChatGPTの自己登録を想定）
- 認可はOwnerのみが知るPasscode（`.env`の
  `MCP_OAUTH_OWNER_PASSCODE`）——`/authorize`はPasscode入力フォームを
  直接描画し（リダイレクトしない）、別ルート`/authorize/confirm`
  （SDK非経由の自前実装）でPasscodeを検証してから認可コードを発行
  する。Passcodeはこのサーバー自身へのPOSTのみで完結し、外部へは
  一切送信しない。
- 短命access token（1時間）+ refresh token（30日）、`verifyAccessToken`/
  `revokeToken`実装。
- `express`を新規依存として追加（`pnpm add express`、ADR 0037の
  「新規依存の明示」パターンを踏襲）。

`remoteServer.ts`は`MCP_OAUTH_ENABLED`（既定false）で分岐する。
フラグ未設定時はADR 0044のまま生の`node:http`サーバーを返し、1バイトも
挙動を変えない。フラグ有効時のみExpressで`mcpAuthRouter`を配線し、
`/mcp`全体を`requireBearerAuth`で保護する——`management_feedback_
resolve`を含む全MCP Toolは`/mcp`という単一のJSON-RPCエンドポイント
経由のため、Tool単位の個別対応は不要。

## 3. 実装しなかった機能（延期理由も記載）

1. **Level1委譲の実装**（`AgentDelegationGrant`）：Constitution第4条の
   改定を伴うため、設計提示のみに留めた。Owner・ARCの判断待ち。
2. **`MCP_OAUTH_ENABLED`の本番有効化**：ローカル・自動テストの範囲で
   実HTTPリクエストによる動作確認は完了しているが、実際のngrok/
   Cloudflareトンネル・ChatGPT Connector側の再設定はOwner自身の操作が
   必要（`docs/setup/remote-mcp-oauth-migration.md`）。本番の`.env`・
   稼働中のトンネルには変更を加えていない。
3. **永続化**：`LocalOAuthProvider`はインメモリのみ。本番運用が決まった
   段階で別途検討する。
4. **Cloudflare Access多層防御**：比較のみ行い、導入はしていない
   （アカウント作成はOwner自身の操作が必要、ADR 0042と同じ制約）。

## 4. Architecture Review

**新規**
- `src/infrastructure/security/oauth/LocalOAuthProvider.ts`（+test、
  15件）
- `src/infrastructure/mcp/remoteServer.oauth.test.ts`（e2eテスト、
  3件）
- `docs/authority-table.md`・`docs/security/
  remote-mcp-threat-model.md`・`docs/proposals/
  level1-arc-approval-delegation.md`・`docs/setup/
  remote-mcp-oauth-migration.md`

**変更**
- `src/infrastructure/mcp/remoteServer.ts`：`createRemoteMcpApp`が
  第2引数`oauth?`を受け取るよう拡張（後方互換、省略時は既存挙動を
  維持）
- `src/infrastructure/config/env.ts`：`MCP_OAUTH_ENABLED`・
  `MCP_OAUTH_OWNER_PASSCODE`追加（両方任意）
- `.env.example`：新しい環境変数を追記
- `package.json`：`express`・`@types/express`を新規依存として追加

## 5. ADR（追加・変更したADR、追加しなかった理由）

- **ADR 0049**（新規）：Version22のスコープ、認証方式3案比較・推奨、
  実装範囲（`LocalOAuthProvider`）と実装しなかったもの（Level1委譲・
  本番有効化・永続化）を記録。

既存パターン（AgentMessage/ManagementFeedbackが辿った道）を新しい
認証領域に適用しただけであり、Domain層に新しい抽象化は追加していない
ため、他のADRは不要と判断した。

## 6. テスト（件数、カバレッジ、typecheck、lint、実機確認）

- `pnpm test`：294件全て緑（Version21時点276件から+18件。
  `LocalOAuthProvider`単体テスト15件、`remoteServer.oauth.test.ts`
  のe2eテスト3件を含む）
- `pnpm typecheck`：エラーゼロ
- `pnpm lint`：エラーゼロ
- **実機確認（フラグOFF、回帰）**：既存の`remoteServer.test.ts`が
  無変更でgreenのまま——本番接続への影響がないことを確認済み。
- **実機確認（フラグON、新規フロー）**：`remoteServer.oauth.test.ts`
  で、実HTTPサーバーを起動しDynamic Client Registration→GET
  `/authorize`（Passcodeフォーム表示、未リダイレクト確認）→POST
  `/authorize/confirm`（誤Passcodeでの401拒否・正しいPasscodeでの
  リダイレクト確認）→POST `/token`（PKCE code_verifier検証込みの
  token交換）→Bearer保護された`/mcp`呼び出し（成功・無効tokenでの
  401拒否）の一連を実HTTPリクエストで確認した。
- 実装中に2件の実際のバグを発見・修正した（詳細は7章）。

## 7. 修正したバグ（検出方法、原因、対応方法、再発防止）

### (1) `setTimeout`の32bit符号付き整数オーバーフロー

**検出方法**：`LocalOAuthProvider.test.ts`実行時に
`TimeoutOverflowWarning`が出力された。
**原因**：refresh tokenの30日TTL（`2,592,000,000ms`）を
`setTimeout(...).unref()`で管理していたが、Node.jsの`setTimeout`は
32bit符号付き整数（約24.8日が上限）を超える遅延を渡すと即座に
（1ms後に）発火してしまう——30日という現実的なTTLが、実装時点では
数値として妥当に見えても実行時に壊れるという典型的な罠だった。
**対応方法**：`setTimeout`による能動的な削除をやめ、他のトークン同様
`expiresAt`をレコードに保持し、使用時（`exchangeRefreshToken`）に
遅延評価する方式へ変更した。
**再発防止**：長いTTLを扱う場合は`setTimeout`ではなく期限タイムスタンプ
の遅延評価を使う、という判断基準をこのファイルのコメントに明記した。
回帰テスト（`vi.spyOn(Date, 'now')`で31日後を模擬）を追加済み。

### (2) `verifyAccessToken`が汎用`Error`を投げていたため401ではなく500になる

**検出方法**：`remoteServer.oauth.test.ts`のe2eテストで、無効な
access tokenでの`/mcp`アクセスが401ではなく500を返すことを実HTTP
リクエストで発見した。
**原因**：`requireBearerAuth`ミドルウェア（SDK提供）は、
`verifyAccessToken`が投げたエラーが`InvalidTokenError`（SDKの
`server/auth/errors.js`）のインスタンスである場合のみ401へ変換する
実装になっており、通常の`Error`は全て500として扱われる。この挙動は
SDKのソースを読まないと分からず、実際にHTTPリクエストを投げて初めて
発覚した。
**対応方法**：`verifyAccessToken`・`exchangeAuthorizationCode`関連の
エラーをSDK提供の`InvalidTokenError`/`InvalidGrantError`に置き換えた。
**再発防止**：SDK提供のミドルウェアと連携するコードは、SDKが期待する
エラー型を使う必要がある、という注意点をコード内コメントとADR 0049に
明記した。

## 8. 技術的負債（今後改善したい点）

- `LocalOAuthProvider`はインメモリのみで永続化がない。本番運用が
  決まれば、既存の`Json*Repository`パターンを踏襲した永続化が必要。
- Passcodeゲートには総当たり対策（レート制限・アカウントロックアウト）
  を自前実装していない——SDKの`authorizationHandler`が付与する
  IPベースのレート制限に依存している。本番運用前に、この防御が
  実際に十分かどうかの再検証が必要。
- `management_feedback_resolve`の直接書き込みという設計自体
  （Write Proposal Layerの対象外）は、Version22では「認証で保護する」
  対応に留めた。将来、この操作もWrite Proposal Layer経由に統一すべき
  かは別途検討の余地がある。

## 9. 次Versionへの申し送り（技術的観点から推奨する事項）

- `docs/reports/Version22_ARC_Feedback.md`末尾に列挙した3つのOwner
  承認事項（`MCP_OAUTH_ENABLED`本番有効化、Level1委譲Constitution
  改定案の採否、Cloudflare Access多層防御の要否）の回答を待ってから、
  次の実装ステップを決めるべき。
- 認証が本番有効化された場合、`docs/security/
  remote-mcp-threat-model.md`を実際の運用結果に基づいて更新する
  フォローアップVersionが必要になる。

## 10. POへの提案（提案・懸念点・改善案を自由に記載）

- 今回、指示書自身が「実装前に権限表・脅威モデル・比較を提示する」
  ことを求めていたため、Version21に続き「コードを書く前に
  governanceの緊張点を言語化する」という流れが2回連続で機能した。
  次回以降も、Constitution/ADRに関わる可能性がある指示は、この
  順序（提示→Owner確認→実装）を既定の進め方として定着させることを
  提案する。

## 11. CEOへのコメント（今回の成果、次Versionへの期待）

Version21で「今すぐは実装しない」と保留した2つの論点に対し、ARCが
それぞれ異なる回答（現状維持+将来設計の提示、限定的な前進+本番停止）
を出したことで、Constitution関連の判断とセキュリティ関連の判断で
Owner・ARCの意思決定のペースが異なりうることが明確になった——前者は
「まだ判断しない」、後者は「設計・試作までは進める」という違いは、
今後同種の判断を仰ぐ際の参考になる。事前調査でMCP SDKがOAuth 2.1の
足回りを同梱していることを発見できたのは、ADR 0041時点の判断
（「フルOAuth実装はコストが高すぎる」）を無条件に踏襲せず、実際に
現在のSDKバージョンを調べ直したことの成果である。

## 12. ARCへの引き継ぎ

**新しい資産**：`docs/authority-table.md`（権限の単一の参照点）、
`docs/security/remote-mcp-threat-model.md`（`management_feedback_
resolve`の穴を含む脅威の全体像）、`LocalOAuthProvider`（有効化すれば
ChatGPT接続をOAuth化できる、ただし現時点では無効）。

**新しいルール**：Level2に関わる可能性のある指示（今回は認証・
Constitution）は、実装前に「権限表・脅威モデル・比較」のような
判断材料をOwnerに提示してから進める、という進め方がVersion21・22で
2回連続機能した。今後も同種の指示にはこのパターンを踏襲する。

**新しい思想**：「効率化の要求」と「決定権限の所在」は別の軸である
という整理（Version21で得た知見）が、今回さらに「セキュリティ強化の
要求」にも同じ整理が適用できることが分かった——認証を強化すること
自体はOwnerの決定権を脅かさないが、認証を「誰が」「どう」設定するかは
Level2のまま、という切り分け。

**Ownerについて分かったこと**：今回はOwnerとの追加のやり取りなしに
Plan Mode承認のみで進んだ。governance分析を伴う実装であっても、
根拠が明示されていれば細部を問い直さず承認する傾向は、Version20・21に
続き一貫している。

## 13. Product Review

**ユーザー体験で改善されたこと**：直接的なUI変化はない
（インフラ・セキュリティ層の変更のため）。

**毎日使う理由**：既存の毎日使う機能に変化はない。

**懸念**：`MCP_OAUTH_ENABLED`を有効化する判断・作業（Passcode決定・
ChatGPT Connector再設定）はOwner自身の手間を一時的に増やす。この
手間と「無認証状態のリスクを減らす」という価値のトレードオフを
Ownerがどう評価するかが、次のステップを左右する。

**次Versionで最も価値が高い改善**：Owner承認事項（Feedback末尾）への
回答を得て、実際に`MCP_OAUTH_ENABLED`を本番有効化するかどうかを
決めること。ここが決まらない限り、脅威モデルで発見したギャップ
（`management_feedback_resolve`等）は開いたままになる。

## 14. 10年後のProject ARCへの貢献

今回実装した`LocalOAuthProvider`自体が10年後も使われている可能性は
低い——OAuth実装のディテールは陳腐化しうる。しかし「認証という
セキュリティに関わる領域でも、Constitution・ADRという既存の
governance文書に立ち返ってから実装する」という手順そのものは、
Project ARCがどれだけ多くの権限をAIに委ねるようになっても機能する
土台になる。

Version21の脅威モデル調査で`management_feedback_resolve`という
具体的な穴を発見できたことは象徴的である——「Write系操作はProposal
経由なので安全」という以前の主張（ADR 0044）は、実際にコードを
1行ずつ追わなければ検証できなかった。10年後のProject ARCが本当に
「唯一の人生データベース」（Constitution第1条）としてOwnerに信頼され
続けるには、こうした「思い込みを実際のコードで検証し直す」作業を
定期的に繰り返す文化が、機能追加そのものよりも重要になっていくと
考える。
