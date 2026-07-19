# Version30 Report: Remote MCP OAuth本番移行準備・記録整合

## 1. Version概要

PM Review（2026-07-19）がP0として指摘したARC-PM-001（公開Remote MCP
が無認証）への対応。調査の結果、OAuth 2.1認証はVersion22で既に設計・
実装・テスト済みであり、真のギャップは「本番`.env`への反映が5Version
（24→29）続けて未完了だった」という運用上の1点と、「ADR 0051が
その未完了を『完了した』と誤って記録していた」という文書整合性の
問題だったことが判明した。Version30はOwner指示により、新規のOAuth
実装ではなく、既存実装のsecurity review・記録整合・安全な本番移行
準備に限定してスコープを定めた（ADR 0057）。

## 2. 今回実装した機能（理由も含めて説明）

- `/authorize/confirm`（Passcode検証エンドポイント）へのレート制限
  追加：既存のOAuth実装に対するsecurity reviewで、SDKの
  `authorizationHandler`が課すIPベースのレート制限が`/authorize`
  （GET）のみを保護し、Passcodeを実際に照合する`/authorize/confirm`
  （POST、SDK非経由の自前ルート）には及んでいないという欠落を発見
  したため、固定窓レート制限（15分あたり10回、`src/infrastructure/
  security/rateLimiter.ts`）を追加した。
- Codex/Claude Code間の同一ブランチ書き込み衝突回避運用
  （`docs/project-management/CODEX_RECOVERY_PLAN.md`）：Version30着手
  時にOwnerがCodexへ書き込み停止を依頼した運用を、再現可能な手順として
  文書化した。

## 3. 実装しなかった機能（延期理由も記載）

- **本番`.env`へのOAuth有効化反映**：Owner専権事項（秘密情報・本番
  変更）のため、Claude Codeは実施しない。Owner自身が
  `docs/setup/remote-mcp-oauth-migration.md`のchecklistに沿って
  実行する。
- **ARC-PM-002（データ耐久性）・ARC-PM-005（build再現性）等**：
  Owner指示によりVersion30のスコープ外。次Version以降で対応する。
- **`apiKeyAuth.ts`のtiming-safe化**：Version30のsecurity reviewで
  発見した観察（ARC-PM-013、P2）だが、対象がRemote MCP OAuthとは
  別の認証境界（ARC Connector HTTP API、ローカル専用）であり、
  今回のスコープには含めなかった。

## 4. Architecture Review

- 新規：`src/infrastructure/security/rateLimiter.ts`
  （`createFixedWindowRateLimiter`、純粋関数的なMap実装、外部依存なし）
- 変更：`src/infrastructure/mcp/remoteServer.ts`
  （`/authorize/confirm`へのレート制限適用、`AUTHORIZE_CONFIRM_RATE_LIMIT`
  をテストのためexport）
- 既存の`LocalOAuthProvider`・`ReflectionRepository`等のInterface・
  依存方向には変更なし

## 5. ADR

- 新規：ADR 0057（本Versionのスコープと決定）
- 訂正：ADR 0051末尾に「訂正（Version30、2026-07-19）」節を追記
  （本文は書き換えず、履歴として保存）

## 6. テスト

- `pnpm typecheck` / `pnpm lint`：合格
- `pnpm test`：**512件合格**（Version29時点505件+Version30で追加した
  レート制限の否定テスト1件、および事前の`pnpm install`で
  Version22〜29累積分を含む）
- 追加テスト：`remoteServer.oauth.test.ts`に
  「returns 429 once the same source exceeds the attempt limit」を
  追加。独立したサーバーインスタンス（＝独立したrate limiter状態）を
  使い、既存テストの試行回数と干渉しないよう分離した
- 実機確認：`/authorize/confirm`に対して実際にHTTPリクエストを
  `AUTHORIZE_CONFIRM_RATE_LIMIT.max`回失敗させた後、次の1回が
  実際に429を返すことをテスト内の実HTTPリクエストで確認済み
  （モック無し）
- `pnpm build`：**不合格のまま**（TS2742、`generateOpenApi.ts`）。
  Version30が変更したファイルには起因せず、PM Review時点（Version30
  着手前）から存在した既知の問題（ARC-PM-005）——Version30のスコープ
  外のため未対応。次Versionへ持ち越す

## 7. 修正したバグ

該当なし（新規バグ修正は今回のスコープに含まない。`/authorize/confirm`
のレート制限欠落は「バグ」ではなくsecurity reviewで発見した設計上の
欠落として4章・6章で扱った）。

## 8. 技術的負債

- ARC-PM-013（P2、新規）：`apiKeyAuth.ts`の非timing-safe比較
- 既存のARC-PM-002・005〜010は本Versionでは変化なし
  （`docs/project-management/STATUS.md`参照）

## 9. 次Versionへの申し送り（技術的観点から推奨する事項）

- Ownerが`docs/setup/remote-mcp-oauth-migration.md`のchecklistを
  実行し、本番`.env`へOAuthを反映した後、ARC-PM-001を正式にクローズ
  すること。
- ARC-PM-005（build失敗、TS2742）は`generateOpenApi.ts`の型注釈追加
  で解決できる可能性が高く、着手コストが低い割に「buildが通らない」
  という状態を解消できるため、次Versionの早い段階での対応を推奨する。
- `CODEX_RECOVERY_PLAN.md`は今回が初版であり、実際にCodexとの合流が
  発生した際に手順の過不足を検証・改訂する必要がある。

## 10. POへの提案

- ARC-PM-001の「Owner Actionのみ残存」という状態が、実は5Version前
  から変わっていない、という事実そのものが、PM Statusのような
  「現況を1箇所に集約する文書」の必要性を裏付けている。今後も
  Owner Action待ちの項目は、Reportの奥深くではなくSTATUS.mdの
  「停止中タスク」で追跡を継続することを推奨する。

## 11. CEOへのコメント

新機能ゼロ、コード変更は1つの小さなレート制限追加のみという、
これまでのVersionと比べて地味なVersionだったが、「ADR 0051の記録が
5Versionにわたって実態と食い違っていた」という発見は、PM Reviewが
懸念していた「文書の正しさが機能開発に追いついていない」という問題の
最も具体的な実例になった。次にOAuthを本番反映する際は、必ず
Report側で「実施した」ではなく「Ownerが実施し、Claude Codeが実機で
確認した」まで書くことを徹底したい。

## 12. ARCへの引き継ぎ

**新しい資産**：`docs/setup/remote-mcp-oauth-migration.md`が
one-shot checklist形式に改訂され、Ownerが1回の作業でRemote MCP認証を
本番反映できる状態になった。`docs/project-management/
CODEX_RECOVERY_PLAN.md`という、Codexとの共存運用を明文化した新しい
文書資産もできた。

**新しいルール**：ADRの内容に事後的な誤りが見つかった場合は、本文を
書き換えず末尾に「訂正」節を追記する、という訂正パターンを確立した
（ADR 0051が最初の適用例）。今後も同様のケースではこのパターンを
踏襲する。

**新しい思想**：「実装が完了している」ことと「Ownerが実際に本番で
使える状態になっている」ことは別物である、という区別が、Version24
からVersion30まで6Versionにわたる教訓として改めて確認された
（`docs/HISTORY.md`2章「『実装完了』と『確定（コミット）』は別物」
という既存の教訓の、運用面での類例）。

**Ownerについて分かったこと**：今回、Owner自身がGitHubブランチの
状態（Codexの並行作業、48コミットの未push分）を能動的に確認・
共有し、Claude Codeの作業範囲（review・test・文書は自律実施、本番
反映はOwner専権）を1メッセージで明確に線引きした。曖昧な指示より、
実施可否の境界を先に固定するスタイルが一貫している。

## 13. Product Review

**ユーザー体験で改善されたこと**：直接の体験変化はまだ無い
（本番反映が未実施のため）。ただし、次にOwnerがOAuthを有効化する
際の作業が「複数の文書を読み比べる」から「1つのchecklistを上から
実行する」に変わった。

**毎日使う理由**：変化なし（Version30はセキュリティ・運用基盤の
Versionのため）。

**懸念**：Version24から数えて6Version連続で「OAuth本番有効化は
Owner Action待ち」という同じ状態が続いている。原因（面倒さ、
ChatGPT接続が切れる不安、単に忘れていた等）を一度Ownerに確認し、
checklistの改善に反映したい。

**次Versionで最も価値が高い改善**：ARC-PM-001の完全クローズ
（Owner自身によるchecklist実行）と、それに続くARC-PM-005
（build失敗）の解消——「buildが通らない」状態のままVersion数を
重ねることは、Version30のような小規模Versionでも累積するリスクになる。

## 14. 10年後のProject ARCへの貢献

Version30が10年後に効いてくるとすれば、それは新しいコードではなく
「ADR・Report・PM Statusは、実施内容が食い違ったときに訂正できる
仕組みを持つ」という運用パターンを確立したことだと考える。個人開発
であっても、AIエージェント（Claude Code・Codex・ARC）が複数関与する
プロジェクトでは、どこかの時点で「〜した」という記録と実態が
乖離することは避けられない。重要なのは乖離をゼロにすることではなく、
乖離を検出し、訂正し、その訂正自体を記録に残せる文書構造を持つこと
である。今回確立した「ADR本文は保存し、末尾に訂正を追記する」という
最小限のパターンは、機能追加ではなく構造的な一貫性の観点で、
Version100を超えて記録が積み重なっていくProject ARCにとって、
機能そのものより長く効き続ける可能性がある。
