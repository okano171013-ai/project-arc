# Version24 ARCへのフィードバック

宛先：ARC（ChatGPT）／Owner　作成者：Claude Code
目的：Version24「OAuth Production Activation and Scoped Life-Log
Delegation」の実装内容と、唯一残っているOwner自身の操作をまとめる。
（技術的な詳細は`docs/reports/Version24_Report.md`・ADR 0051参照。
この内容はAgentMessage（direction: ToARC）としてもProject ARCへ
直接保存予定です）

---

## 1. 実装した内容

- **Constitution第4条の限定改定**（`docs/constitution.md`）：
  Ownerが`AgentDelegationGrant`として発行した範囲内でのみ、ARCが
  個別`do`なしに記録を保存できる。「Ownerが最終決定する」という原則
  本体は変えていない。
- **`AgentDelegationGrant`**：状態機械（Active/Paused/Revoked、
  Revokedからのresumeはコードレベルで拒否）、`scope`/`expiresAt`/
  `usageLimit`の全条件を都度再評価する`isValidFor`。
- **自動承認フロー**：Reflection・ChallengeLogのみ対象。Level2に
  分類されるProposal、および`AgentDelegationGrant`自体は絶対に
  自動承認されない（型ベースの二重の安全装置）。
- **重複防止**：自動承認済みProposalの再approveを拒否。
- **監査ログ拡張**：`approver: 'Owner' | 'auto-save'`で承認経路を
  区別。
- **実HTTPリクエストでの実機確認**：grant作成→承認→Reflection自動
  保存→監査記録→重複拒否→取消し→自動保存停止、の9ステップ全てを
  実際のHTTPリクエストで確認済み。

テスト321件全緑（+27件）、typecheck/lintともにエラーゼロ。

## 2. 実装しなかったもの（重要）

**OAuth本番有効化そのもの**——Claude Codeの実行環境が持つ安全機構
（auto mode classifier）により、本番`.env`への秘密情報書き込み・
本番サービス再起動の実行がブロックされました。Owner本人が明示的に
指示した内容であっても、セッション内での間接的な承認だけではこの
種の変更を実行できない設計になっているようです。具体的な設定内容
（2行の`.env`追記）とPasscodeは、Ownerへチャット上で直接お伝え済み
です（このドキュメント・Report・ADRのいずれにも含めていません）。

## 3. 次にOwnerが行う唯一の操作

1. `.env`に`MCP_OAUTH_ENABLED=true`と`MCP_OAUTH_OWNER_PASSCODE`
   （チャットでお伝えした値）を追記する。
2. `scripts\stop-all.ps1`→`scripts\start-all.ps1`でサービスを再起動
   する。
3. ChatGPT Developer ModeでConnectorを「OAuth」認証で再作成する
   （接続先URLは既存のトンネルURLのまま、`/mcp`）——リダイレクトされる
   Passcode入力画面で、手順1と同じ値を入力する。

- **費用**：¥0
- **リスク**：既存の「認証なし」Connectorとは別設定になるため、
  切り替え中は一時的に接続できない時間帯が生じます。ロールバックは
  `.env`から2行削除して再起動するだけです（`docs/setup/
  remote-mcp-oauth-migration.md`参照）。

完了後、次のセッションでOwnerからお知らせいただければ、実際の
Remote MCP経由での接続確認を行います。

## 4. Owner・ARCへの共有事項（Version23からの継続）

`docs/proposals/level1-arc-approval-delegation.md`（一般的なProposal
承認代行）は、今回のVersion24でも引き続き未決定・未実装のままです
——今回実装したのは、Owner決定に基づく生活記録限定の委譲のみです。
