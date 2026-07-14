# ADR 0046: Collaboration Runner v1のスコープを機械的な検知・通知のみに限定する

## ステータス

承認済み（Owner確認済み、AskUserQuestionによる選択・Plan Mode承認）

## 関連Principle

- Principle 9（段階的拡張／YAGNI）
- `docs/constitution.md`第2条（Systemは、判断しない）
- ADR 0045（Version19のスコープをガバナンス境界に沿って絞り込む）

## コンテキスト

Version19完了後、ARCから「Collaboration Runnerと常駐運用基盤を最優先で
実装してください」という指示（AgentMessage `33274dc6-...`）が届いた。
目的は、PCを起動したまま放置しても、Project ARC上の未読AgentMessage・
ManagementFeedback・承認済みTaskを監視し、**承認不要の範囲で
Claude Codeによる開発・テスト・ADR・Report更新・Feedback返却を
進める**こと。承認が必要な事項（有料サービス・外部公開拡大・
認証変更・破壊的変更・個人情報の外部送信・Constitution変更）は
必ず停止してOwnerに確認する、という制約も明記されていた。

この指示を字義通り実装するには、Runnerが無人のまま未読内容を
「解釈」し、実装方針を考え、テスト・commitまで進める必要がある。
これはADR 0045で確立した境界（Systemは判断しない、解釈はARC/
Claude Codeが人間の関与とともに行う）と衝突する可能性が高い。

着手前にOwnerへ確認したところ（AskUserQuestion）、「Runnerはどこまで
自律的に進めてよいか」という問いに対し、**「監視・下書き作成まで
（実際のコード変更・commit・Proposal承認は、Ownerが実際にセッションを
開いて「do」で承認するまで実行しない）」**という回答を得た。

## 決定

Collaboration Runner v1のスコープを、以下の**機械的な検知・通知のみ**
に限定する。

1. `agent_message_list`（`direction: "ToClaudeCode"`）・
   `management_feedback_list`（`resolution: "Open"`）を定期的に取得
2. ローカルの状態ファイル（`data/runner-state.json`）に記録した
   前回実行時の最終確認時刻と比較し、新着を検出
3. 新着があれば、id・target・content冒頭を機械的に列挙した通知
   ファイル（`data/runner-notifications/<ISO時刻>.md`）を書き出す
   ——**内容の解釈・実装方針の提案は一切書かない**
4. 実際のコード変更・commit・Proposal作成/承認・ManagementFeedbackの
   resolution遷移は一切行わない

「開発・テスト・ADR・Report更新・Feedback返却を進める」という指示書の
文言が示すAI推論を伴う自律実行（下書きとなる実装方針の起草を含む）は、
v1では意図的に対象外とする。

## 根拠

- 無人稼働中にAIが内容を解釈し実装方針を決めることは、たとえ
  「commitはしない」としても、Constitution第2条・ai-roles.mdが定める
  「解釈・重要度判定はSystemの責務外」という境界に近づきすぎる。
  機械的な検知・通知（誰が読んでも同じ結果になる、解釈の余地がない
  処理）に留めることで、この境界を明確に維持できる。
- Owner自身が「監視・下書き作成まで」と回答した際の「下書き作成」を、
  無人稼働でのAI推論の実行コスト・安全性検証が済んでいない現時点では
  「新着の通知」に相当するものと保守的に解釈した——実際にAIによる
  下書き（実装方針のドラフト等）を無人で生成する機能は、コスト管理・
  暴走防止・誤った提案が人間の確認なく蓄積するリスクへの対策が別途
  必要であり、次段階の課題として申し送る（`docs/reports/
  Version20_Report.md`参照）。
- Principle 9（YAGNI）：実際に機械的な検知だけでどの程度Owner・ARCの
  「気づき」の助けになるかを運用してみてから、次の段階（AI推論を
  伴う下書き生成）へ進むかを判断する方が、段階的拡張の原則に沿う。

## 影響

- `pnpm run runner`は、新着があってもコードを一切変更しない
  ——Owner・ARCが次回セッションで`data/runner-notifications/`
  または`agent_message_list`/`management_feedback_list`を確認して、
  人間の関与のもとで対応することが前提。
- 将来、AI推論を伴う下書き生成（例：`claude`CLIの無人呼び出し）を
  追加する場合は、実行回数上限・費用上限・タイムアウト・無限ループ
  検出等の安全策（ARCの100項目長期バックログ「D. Runner・自動実行」
  で挙げられていた項目）を合わせて設計し、Owner確認を経て別ADRとして
  記録すること。
