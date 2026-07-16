# Version22 ARCへのフィードバック

宛先：ARC（ChatGPT）　作成者：Claude Code
目的：Version22「Authority Boundary and Secure Approval」の実装内容と、
次にOwnerが判断すべき事項をまとめる。（技術的な詳細は`docs/reports/
Version22_Report.md`参照。この内容はAgentMessage（direction: ToARC）
としてもProject ARCへ直接保存予定です）

---

## 1. 指示書をどう解釈したか

必須要件・完了条件を字義通り満たすことを目指しました。着手前の調査で
2つの重要な事実が判明し、それぞれ実装内容に反映しています。

1. `@modelcontextprotocol/sdk`（Project ARCが既に依存している
   バージョン）は、OAuth 2.1 Authorization Serverの足回り
   （Dynamic Client Registration・PKCE検証・`.well-known`メタデータ・
   `requireBearerAuth`ミドルウェア）を同梱していました。ADR 0041が
   「フルOAuth 2.1は実装コストが高すぎる」とした判断は、この事実を
   踏まえると見直す余地があります。
2. `management_feedback_resolve`（MCP Tool）はWrite Proposal Layerを
   経由しない直接書き込みでした。現状の無認証Remote MCPでは、
   トンネル公開URLを知る誰でも、Ownerの`do`を一切経由せず
   ManagementFeedbackのresolutionを書き換えられます——ADR 0044の
   「Write系操作はProposal経由なのでリスクは限定的」という従来の
   主張への具体的な反例です。

## 2. 今回実装した内容

- `docs/authority-table.md`（Level0/1/2の単一権限表）
- `docs/security/remote-mcp-threat-model.md`（脅威モデル、上記の
  `management_feedback_resolve`の発見を含む）
- 認証方式3案（Bearer静的トークン／自前OAuth 2.1／Cloudflare Access）の
  比較・推奨（ADR 0049）——自前OAuth 2.1を推奨
- `LocalOAuthProvider`（`src/infrastructure/security/oauth/`）——
  Dynamic Client Registration・PKCE・OwnerのみのPasscodeゲート・
  短命token/refresh tokenのローカル無料試作。`MCP_OAUTH_ENABLED`
  （既定false）で`remoteServer.ts`に配線
- 実HTTPリクエストでのe2eテスト（DCR→passcode認可→token交換→
  bearer保護アクセスの一連）
- `docs/proposals/level1-arc-approval-delegation.md`（Level1委譲の
  設計案、Constitution第4条改定文言案を含む——**未実装**）

## 3. 実装しなかったもの（重要）

指示書自身が「本番有効化は行わず、Owner承認待ちで停止」と明記して
いた通り、以下は実装していません。

1. `MCP_OAUTH_ENABLED`の本番有効化（実際のngrok/Cloudflareトンネル・
   `.env`は無変更）
2. Level1委譲（`AgentDelegationGrant`）そのものの実装
3. `LocalOAuthProvider`の永続化（現状インメモリのみ）

## 4. 次にOwnerが承認すべき事項（費用・リスク・具体的操作）

### ① `MCP_OAUTH_ENABLED`の本番有効化

- **費用**：¥0（`express`は無料OSS、追加契約不要）
- **リスク**：ChatGPT Connector側の再設定が必要になり、既存の
  「認証なし」接続とは別のConnectorとして再作成することになる
  （移行中は一時的に接続できない時間帯が生じる）。Passcodeの管理
  責任がOwnerに生じる（総当たり対策はSDK標準のレート制限のみ）。
- **具体的操作**：`docs/setup/remote-mcp-oauth-migration.md`の手順
  1〜7（Passcode決定→`.env`追記→サービス再起動→動作確認→ChatGPT側
  Connector再作成→Passcode入力→接続確認）。ロールバックは
  `.env`から1行削除して再起動するだけ。

### ② Level1委譲（ARCへのProposal承認代行）Constitution第4条改定案の採否

- **費用**：¥0
- **リスク**：`docs/proposals/level1-arc-approval-delegation.md`
  4章参照——`scope`/`usageLimit`/`expiresAt`の設計を誤ると、意図
  しない範囲までARCの自動承認が及ぶ可能性がある。Constitution本文の
  変更を伴うため、Owner・ARC双方の合意が必要。
- **具体的操作**：上記ドキュメントを読み、(a) 現行維持を継続するか、
  (b) 改定案を承認しClaude Codeへ実装指示を出すか、(c) 改定案を
  修正して再提示を求めるか、のいずれかを選ぶ。

### ③ Cloudflare Access多層防御の追加検討（任意、優先度低）

- **費用**：無料枠内（50ユーザーまで）だがCloudflareアカウント・
  ドメイン取得が必要（Claude Codeは契約代行不可）
- **リスク**：ChatGPTのConnector接続フローとCloudflare Accessの
  ログイン壁が実際に噛み合うかは未検証（ADR 0049の比較表で「要確認」
  と明記）
- **具体的操作**：①②の判断・運用実績が出てから、必要性を再評価する
  ことを推奨（Principle 9のYAGNI）。今回は比較のみで導入していない。

いずれも急ぎではありませんが、①は脅威モデルで発見したギャップ
（`management_feedback_resolve`の無認証直接書き込み）を閉じる唯一の
手段のため、優先度は相対的に高いと考えます。
