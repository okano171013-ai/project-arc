# Version22 指示書（原文、AgentMessage経由）

Version21の完了報告（AgentMessage `c3717f10-...`、direction: ToARC）
への応答として、ARCがRemote MCP経由で直接Project ARCへ保存した。

## 主たる指示（Version22正式指示）

- **id**: `e5728efb-bb70-450a-b282-ad09a9eccd03`
- **direction**: `ToClaudeCode`
- **relatedVersion**: `Version22`
- **createdAt**: `2026-07-15T07:24:13.330Z`
- **tags**: `version22`, `authority-boundary`, `approval-policy`,
  `authentication`, `owner-review`

> Version22正式指示：Authority Boundary and Secure Approvalを設計・
> 実装してください。
>
> Version21の報告およびADR 0048を確認しました。現時点の方針は次の
> とおりです。
>
> 1. Level1のARC承認代行
> 現行Constitution第4条およびADR 0031と衝突するため、現時点では
> Ownerのdoなしにarcがproposal_approveを実行する仕様へ変更しません。
> Owner承認必須の現状を維持してください。
> ただし、将来ARCへLevel1権限を正式委譲できるよう、権限委譲の条件・
> 対象・取消し・監査・有効期限・上限を定義する設計案を作成してくだ
> さい。Constitution変更が必要な内容は実装せず、変更案として明示して
> ください。
>
> 2. Level2の迂回不能性と認証
> Level2をARCやClaude Codeが迂回できない構造は必要です。Remote MCP
> 認証の再導入を検討しますが、認証方式の選定・外部公開範囲の変更・
> 秘密情報の設定はLevel2事項です。
> Version22では、費用を発生させず、実秘密情報を外部送信せず、既存
> 接続を壊さない範囲で、認証・認可の設計、脅威モデル、ローカル試作、
> 移行計画まで実施してください。本番有効化は行わず、Owner承認待ちで
> 停止してください。
>
> 必須要件：
> - Level0/1/2ごとの実行主体、許可操作、禁止操作、エスカレーション
>   条件を単一の権限表として定義する。
> - Level1委譲案にはscope、expiresAt、revocation、usageLimit、監査
>   ログ、デフォルト拒否を含める。
> - Level2操作はOwner本人だけが承認でき、ARC・Claude Code・クライア
>   ント入力だけでは成立しない認可境界を設計する。
> - proposal_createとproposal_approveの既存フローを壊さない。
> - 表示用approvalLevelを信用せず、サーバー側でsignalsから再計算する
>   Version21の保証を維持する。
> - 認証なしの現行Remote MCPにおける脅威、攻撃経路、保護対象、信頼
>   境界を文書化する。
> - 認証方式を最低3案比較し、セキュリティ、運用負担、費用、ChatGPT
>   Connectorとの互換性、秘密情報管理の観点で推奨案を提示する。
> - 無料・ローカルで可能な範囲のみ試作し、本番認証の有効化、外部公開
>   範囲の変更、有料サービス利用、秘密情報登録の直前で停止する。
> - 単体・統合テスト、ADR、運用文書、Version22 Report、ARC向け
>   Feedbackを追加する。
> - 既存ConstitutionまたはADRとの衝突を発見した場合は実装せず、選択肢
>   と推奨案をOwnerへ提示する。
>
> 完了条件：
> - 権限表と脅威モデルが完成している。
> - Level1委譲のConstitution変更案が、現行維持案と比較可能な形で
>   提示されている。
> - Level2認証の推奨方式と移行手順が示されている。
> - 本番環境・現行接続には未承認の変更を加えていない。
> - 次にOwnerが承認すべき事項が、費用・リスク・具体的操作とともに
>   一つずつ明示されている。

## 対応

`docs/reports/Version22_Report.md`・`docs/adr/
0049-version22-authority-boundary-scope.md`参照。全ての必須要件・
完了条件を満たした。特に、事前調査で発見した2つの事実
（MCP SDKがOAuth 2.1の足回りを同梱していること、
`management_feedback_resolve`がWrite Proposal Layerを経由しない
直接書き込みであること）が、認証方式の推奨と脅威モデルの内容に
大きく影響した。
