# Version23 指示書（原文、AgentMessage経由、Owner本人発信）

Version17〜22はARCが指示書を起案していたが、これはOwner本人が
Remote MCP経由で直接Project ARCへ保存した初めての指示書。Version22の
作業中（2026-07-16T00:18:52）に届いていたが、Version22完了報告
（01:34）を送るまで気づかず、次回`agent_message_list`確認で発見した
（`docs/reports/Version23_Report.md`10章に運用上の懸念として記録）。

## 主たる指示

- **id**: `f81e9141-0edb-4246-bad1-bbf06922574b`
- **direction**: `ToClaudeCode`
- **relatedVersion**: `Version22`（タグ上はVersion22だが、内容・
  タイミングから独立したVersion23として処理した）
- **createdAt**: `2026-07-16T00:18:52.837Z`
- **tags**: `owner-decision`, `auto-save`, `life-log`,
  `delegated-authority`, `version22`

> Owner決定：通常生活記録のProject ARCへの自動保存を許可します。
>
> 許可対象：
> - Owner本人がChatGPT上で明示的に入力・送信した、食事、栄養、睡眠、
>   体重、運動、勉強、授業、支出・収入、日次振り返り、挑戦行動など
>   の通常の生活記録
> - 上記の入力から機械的・低リスクに算出できる集計値または分類
> - 同一内容を対応するLife Logへ保存するために必要な通常書き込み
>
> 運用方針：
> - 対象範囲の通常生活記録については、記録ごとのOwnerによるdoを
>   不要とし、自動保存できる設計を採用してよい。
> - Ownerが明示的に送信した内容を保存対象とし、推測・補完した事実を
>   確定記録として自動保存しない。
> - 推定値を保存する場合は、推定であること、算出根拠、信頼度または
>   不確実性を記録する。
> - 重複保存を防止し、保存結果と失敗を監査可能にする。
> - Ownerが自動保存を一時停止・再開・取消しできる仕組みを設ける。
> - 自動保存後に訂正・削除を要求できるようにする。
>
> 許可対象外：
> - 外部サービスへのデータ送信または公開
> - 有料サービス、課金、契約
> - 秘密情報・認証情報の保存または変更
> - 破壊的操作、大量削除、既存データの一括変更
> - AgentMessage、ManagementFeedback、開発指示、Proposal承認の一般的な
>   自動化
> - Ownerの意思決定、評価、感情、健康状態等を推測して確定事実として
>   保存すること
> - ConstitutionまたはPrinciplesの無断変更
>
> 実装指示：
> Version22の権限委譲設計に、このOwner決定を限定scopeの委譲ユース
> ケースとして反映してください。現行Constitutionとの整合に変更が
> 必要な場合は、必要最小限の変更案と影響を提示し、変更自体は既存の
> Level2手続に従ってください。生活記録用Entity／Write UseCase／MCP
> Toolが未整備なら、既存モデルとの重複を調査し、最小縦切りの次Version
> 実装計画を提示してください。

## 対応

`docs/proposals/life-log-auto-save-delegation.md`・ADR 0050・
`docs/reports/Version23_Report.md`参照。指示書が「次Version実装計画を
提示」を明示的に求めていたため、コード実装はせず、Constitution整合性
の結論（改定不要、Owner・ARC確認待ち）・既存モデルとの重複調査・
Phase分割した実装計画の提示に留めた。
