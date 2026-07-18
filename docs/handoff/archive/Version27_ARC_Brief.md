# Version27 指示書（原文、AgentMessage経由）

Version21完了直後（2026-07-17）に届いていたが、当時見落とされ、
Version22〜26では対応されなかった指示書。2026-07-18のセッションで
`agent_message_list`の全件確認により発見し、Owner確認の上で実装した。

## 主たる指示

- **id**: `9ea53178-587f-4287-81f7-3b3a68634d90`
- **direction**: `ToClaudeCode`
- **relatedVersion**: `Version21`（タグ上はVersion21だが、Version21
  本体の完了報告とは無関係の別件）
- **createdAt**: `2026-07-17T04:50:05.627Z`

> Project ARCに、ARC Study Timerから学習セッションを安全に受信して
> 保存するHTTPS APIを実装する。POST /api/study-sessions を追加し、
> JSON bodyとして sessionId, subject, task, startedAt, endedAt,
> durationMs, source, clientCreatedAt を受け取る。sessionIdで
> 冪等化し、重複送信時は既存レコードを返す。認証は環境変数で設定する
> Bearer tokenを用い、CORSは許可オリジンを環境変数で制限する。保存先
> は既存Repository設計に合わせ、新規StudySession entity/repository/
> use caseを追加する。入力検証、最大duration、異常な未来時刻、欠損値
> を拒否する。成功時は {ok:true, sessionId, storedAt}、重複時は
> {ok:true, duplicate:true, sessionId} を返す。GET /api/study-
> sessions/summary?from=&to= で期間集計も返せるようにする。テスト、
> README、環境変数例、curl例を追加する。既存Proposal承認経路とは別に、
> 本人が設定したtokenを持つタイマーからの定型ログのみ自動保存を許可
> し、ReflectionやMemoryなど他種別への汎用書き込みには使えないように
> する。実装後、エンドポイントURL、必要なBearer token設定方法、CORS
> 設定、テスト結果をManagementFeedbackまたはAgentMessage(ToARC)で
> 返す。

（全文は`agent_message_list`で取得したデータそのもの。詳細な実装内容
は`docs/reports/Version27_Report.md`・ADR 0054参照）

## 処理結果

Version27として実装完了。詳細は`docs/reports/Version27_Report.md`
参照。`STUDY_TIMER_API_TOKEN`の実運用設定・実タイマーアプリからの
疎通確認はOwner自身の操作待ち。curl例は`node -e fetch`ベースの検証
コマンドとして`docs/reports/Version27_ARC_Feedback.md`に記載。
