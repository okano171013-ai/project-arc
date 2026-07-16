# Version24 指示書（原文、AgentMessage経由、Owner本人発信）

Version23完了報告への応答としてOwner本人が発信した正式実装指示。
Version22 Feedbackの3つの承認事項を全て承認した上での実装指示。

## 主たる指示

- **id**: `1e02902f-a211-40e2-b84f-add7c1585a45`
- **direction**: `ToClaudeCode`
- **relatedVersion**: `Version23`（タグ上はVersion23だが、内容から
  独立したVersion24として処理した——コミット`73c493a`/`092aef7`で
  Version23の番号は既に設計ドキュメントに使用済みのため）
- **createdAt**: `2026-07-16T01:51:39.760Z`
- **tags**: `version23`, `owner-approved`, `oauth`, `delegation`,
  `life-log`, `security`

> Version23正式指示：OAuth Production Activation and Scoped Life-Log
> Delegationを実施してください。
>
> Ownerは、Version22のFeedbackを確認し、以下3点を承認しました。
>
> 1. MCP OAuth 2.1の本番有効化
> - Version22で試作・検証した自前OAuth 2.1（MCP SDKのmcpAuthRouter、
>   Dynamic Client Registration、PKCE、Owner Passcodeゲート）を本番
>   Remote MCPで有効化する。
> - 費用は¥0の構成を維持する。
> - MCP_OAUTH_ENABLEDを本番で有効化し、無認証アクセスを拒否する。
> - management_feedback_resolveを含む全書き込み経路が認証境界の内側に
>   あることを確認する。
> - Owner Passcode、token、client情報などの秘密情報をログ・
>   Repository・AgentMessage・Report本文へ平文で記録しない。
> - 既存Connectorが切断される場合、安全に復旧できる手順とロール
>   バック手順を先に用意する。
> - ChatGPT Connector再作成にOwner自身の画面操作が必要になった時点で、
>   具体的な一手だけを示して停止する。
>
> 2. 生活記録に限定したLevel1権限委譲
> - Version22のAgentDelegationGrant案を基礎として、Ownerが明示的に
>   入力した通常生活記録の自動保存だけをARCへ委譲できるよう実装する。
> - 対象：食事、栄養、睡眠、体重、運動、勉強、授業、支出・収入、
>   日次振り返り、挑戦行動。
> - 対象外：AgentMessage、ManagementFeedback、開発指示、一般Proposal
>   承認、外部公開、課金、認証・秘密情報、破壊的操作、大量変更、
>   推測によるセンシティブ情報の確定保存。
> - scope、expiresAt、revocation、usageLimit、監査ログ、default deny
>   を必須とする。
> - Ownerが一時停止・再開・取消しできること。
> - 重複防止、訂正、削除要求、保存失敗の可視化を設けること。
> - Owner入力と推定値を区別し、推定値には根拠と不確実性を付すこと。
>
> 3. Constitution第4条の限定改定
> - Level1委譲を一般解禁せず、Ownerが明示的に発行した有効な
>   AgentDelegationGrantのscope内に限って、ARCが個別doなしで通常
>   生活記録を保存できる最小限の改定とする。
> - Level2事項は引き続きOwner本人だけが承認できる。
> - Claude CodeまたはARCが自らGrantを作成・拡張・更新・復活させる
>   ことを禁止する。
> - 改定前後の差分、法的・技術的効果、取消し方法をADRとReportに記録
>   する。
>
> 4. Cloudflare Access
> - 今回は導入しない。OAuth有効化後の残余リスクを評価し、将来候補
>   として記録するだけに留める。
>
> 実施順序：A. 現行状態のバックアップ可能性とロールバック手順を確認
> B. Constitution限定改定とAgentDelegationGrant実装 C. 生活記録の
> 最小縦切り自動保存を実装 D. OAuthを有効化して認証・認可・回帰
> テスト E. ローカルおよびRemote MCPで実機確認 F. Connector再作成が
> 必要なOwner操作の直前で停止して報告
>
> 安全条件：有料サービスを開始しない。外部公開範囲をOAuth導入前より
> 拡大しない。秘密情報を平文保存・出力しない。Owner操作なしにChatGPT
> 側Connectorを削除・変更しない。失敗時は認証を無効化して放置せず、
> 安全側へ停止し、復旧手順を提示する。既存データを削除・一括変更
> しない。
>
> 完了条件：認証なしのRemote MCPアクセスが拒否される。正規OAuth
> クライアントから既存Read/Write Toolが利用できる。有効な限定Grantの
> 範囲内で通常生活記録が個別doなしに保存され、範囲外操作は拒否される。
> 監査ログ、取消し、重複防止、訂正経路がテストされる。全テスト成功、
> ADR、運用文書、Version23 Report、ARC向けFeedbackが完成する。Owner
> に必要な次の画面操作が一つずつ明示される。

## 対応

`docs/reports/Version24_Report.md`・ADR 0051参照。B・C・E（コードでの
実装・単体テスト・実HTTPリクエストでの実機確認）は完了。Dの
「本番有効化」自体は、Claude Codeの実行環境が持つ安全機構により、
production `.env`への秘密情報書き込み・本番サービス再起動という
実際の操作をClaude Codeが単独で実行することがブロックされた
——Owner本人が明示的に指示した操作であっても、この種の変更は
セッション内での間接的な承認（AgentMessage経由）だけでは実行されず、
Owner自身の直接操作が必要という、指示書自身の安全条件（Fの「Owner
操作の直前で停止」）がより早い段階（.envの編集そのもの）まで
前倒しされる形になった。具体的な2行の設定内容とPasscodeはOwnerへ
チャット上で直接伝達済み——本ドキュメント・Report・ADRのいずれにも
含めていない。
