# Version40 ARC Brief

## Theme

低リスク記録の直接保存API化・StudySessionツール優先追加・保存信頼性
保証・接続安定性・Claude Codeへの確実な指示経路

## 受領経路についての注記

この指示は、本来`agent_message_list`（AgentMessage、
id `ba6548bc-c550-43a6-b5a1-7ab4dd4c9889`、direction: ToClaudeCode、
優先度Critical）としてProject ARC本番へ直接保存されたものである。
しかし、このClaude Codeセッション（クラウドサンドボックス）の
`.mcp.json`は本番とは別のデータストア（ローカルcheckout内の空の
stdio MCPプロセス）を見ているため、`agent_message_list`を呼んでも
`fetch failed`となり本文を直接取得できなかった。そのため、Owner
（加納央都）がChatGPT側の画面から本文を直接コピーし、このチャットへ
貼り付ける形で伝達された。この経路の脆弱性自体が、指示内容の項目6
「Claude Codeへの確実な指示経路」が問題視している事象そのものである。

## Goal（原文、Owner伝達、2026-07-20）

【最優先・即時実装】
Owner承認済み方針です。低リスク記録については、日常利用の操作負担と
保存失敗を減らすため、Proposalを経由しない直接保存APIへの変更を
検討・実装してください。

ただし、現在はVersion39完了済みであり、先に送信されたAgentMessageの
relatedVersion「Version29」は古い参照です。Version39の現行コード、
Constitution、ai-roles.md、ADR 0031を基準に、既存の設計保証との
整合性を確認してください。

これは「AIがOwnerの承認を勝手に代行する」という要求ではありません。
Ownerである加納央都が、このメッセージにより、下記の低リスクな記録
操作について、今後の個別確認を不要とする運用方針を明示しています。

### 1. Proposal不要の直接保存ツール

次の低リスク記録について、直接保存APIを追加してください。

- meal_log_create
- nutrition_log_create
- weight_log_create
- reflection_create
- check_in_create
- distraction_signal_create
- challenge_log_create
- appearance_create
- management_feedback_create

これらは、Ownerが日常的な生活管理のために入力する記録であり、個別の
Proposal作成・再送・承認を要求しない設計とします。ただし、既存の
ConstitutionやADRとの関係で直接保存が許されない場合は、Ownerによる
包括的かつ撤回可能なAgentDelegationGrantを一度設定し、その範囲内では
自動保存される設計でも構いません。重要なのは、日常記録ごとにOwnerへ
承認操作を要求しないことです。

### 2. 学習管理ツールの最優先追加

次のツールを追加してください。

- study_session_create
- study_session_update
- study_session_finish
- study_session_list
- study_summary_by_date
- study_summary_by_period

学習管理はProject ARCの主要用途です。StudySessionの実データが存在
する場合、Timelineが0件であることを理由に「学習時間0分」と判定して
はいけません。日次集計および期間集計は、StudySessionを正本として
計算してください。

### 3. Proposalまたは個別確認を維持する対象

次の操作については、直接保存や無条件の自動承認に変更せず、従来
どおりOwnerの明示確認を維持してください。

- FinanceLogその他の収入・支出・資産・課金・契約に関する操作
- AgentDelegationGrantの新規作成、権限拡張、停止、取消し
- InterventionPolicySettingsなど、システム全体の挙動を変える設定
- Constitution、Principles、ai-roles.mdなどの根幹変更
- 認証方式、APIキー、秘密情報に関する変更
- 外部公開範囲の拡大
- 個人情報の外部送信
- 削除、初期化その他の破壊的・不可逆な操作
- 重要な長期MemoryおよびExternalKnowledgeへの保存

権限区分が不明な操作は、安全側に倒してProposal対象としてください。

### 4. 保存信頼性の保証

すべてのcreate、update、finish系処理について、次の保存保証を実装
してください。

1. Repositoryへ保存する。
2. 保存されたレコードIDを返す。
3. 同一処理内または直後にread-after-write検証を行う。
4. 保存内容が一致した場合に限り、`saved: true`および`verified:
   true`を返す。
5. 保存または検証に失敗した場合は、成功扱いにしない。
6. 失敗時は、エラー内容と再試行可能な`retryQueueId`を返す。
7. 冪等キーを受け付け、通信失敗後の再試行による重複保存を防止する。

ChatGPT側には、状態を次のように厳密に区別できる情報を返してください。

- 提案を作っただけ
- 承認された
- Repositoryへ保存された
- 再読込により保存確認された
- 保存または検証に失敗した

「保存確認済み」でないものを「保存した」と表現させないでください。

### 5. 接続およびチャット間の安定性

別チャット、新規セッション、MCP再接続後でも、Project ARCの公開
ツールが安定して利用できるよう修正してください。特に次を確認して
ください。

- MCPのツール登録漏れ
- 古い長寿命MCPプロセスが残る問題
- projectVersion、buildCommit、toolCountの不一致
- 本番Project ARCとローカルcheckoutが異なるデータストアを見る問題
- AgentMessageが本番側にだけ存在し、Claude Code側で参照できない問題
- `fetch failed`時に、成功したように扱われる問題

`capability_registry_get`には、可能であれば次を含めてください。

- 現在のprojectVersion
- buildCommit
- toolCount
- 公開ツール一覧
- 実行環境またはデータストア識別情報
- 期待される構成との差分警告
- stale processの疑い

### 6. Claude Codeへの確実な指示経路

本番Project ARCのAgentMessageとClaude Codeサンドボックスが異なる
データストアを参照しているため、AgentMessageだけを唯一の指示経路に
しないでください。`docs/handoff/ARC_INBOX.md`など、Gitで同期される
正式なhandoff経路を整備してください。少なくとも次を実現してください。

- 本番AgentMessageをGit管理のInboxへミラーする仕組み
- メッセージID、作成日時、Owner承認状態の記録
- Claude Codeが処理を開始した日時と状態
- 完了報告を本番ARCへ戻す経路
- 同一指示の重複実行防止

### 7. 回帰テスト

次をテストしてください。

- 各直接保存APIのcreateからread-after-write確認まで
- 保存失敗時に成功扱いしないこと
- 再試行キュー
- 冪等性
- 重複保存防止
- StudySessionの開始、更新、終了
- 日次集計
- 期間集計
- Timelineが空でもStudySessionを正しく集計すること
- 別チャットでのツール可視性
- 新規セッションでのツール可視性
- MCP再接続後のツール可視性
- 古いMCPプロセスの検知
- 本番とローカルでデータストアが異なる場合の明示
- AgentMessageからGit Inboxへのhandoff

### 8. ADR 0031およびConstitutionとの整合性

ADR 0031の「Ownerの再送が承認の証」という設計保証を、無断で削除
または迂回しないでください。今回のOwner指示をどのように法的・
設計的に位置づけるかを整理してください。候補は次のいずれかです。

- 低リスク記録に限り、Ownerが包括的な事前承認を与えたと整理する。
- 撤回可能なAgentDelegationGrantを設定する。
- Proposal制度の対象外となる「単純な本人記録」カテゴリを新設する。
- ADR 0031へ、Ownerの包括的事前承認に関する限定的な例外を追加する。

ConstitutionやPrinciplesの変更が必要な場合は、勝手に変更せず、変更案、
影響範囲、代替案をOwnerへ提示してください。

### 9. 完了報告

完了時は、次を報告してください。

- projectVersion
- buildCommit
- toolCount
- 追加・変更したツール一覧
- 変更したファイル一覧
- ADRおよびConstitutionとの整合性
- 実施したテスト
- テスト結果
- 未解決事項
- デプロイ手順
- MCP再起動または再接続手順
- 本番環境での確認方法

この作業は、他の新機能追加より優先してください。

## 対応結果

Version40として完了。既存の`AgentDelegationGrant`機構（Version24、
ADR 0051）のscopeをAppearance・ManagementFeedbackへ拡張し、
FinanceLogを明示的に除外することで、新規`*_create`ツールを追加せず
に項目1の要求を満たした（ADR 0072決定1「書き込み経路を増やさない」
方針）。StudySession対話型ライフサイクル（項目2、6ツール）、保存
信頼性契約（項目4、read-after-write・saved/verified・
retryQueueId）、`capability_registry_get`拡充（項目5）、
`scripts/mirror-agent-messages.mjs`（項目6）を実装した。項目8の
ADR 0031・Constitution整合性は、既存のConstitution第4条改定
（Version24）の枠内で完結すると判断し、新たな改定は行わなかった
——この判断根拠はADR 0072に記録した。項目9の完了報告項目は
`docs/developer-feedback/Version40_Developer_Feedback.md`に含めた。

詳細は`docs/reports/Version40_Report.md`・
`docs/developer-feedback/Version40_Developer_Feedback.md`・
ADR 0072参照。
