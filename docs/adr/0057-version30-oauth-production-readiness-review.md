# ADR 0057: Version30「OAuth本番移行準備」のスコープと決定

## ステータス

承認済み（Owner本人発信の指示、2026-07-19）

## 関連Principle

- Constitution第2条（Systemは、判断しない）・第4条（Ownerが、最終決定する）
- Principle 8（長期保守性）・Principle 9（段階的拡張／YAGNI）
- ADR 0044（Remote MCP認証撤回）・ADR 0049（Version22認証方式比較）・
  ADR 0051（Version24 OAuth本番有効化、本ADRが記録誤りを訂正）

## コンテキスト

PM Review（2026-07-19、`docs/reviews/Project_ARC_PM_Review_2026-07-19.md`）
がARC-PM-001（公開Remote MCPが無認証）をP0として指摘した。調査の
結果、OAuth 2.1認証の設計・実装・テスト（Version22、ADR 0049）は
既に存在し、ADR 0051は「Version24で本番有効化した」と記録していたが、
Version25〜29のReportは一貫して「未完了」としており、記録が実態と
食い違っていることが判明した（詳細：ADR 0051「訂正」節）。

Owner本人から、Version30は新規のOAuth実装ではなく、既存実装の
「本番移行準備・記録整合・安全性確認」に限定する指示があった。
`.env`変更・Passcode設定・プロセス再起動・公開Connector再設定は
今回実施しない——文書・review・testを先に完了し、本番反映直前に
Owner確認事項を1回にまとめて提示する方針とした。

## 決定

### スコープに含めるもの

1. `LocalOAuthProvider`・`remoteServer.ts`の配線・既存テストの
   最終security review
2. **発見した欠落の是正**：`/authorize/confirm`（Passcode検証、SDK
   非経由の自前ルート）にレート制限がなかったため、固定窓レート
   制限（`src/infrastructure/security/rateLimiter.ts`、15分あたり
   10回）を追加し、否定テストを追加した
3. ADR 0051の記録齟齬の訂正（ADR本文は書き換えず、末尾に訂正節を追記）
4. `docs/project-management/STATUS.md`のARC-PM-001を実態
   （実装済み・本番反映待ち）に更新
5. token失効・rollback・接続不能時の復旧手順の確認（既存記載を検証し、
   `docs/security/remote-mcp-threat-model.md`6章にまとめて記録）
6. Ownerが一度で実行できるactivation checklist
   （`docs/setup/remote-mcp-oauth-migration.md`を全面改訂）
7. Codex/Claude Code間の同一ブランチ書き込み衝突を避ける運用
   （`docs/project-management/CODEX_RECOVERY_PLAN.md`新設）

### スコープに含めないもの（Owner承認前は実施しない）

- 本番`.env`への`MCP_OAUTH_ENABLED=true`・`MCP_OAUTH_OWNER_PASSCODE`
  の反映
- 稼働中プロセスの再起動
- ChatGPT Developer Mode側Connectorの認証方式変更
- ARC-PM-002（データ耐久性）・ARC-PM-005（build再現性）等、
  Stability Gateの他項目——Version30はARC-PM-001とARC-PM-003
  （Ownerがローカル側で対応済み）のみを対象とする

## 根拠

- 既に健全な設計・実装（Version22）が存在するにもかかわらず、
  新規実装を始めることはPrinciple 9（YAGNI）に反する。実態調査で
  見つかった本当のギャップ（本番`.env`への反映という運用作業、
  および`/authorize/confirm`のレート制限という具体的な実装漏れ）
  にのみ対応した。
- 本番反映（`.env`変更・再起動・外部接続変更）はConstitution第4条・
  DEVELOPMENT_RULES.mdの「費用、秘密情報、本番、外部公開...は
  Owner承認」という境界に該当するため、Claude Codeは実施しない。
  Owner自身が安全な状態（checklist・rollback手順が揃った状態）で
  実行できるようにすることが、このVersionのゴールである。
- ADR 0051の記録齟齬は、ADR本文を書き換えるのではなく末尾に訂正を
  追記する形にした——ADRを履歴的記録として保存する既存の運用
  （`docs/governance/DEVELOPMENT_RULES.md`「ADR必須条件」のStatus
  モデル）を維持するため。

## 影響

- 新規ファイル：`src/infrastructure/security/rateLimiter.ts`、
  `docs/project-management/CODEX_RECOVERY_PLAN.md`
- 変更：`src/infrastructure/mcp/remoteServer.ts`（レート制限の配線）、
  `src/infrastructure/mcp/remoteServer.oauth.test.ts`（否定テスト追加）
- 文書更新：ADR 0051（訂正節）、`docs/security/
  remote-mcp-threat-model.md`（6章追加）、`docs/project-management/
  STATUS.md`（ARC-PM-001・003更新）、`docs/setup/
  remote-mcp-oauth-migration.md`（全面改訂）、`docs/setup/
  chatgpt-mcp-connection.md`（Version30追記）
- ARC-PM-001は「Owner Actionのみ残存」に状態が変わったが、
  **クローズはしていない**——本番`.env`への反映が完了して初めて
  クローズする。
